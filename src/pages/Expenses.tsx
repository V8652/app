import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Expense, Income } from '@/types';
import { toast } from '@/hooks/use-toast';
import TransactionListView from '@/components/TransactionListView';
import { getExpenses, getIncomes } from '@/lib/db';
import ExpenseEditForm from '@/components/ExpenseEditForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Info, Search, ScanLine, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TableScrollArea } from '@/components/ui/table';
import { motion, AnimatePresence } from 'framer-motion';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile, isNativeApp } from '@/hooks/use-mobile';
import { LogoutButton } from '@/components/LogoutButton';
import SmsScanView from '@/components/SmsScanView';
const Expenses = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const isNative = isNativeApp();
  useEffect(() => {
    const loadTransactions = async () => {
      setIsLoading(true);
      try {
        const [loadedExpenses, loadedIncomes] = await Promise.all([getExpenses(), getIncomes()]);
        setExpenses(loadedExpenses);
        setIncomes(loadedIncomes);
      } catch (error) {
        console.error('Error loading transactions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load transactions',
          variant: 'destructive'
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
        description: `Found ${newExpenses.length} new expenses.`
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
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0
    }
  };
  return <Layout>
      <div className="space-y-6 max-w-6xl mx-auto p-0">
        <motion.div className="space-y-4" initial="hidden" animate="visible" variants={containerVariants}>
          <motion.div variants={itemVariants} className="space-y-4">
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} exit={{
            opacity: 0
          }} transition={{
            duration: 0.3
          }}>
              <div className="order-2 md:order-1">
                <CollapsibleCard title="Scan Results" description="Found expenses will appear here" icon={<Search className="h-5 w-5" />} className="h-full">
                  {scanError && <Alert variant="default" className="mb-4 rounded-lg">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Search Issue</AlertTitle>
                      <AlertDescription>
                        {scanError}
                      </AlertDescription>
                    </Alert>}
                  
                  {isLoading ? <div className="space-y-4">
                      {[1, 2, 3].map(index => <Skeleton key={index} className="h-24 rounded-lg" />)}
                    </div> : expenses.length === 0 ? <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed border-2 rounded-xl">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <ScanLine className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium">No expenses yet</h3>
                      <p className="text-muted-foreground mt-1">
                        Scan your SMS messages for expenses to get started.
                      </p>
                      <Button className="mt-4" variant="outline">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Scan SMS
                      </Button>
                    </Card> : <div className="transaction-list">
                      <TransactionListView transactions={expenses} onTransactionClick={handleExpenseClick} />
                    </div>}
                </CollapsibleCard>
              </div>
              
              <div className="order-1 md:order-2">
                <div className="space-y-4">
                  <SmsScanView onScanComplete={handleScanComplete} onScanError={handleScanError} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
        
        
      </div>
      
      {selectedExpense && <ExpenseEditForm expense={selectedExpense} isOpen={isEditExpenseOpen} onClose={() => setIsEditExpenseOpen(false)} onSave={handleExpenseEditSave} />}
    </Layout>;
};
export default Expenses;