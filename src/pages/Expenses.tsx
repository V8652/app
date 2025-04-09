
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GmailAuthView from '@/components/GmailAuthView';
import TransactionViews from '@/components/TransactionViews';
import { Expense, Income } from '@/types';
import { toast } from '@/hooks/use-toast';
import TransactionListView from '@/components/TransactionListView';
import { getExpenses, getIncomes } from '@/lib/db';

const Expenses = () => {
  const [activeTab, setActiveTab] = useState('manual');
  const [refreshKey, setRefreshKey] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  
  // Load transactions when refreshKey changes
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const [loadedExpenses, loadedIncomes] = await Promise.all([
          getExpenses(),
          getIncomes()
        ]);
        setExpenses(loadedExpenses);
        setIncomes(loadedIncomes);
      } catch (error) {
        console.error('Error loading transactions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load transactions',
          variant: 'destructive',
        });
      }
    };
    
    loadTransactions();
  }, [refreshKey]);
  
  const handleScanComplete = (newExpenses: Expense[]) => {
    if (newExpenses.length > 0) {
      // Update the expense list
      setRefreshKey(prev => prev + 1);
      
      // Show success message
      toast({
        title: 'Scan Complete',
        description: `Found ${newExpenses.length} new expenses.`,
      });
    }
  };
  
  const handleTransactionChange = () => {
    // Update the transaction list
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Expenses & Income</h1>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="gmail">Gmail Import</TabsTrigger>
            <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4">
            <TransactionViews 
              key={`transactions-${refreshKey}`}
              expenses={expenses}
              incomes={incomes}
            />
          </TabsContent>
          
          <TabsContent value="gmail" className="space-y-4">
            <GmailAuthView onScanComplete={handleScanComplete} />
          </TabsContent>
          
          <TabsContent value="transactions" className="space-y-4">
            <TransactionListView key={`list-${refreshKey}`} onTransactionDelete={handleTransactionChange} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Expenses;
