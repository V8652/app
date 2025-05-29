import { useState, useEffect } from 'react';
import SafeLayout from '@/components/SafeLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowUpRight, TrendingUp, TrendingDown, Wallet, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { Expense, Income, DateRange } from '@/types';
import { getExpenses, getExpensesByDateRange, getIncomes, getIncomesByDateRange, getFinancialSummary } from '@/lib/db';
import ExpenseCard from '@/components/ExpenseCard';
import IncomeCard from '@/components/IncomeCard';
import ExpenseSummaryChart from '@/components/ExpenseSummaryChart';
import ExpenseForm from '@/components/ExpenseForm';
import IncomeForm from '@/components/IncomeForm';
import TransactionViews from '@/components/TransactionViews';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { addExpense, addIncome } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfWeek, startOfWeek, endOfMonth } from 'date-fns';
import DateRangeSelector from '@/components/DateRangeSelector';
import ExpenseEditForm from '@/components/ExpenseEditForm';
import IncomeEditForm from '@/components/IncomeEditForm';
import { batchEnrichTransactions } from '@/lib/transaction-enricher';
import { useNavigate } from 'react-router-dom';
import { useSmsScan } from '@/hooks/use-sms-scanner';
import { Loader2 } from 'lucide-react';
import TransactionDashboard from '@/components/TransactionDashboard';

