
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowUpRight, Mail, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { Expense, Income, Transaction, DateRange } from '@/types';
import { getExpenses, getExpensesByDateRange, getIncomes, getIncomesByDateRange, getFinancialSummary } from '@/lib/db';
import ExpenseCard from '@/components/ExpenseCard';
import IncomeCard from '@/components/IncomeCard';
import ExpenseSummaryChart from '@/components/ExpenseSummaryChart';
import ExpenseForm from '@/components/ExpenseForm';
import IncomeForm from '@/components/IncomeForm';
import GmailAuthView from '@/components/GmailAuthView';
import TransactionViews from '@/components/TransactionViews';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { addExpense, addIncome } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import DateRangeSelector from '@/components/DateRangeSelector';
import GmailDropdown from '@/components/GmailDropdown';

const Index = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all' | 'custom'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalExpenses: 0,
    totalIncome: 0,
    balance: 0
  });
  const [transactionTab, setTransactionTab] = useState<'expenses' | 'income'>('expenses');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [showDateRangeSelector, setShowDateRangeSelector] = useState(false);

  // Load expenses on mount
  useEffect(() => {
    loadData();
  }, [timeframe, dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      let expensesResult: Expense[];
      let incomesResult: Income[];
      let startDate: string;
      let endDate: string;
      
      if (timeframe === 'week') {
        startDate = startOfWeek(new Date()).toISOString();
        endDate = endOfWeek(new Date()).toISOString();
        expensesResult = await getExpensesByDateRange(startDate, endDate);
        incomesResult = await getIncomesByDateRange(startDate, endDate);
      } else if (timeframe === 'month') {
        startDate = startOfMonth(new Date()).toISOString();
        endDate = endOfMonth(new Date()).toISOString();
        expensesResult = await getExpensesByDateRange(startDate, endDate);
        incomesResult = await getIncomesByDateRange(startDate, endDate);
      } else if (timeframe === 'custom') {
        startDate = dateRange.from.toISOString();
        endDate = dateRange.to.toISOString();
        expensesResult = await getExpensesByDateRange(startDate, endDate);
        incomesResult = await getIncomesByDateRange(startDate, endDate);
      } else {
        expensesResult = await getExpenses();
        incomesResult = await getIncomes();
      }
      
      // Get financial summary
      const financialSummary = timeframe !== 'all' 
        ? await getFinancialSummary(startDate!, endDate!) 
        : await getFinancialSummary();
      
      setSummary(financialSummary);
      
      // Sort by date (most recent first)
      expensesResult.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      incomesResult.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setExpenses(expensesResult);
      setIncomes(incomesResult);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error Loading Data',
        description: 'Could not load your financial data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExpense = async (expense: Expense) => {
    try {
      await addExpense(expense);
      setIsAddExpenseOpen(false);
      toast({
        title: 'Expense Added',
        description: 'Your expense has been successfully added.',
      });
      loadData();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: 'Error Adding Expense',
        description: 'Could not add your expense. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddIncome = async (income: Income) => {
    try {
      await addIncome(income);
      setIsAddIncomeOpen(false);
      toast({
        title: 'Income Added',
        description: 'Your income has been successfully added.',
      });
      loadData();
    } catch (error) {
      console.error('Error adding income:', error);
      toast({
        title: 'Error Adding Income',
        description: 'Could not add your income. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleGmailScanComplete = (newExpenses: Expense[]) => {
    // Reload expenses after scan
    loadData();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setTimeframe('custom');
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Track and analyze your expenses and income
                </p>
              </div>
              <GmailDropdown 
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                onScanComplete={handleGmailScanComplete}
              />
            </div>
            
            {/* Date range filters */}
            <div className="flex items-center space-x-2 mt-4 mb-4 flex-wrap gap-y-2">
              {showDateRangeSelector ? (
                <div className="flex items-center">
                  <DateRangeSelector 
                    value={dateRange}
                    onChange={handleDateRangeChange}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDateRangeSelector(false)}
                    className="ml-2"
                  >
                    Hide
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant={timeframe === 'week' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setTimeframe('week')}
                  >
                    Week
                  </Button>
                  <Button
                    variant={timeframe === 'month' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setTimeframe('month')}
                  >
                    Month
                  </Button>
                  <Button
                    variant={timeframe === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setTimeframe('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={timeframe === 'custom' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setShowDateRangeSelector(true)}
                  >
                    Custom
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Summary Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="col-span-1"
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Total Balance</CardTitle>
                <CardDescription>
                  {timeframe === 'week' 
                    ? 'This week' 
                    : timeframe === 'month' 
                    ? 'This month' 
                    : timeframe === 'custom'
                    ? `${format(dateRange.from, 'dd MMM')} - ${format(dateRange.to, 'dd MMM')}`
                    : 'All time'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className={`text-3xl font-bold ${summary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {isLoading ? (
                      <div className="h-9 w-24 bg-muted/50 rounded animate-pulse"></div>
                    ) : (
                      formatCurrency(summary.balance)
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Balance (Income - Expenses)
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <div className="flex items-center text-sm font-medium">
                        <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                        Income
                      </div>
                      <div className="text-lg font-semibold text-green-500">
                        {formatCurrency(summary.totalIncome)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center text-sm font-medium">
                        <TrendingDown className="mr-1 h-4 w-4 text-red-500" />
                        Expenses
                      </div>
                      <div className="text-lg font-semibold text-red-500">
                        {formatCurrency(summary.totalExpenses)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full" 
                      onClick={() => setIsAddExpenseOpen(true)}
                    >
                      <TrendingDown className="mr-2 h-4 w-4 text-red-500" />
                      Add Expense
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full" 
                      onClick={() => setIsAddIncomeOpen(true)}
                    >
                      <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                      Add Income
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Gmail Integration Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="col-span-2 hidden"
          >
            <GmailAuthView onScanComplete={handleGmailScanComplete} />
          </motion.div>
        </div>

        {/* Transactions and Chart Section */}
        <div className="space-y-6">
          <Tabs defaultValue="transactions" className="w-full">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <TabsList>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="detailed">Detailed View</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="transactions" className="mt-0">
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-1">
                  <Button
                    variant={transactionTab === 'expenses' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTransactionTab('expenses')}
                  >
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Expenses
                  </Button>
                  <Button
                    variant={transactionTab === 'income' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTransactionTab('income')}
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Income
                  </Button>
                </div>
              </div>
              
              {transactionTab === 'expenses' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {isLoading ? (
                    // Loading placeholders
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse"></div>
                    ))
                  ) : expenses.length > 0 ? (
                    expenses.map((expense, index) => (
                      <motion.div
                        key={expense.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 * (index % 6) }}
                      >
                        <ExpenseCard expense={expense} onUpdate={loadData} />
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <Mail className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium">No expenses yet</h3>
                      <p className="text-muted-foreground mt-1 mb-4">
                        {timeframe === 'week' 
                          ? 'You have no expenses recorded this week.' 
                          : timeframe === 'month'
                          ? 'You have no expenses recorded this month.'
                          : timeframe === 'custom'
                          ? `You have no expenses recorded from ${format(dateRange.from, 'MMM d, yyyy')} to ${format(dateRange.to, 'MMM d, yyyy')}.`
                          : 'You have no expenses recorded.'}
                      </p>
                      <Button onClick={() => setIsAddExpenseOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Expense
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {isLoading ? (
                    // Loading placeholders
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse"></div>
                    ))
                  ) : incomes.length > 0 ? (
                    incomes.map((income, index) => (
                      <motion.div
                        key={income.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 * (index % 6) }}
                      >
                        <IncomeCard income={income} onUpdate={loadData} />
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <Wallet className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium">No income yet</h3>
                      <p className="text-muted-foreground mt-1 mb-4">
                        {timeframe === 'week' 
                          ? 'You have no income recorded this week.' 
                          : timeframe === 'month'
                          ? 'You have no income recorded this month.'
                          : timeframe === 'custom'
                          ? `You have no income recorded from ${format(dateRange.from, 'MMM d, yyyy')} to ${format(dateRange.to, 'MMM d, yyyy')}.`
                          : 'You have no income recorded.'}
                      </p>
                      <Button onClick={() => setIsAddIncomeOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Income
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <ExpenseSummaryChart expenses={expenses} chartType="pie" />
                
                {/* Bar Chart */}
                <ExpenseSummaryChart expenses={expenses} chartType="bar" />
              </div>
            </TabsContent>
            
            <TabsContent value="detailed" className="mt-0">
              <TransactionViews expenses={expenses} incomes={incomes} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>
              Enter the details of your expense below.
            </DialogDescription>
          </DialogHeader>
          
          <ExpenseForm 
            onSubmit={handleAddExpense}
            onCancel={() => setIsAddExpenseOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Add Income Dialog */}
      <Dialog open={isAddIncomeOpen} onOpenChange={setIsAddIncomeOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Income</DialogTitle>
            <DialogDescription>
              Enter the details of your income below.
            </DialogDescription>
          </DialogHeader>
          
          <IncomeForm 
            onSubmit={handleAddIncome}
            onCancel={() => setIsAddIncomeOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Index;
