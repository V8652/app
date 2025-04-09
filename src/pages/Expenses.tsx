
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GmailAuthView from '@/components/GmailAuthView';
import { Expense, Income } from '@/types';
import { toast } from '@/hooks/use-toast';
import TransactionListView from '@/components/TransactionListView';
import { getExpenses, getIncomes } from '@/lib/db';
import ExpenseEditForm from '@/components/ExpenseEditForm';
import RecentGmailTransactions from '@/components/RecentGmailTransactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, AlertCircle, Info, Search, FileText, ScanLine, Shield, Layers } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TableScrollArea } from '@/components/ui/table';
import { motion, AnimatePresence } from 'framer-motion';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const Expenses = () => {
  const [activeTab, setActiveTab] = useState('gmail');
  const [refreshKey, setRefreshKey] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [showConnectionError, setShowConnectionError] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadTransactions = async () => {
      setIsLoading(true);
      try {
        const [loadedExpenses, loadedIncomes] = await Promise.all([
          getExpenses(),
          getIncomes()
        ]);
        setExpenses(loadedExpenses);
        setIncomes(loadedIncomes);
        
        setShowConnectionError(false);
      } catch (error) {
        console.error('Error loading transactions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load transactions',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTransactions();
  }, [refreshKey]);
  
  const handleScanComplete = (newExpenses: Expense[]) => {
    setScanError(null);
    if (newExpenses.length > 0) {
      setRefreshKey(prev => prev + 1);
      
      toast({
        title: 'Scan Complete',
        description: `Found ${newExpenses.length} new expenses.`,
      });
    }
  };
  
  const handleScanError = (errorMessage: string) => {
    setScanError(errorMessage);
  };
  
  const handleTransactionChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsEditExpenseOpen(true);
  };

  const handleExpenseEditSave = () => {
    setRefreshKey(prev => prev + 1);
    setIsEditExpenseOpen(false);
    setSelectedExpense(null);
  };

  // Animation variants for staggered children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <Layout>
      <motion.div 
        className="space-y-6 max-w-6xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants} className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Expenses & Income
          </h1>
        </motion.div>
        
        {showConnectionError && (
          <motion.div variants={itemVariants}>
            <Alert variant="destructive" className="mb-4 rounded-xl border-0 shadow-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>
                Unable to connect to the server. Please check your internet connection.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
        
        <motion.div variants={itemVariants}>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full overflow-x-auto flex-wrap bg-muted/60 p-1 rounded-xl">
              <TabsTrigger 
                value="gmail" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <Mail className="h-4 w-4 mr-2" />
                Import from Gmail
              </TabsTrigger>
              <TabsTrigger 
                value="transactions"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <FileText className="h-4 w-4 mr-2" />
                All Transactions
              </TabsTrigger>
            </TabsList>
            
            <AnimatePresence mode="wait">
              <TabsContent 
                value="gmail" 
                className="space-y-4 animate-fade-in mt-4"
                key="gmail-tab"
              >
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="order-2 md:order-1">
                    <CollapsibleCard 
                      title="Scan Results" 
                      description="Found expenses will appear here"
                      icon={<Search className="h-5 w-5" />}
                      className="h-full"
                    >
                      {scanError && (
                        <Alert variant="default" className="mb-4 rounded-lg">
                          <Info className="h-4 w-4" />
                          <AlertTitle>Search Issue</AlertTitle>
                          <AlertDescription>
                            {scanError}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {isLoading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((index) => (
                            <Skeleton key={index} className="h-24 rounded-lg" />
                          ))}
                        </div>
                      ) : expenses.length === 0 ? (
                        <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed border-2 rounded-xl">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <ScanLine className="h-8 w-8 text-primary" />
                          </div>
                          <h3 className="text-lg font-medium">No expenses yet</h3>
                          <p className="text-muted-foreground mt-1">
                            Connect your Gmail account and scan for expenses to get started.
                          </p>
                          <Button className="mt-4" variant="outline">
                            <Mail className="h-4 w-4 mr-2" />
                            Connect Gmail
                          </Button>
                        </Card>
                      ) : (
                        <RecentGmailTransactions 
                          expenses={expenses}
                          onTransactionClick={handleExpenseClick}
                        />
                      )}
                    </CollapsibleCard>
                  </div>
                  
                  <div className="order-1 md:order-2">
                    <GmailAuthView 
                      onScanComplete={handleScanComplete}
                      onScanError={handleScanError} 
                    />
                  </div>
                </motion.div>
              </TabsContent>
              
              <TabsContent 
                value="transactions" 
                className="animate-fade-in mt-4"
                key="transactions-tab"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <CollapsibleCard 
                    title="Transaction History" 
                    description="View and manage all your transactions"
                    icon={<Layers className="h-5 w-5" />}
                  >
                    <div>
                      {isLoading ? (
                        <div className="flex items-center justify-center p-12">
                          <Skeleton className="h-20 w-full max-w-lg rounded-lg" />
                        </div>
                      ) : (
                        <Card className="border-0 shadow-none bg-transparent overflow-hidden">
                          <CardContent className="p-0">
                            <TableScrollArea>
                              <TransactionListView 
                                key={`list-${refreshKey}`} 
                                onTransactionDelete={handleTransactionChange}
                                onTransactionClick={handleExpenseClick}
                              />
                            </TableScrollArea>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </CollapsibleCard>
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </motion.div>

      {selectedExpense && (
        <ExpenseEditForm
          expense={selectedExpense}
          isOpen={isEditExpenseOpen}
          onClose={() => setIsEditExpenseOpen(false)}
          onSave={handleExpenseEditSave}
        />
      )}
    </Layout>
  );
};

export default Expenses;