const Index = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [isEditIncomeOpen, setIsEditIncomeOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all' | 'custom'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalExpenses: 0,
    totalIncome: 0,
    balance: 0
  });
  const [allTimeSummary, setAllTimeSummary] = useState({
    totalExpenses: 0,
    totalIncome: 0,
    balance: 0
  });
  const [transactionTab, setTransactionTab] = useState<'expenses' | 'income' | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [showDateRangeSelector, setShowDateRangeSelector] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  const { isScanning, scanSms } = useSmsScan();
  
  useEffect(() => {
    loadData();
    loadAllTimeData();
  }, [timeframe, dateRange, refreshKey]);
  
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
        const inclusiveEnd = new Date(dateRange.to);
        inclusiveEnd.setHours(23, 59, 59, 999);
        endDate = inclusiveEnd.toISOString();
        expensesResult = await getExpensesByDateRange(startDate, endDate);
        incomesResult = await getIncomesByDateRange(startDate, endDate);
      } else {
        expensesResult = await getExpenses();
        incomesResult = await getIncomes();
      }
      
      // Auto-enrich transactions with category and notes from merchant data
      const allTransactions = [...expensesResult, ...incomesResult];
      const enrichCount = await batchEnrichTransactions(allTransactions);
      
      if (enrichCount > 0) {
        console.log(`Auto-enriched ${enrichCount} transactions with merchant data`);
        
        // Reload data if any transactions were enriched
        if (timeframe !== 'all') {
          expensesResult = await getExpensesByDateRange(startDate!, endDate!);
          incomesResult = await getIncomesByDateRange(startDate!, endDate!);
        } else {
          expensesResult = await getExpenses();
          incomesResult = await getIncomes();
        }
        
        toast({
          title: 'Transactions Updated',
          description: `${enrichCount} transactions were automatically updated with merchant data.`
        });
      }
      
      const financialSummary = timeframe !== 'all' ? await getFinancialSummary(startDate!, endDate!) : await getFinancialSummary();
      setSummary(financialSummary);
      expensesResult.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      incomesResult.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpenses(expensesResult);
      setIncomes(incomesResult);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error Loading Data',
        description: 'Could not load your financial data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadAllTimeData = async () => {
    try {
      const allTimeExpenses = await getExpenses();
      const allTimeIncomes = await getIncomes();
      const totalAllTimeExpenses = allTimeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const totalAllTimeIncome = allTimeIncomes.reduce((sum, income) => sum + income.amount, 0);
      const balance = totalAllTimeIncome - totalAllTimeExpenses;
      setAllTimeSummary({
        totalExpenses: totalAllTimeExpenses,
        totalIncome: totalAllTimeIncome,
        balance: balance
      });
    } catch (error) {
      console.error('Error loading all-time data:', error);
    }
  };
  
  const handleAddExpense = async (expense: Expense) => {
    try {
      await addExpense(expense);
      setIsAddExpenseOpen(false);
      toast({
        title: 'Expense Added',
        description: 'Your expense has been successfully added.'
      });
      loadData();
      loadAllTimeData();
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: 'Error Adding Expense',
        description: 'Could not add your expense. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  const handleAddIncome = async (income: Income) => {
    try {
      await addIncome(income);
      setIsAddIncomeOpen(false);
      toast({
        title: 'Income Added',
        description: 'Your income has been successfully added.'
      });
      loadData();
      loadAllTimeData();
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error adding income:', error);
      toast({
        title: 'Error Adding Income',
        description: 'Could not add your income. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  // Function for opening the add income dialog
  const handleAddIncomeClick = () => {
    setIsAddIncomeOpen(true);
  };
  
  // Function for opening the add expense dialog
  const handleAddExpenseClick = () => {
    setIsAddExpenseOpen(true);
  };
  
  // Function for handling clicks on existing expense items
  const handleExpenseItemClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsEditExpenseOpen(true);
  };
  
  // Function for handling clicks on existing income items
  const handleIncomeItemClick = (income: Income) => {
    setSelectedIncome(income);
    setIsEditIncomeOpen(true);
  };
  
  const handleExpenseEditSave = () => {
    loadData();
    loadAllTimeData();
    setIsEditExpenseOpen(false);
    setSelectedExpense(null);
    setRefreshKey(prev => prev + 1);
  };
  
  const handleIncomeEditSave = () => {
    loadData();
    loadAllTimeData();
    setIsEditIncomeOpen(false);
    setSelectedIncome(null);
    setRefreshKey(prev => prev + 1);
  };
  
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setTimeframe('custom');
  };
  
  // Direct SMS scanning functionality
  const handleScanSmsClick = async () => {
    try {
      const newExpenses = await scanSms({
        from: dateRange.from,
        to: dateRange.to
      });
      
      if (newExpenses.length > 0) {
        // If new expenses were added, refresh the data
        loadData();
        loadAllTimeData();
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error scanning SMS:', error);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  const handleTransactionChange = () => {
    loadData();
    loadAllTimeData();
    setRefreshKey(prev => prev + 1);
  };
  
  const AnimatedCurrencyValue = ({
    amount
  }: {
    amount: number;
  }) => {
    const [prevAmount, setPrevAmount] = useState(amount);
    const hasChanged = prevAmount !== amount;
    useEffect(() => {
      if (hasChanged) {
        setTimeout(() => setPrevAmount(amount), 500);
      }
    }, [amount, hasChanged]);
    return <motion.div key={amount} initial={hasChanged ? {
      opacity: 0,
      y: -20
    } : false} animate={{
      opacity: 1,
      y: 0
    }} className={hasChanged ? 'text-primary' : ''}>
        {formatCurrency(amount)}
      </motion.div>;
  };
  
  return <SafeLayout>
      <div className="max-w-7xl mx-auto">
        {/* Combined Total Balance and Scan SMS */}
        <div className="flex justify-between items-center mb-4 px-1 sm:px-3"> {/* Added flex container */}
          <div className="flex flex-col my-2"> {/* Total Balance */}
            <div className="text-lg font-medium mb-1">Total Balance</div>
            <div className={`text-3xl font-bold ${allTimeSummary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {isLoading ? <div className="h-9 w-24 bg-muted/50 rounded animate-pulse"></div> : <AnimatedCurrencyValue amount={allTimeSummary.balance} />}
            </div>
          </div>
          {/* SMS Scan Button - moved here */}
          <Button
            onClick={handleScanSmsClick}
            variant="outline"
            size="sm"
            className="gap-1 sms-scan-button ml-1"
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="sm:inline">Scanning...</span>
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                <span className="sm:inline">Scan SMS</span>
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-col space-y-4 mb-2">
          <div className="flex items-center justify-between mb-2 px-1 sm:px-3">
            <div className="flex items-center space-x-1 flex-wrap gap-y-2 gap-x-1">
              {showDateRangeSelector ? <div className="flex items-center">
                  <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />
                  <Button variant="ghost" size="sm" onClick={() => setShowDateRangeSelector(false)} className="ml-1">
                    Hide
                  </Button>
                </div> : <>
                  <Button variant={timeframe === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setTimeframe('week')}>
                    Week
                  </Button>
                  <Button variant={timeframe === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setTimeframe('month')}>
                    Month
                  </Button>
                  <Button variant={timeframe === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setTimeframe('all')}>
                    All
                  </Button>
                  <Button variant={timeframe === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => setShowDateRangeSelector(true)}>
                    Custom
                  </Button>
                </>}
            </div>
          </div>
        </div>

        {/* Removed Card component */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-2 px-1 sm:px-3"> {/* Adjusted padding */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.1
        }} key={refreshKey} className="col-span-1"> {/* Removed px-1 sm:px-3 */}
            {/* Removed CardContent */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3 items-center"> {/* Changed items-left to items-center */}
                <div className="flex flex-col items-center cursor-pointer hover:bg-accent/50 rounded-lg p-2 transition-colors" onClick={handleAddIncomeClick}>
                  <div className="flex items-center text-sm font-medium"> {/* Changed items-left to items-center */}
                    <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                    Income
                  </div>
                  <div className="text-lg font-semibold text-green-500">
                    {isLoading ? <div className="h-7 w-24 bg-muted/50 rounded animate-pulse"></div> : <AnimatedCurrencyValue amount={timeframe === 'all' ? allTimeSummary.totalIncome : summary.totalIncome} />}
                  </div>
                </div>

                <div className="flex flex-col items-center cursor-pointer hover:bg-accent/50 rounded-lg p-2 transition-colors" onClick={handleAddExpenseClick}>
                  <div className="flex items-center text-sm font-medium"> {/* Changed items-right to items-center */}
                    <TrendingDown className="mr-1 h-4 w-4 text-red-500" />
                    Expenses
                  </div>
                  <div className="text-lg font-semibold text-red-500">
                    {isLoading ? <div className="h-7 w-24 bg-muted/50 rounded animate-pulse"></div> : <AnimatedCurrencyValue amount={timeframe === 'all' ? allTimeSummary.totalExpenses : summary.totalExpenses} />}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="space-y-4">
          <Tabs defaultValue="transactions" className="w-full">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
              <TabsList className="w-full">
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="transactions" className="mt-0">
              <TransactionDashboard
                expenses={expenses}
                incomes={incomes}
                onTransactionChange={handleTransactionChange}
              />
            </TabsContent>
            <TabsContent value="analytics" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ExpenseSummaryChart expenses={expenses} chartType="pie" key={`pie-${refreshKey}`} />
                <ExpenseSummaryChart expenses={expenses} chartType="bar" key={`bar-${refreshKey}`} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Keep existing modal dialogs */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>
              Enter the details of your expense below.
            </DialogDescription>
          </DialogHeader>
          
          <ExpenseForm onSubmit={handleAddExpense} onCancel={() => setIsAddExpenseOpen(false)} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAddIncomeOpen} onOpenChange={setIsAddIncomeOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Income</DialogTitle>
            <DialogDescription>
              Enter the details of your income below.
            </DialogDescription>
          </DialogHeader>
          
          <IncomeForm onSubmit={handleAddIncome} onCancel={() => setIsAddIncomeOpen(false)} />
        </DialogContent>
      </Dialog>

      {selectedExpense && <ExpenseEditForm expense={selectedExpense} isOpen={isEditExpenseOpen} onClose={() => setIsEditExpenseOpen(false)} onSave={handleExpenseEditSave} />}

      {selectedIncome && <IncomeEditForm income={selectedIncome} isOpen={isEditIncomeOpen} onClose={() => setIsEditIncomeOpen(false)} onSave={handleIncomeEditSave} />}
    </SafeLayout>;
};
export default Index;
