import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, TooltipProps } from 'recharts';
import { DateRange } from '@/types';
import { getExpenses, getIncomes, getUserCategories } from '@/lib/db';
import { Expense, ExpenseCategory, Income, UserCategories } from '@/types';
import { format, subMonths, subDays, startOfMonth, endOfMonth, parseISO, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, PieChart as PieChartIcon, TrendingUp, Activity, Calendar as CalendarIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange as DateRangeType } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/formatCurrency';
const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  groceries: '#38b000',
  utilities: '#3a86ff',
  entertainment: '#9d4edd',
  transportation: '#ffbe0b',
  dining: '#ff006e',
  shopping: '#4361ee',
  health: '#f72585',
  travel: '#00b4d8',
  housing: '#06d6a0',
  education: '#fb8500',
  subscriptions: '#7209b7',
  other: '#6c757d',
  salary: '#2a9d8f',
  freelance: '#e9c46a',
  investment: '#f4a261',
  gift: '#e76f51',
  refund: '#264653',
  snacks: '#ff9500',
  'home-expenses': '#4a6fa5',
  personal: '#9b5de5',
  'health/medical': '#00bbf9',
  loan: '#fee440',
  'utilities/hardware': '#f15bb5',
  'dmart/glossary': '#ff5100'
};
type TimeframeOption = '30days' | '90days' | '6months' | '12months' | 'custom';
const Analytics = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30days');
  const [isLoading, setIsLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState('category');
  const [dateRange, setDateRange] = useState<DateRangeType | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [showIncome, setShowIncome] = useState(false);
  const [userCategoryColors, setUserCategoryColors] = useState<Record<string, string>>({});
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    setIsLoading(true);
    try {
      const expensesResult = await getExpenses();
      const incomesResult = await getIncomes();
      setExpenses(expensesResult);
      setIncomes(incomesResult);
      const userCategories = await getUserCategories();
      if (userCategories.categoryColors) {
        setUserCategoryColors(userCategories.categoryColors);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const getCategoryColor = (category: string): string => {
    return userCategoryColors[category] || DEFAULT_CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLORS.other;
  };
  const handleTimeframeChange = (value: string) => {
    const tf = value as TimeframeOption;
    setTimeframe(tf);
    if (tf !== 'custom') {
      const now = new Date();
      let from: Date;
      switch (tf) {
        case '30days':
          from = subDays(now, 30);
          break;
        case '90days':
          from = subDays(now, 90);
          break;
        case '6months':
          from = subMonths(now, 6);
          break;
        case '12months':
          from = subMonths(now, 12);
          break;
        default:
          from = subDays(now, 30);
      }
      setDateRange({
        from,
        to: now
      });
    }
  };
  const filteredTransactions = useMemo(() => {
    if (!dateRange?.from) return {
      expenses: [],
      incomes: []
    };
    const from = dateRange.from;
    const to = dateRange.to ? addDays(dateRange.to, 1) : new Date();
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= from && expenseDate <= to;
    });
    const filteredIncomes = incomes.filter(income => {
      const incomeDate = new Date(income.date);
      return incomeDate >= from && incomeDate <= to;
    });
    return {
      expenses: filteredExpenses,
      incomes: filteredIncomes
    };
  }, [expenses, incomes, dateRange]);
  const categoryData = useMemo(() => {
    const categories = new Map<string, number>();
    if (showIncome) {
      filteredTransactions.incomes.forEach(income => {
        const current = categories.get(income.category) || 0;
        categories.set(income.category, current + income.amount);
      });
    } else {
      filteredTransactions.expenses.forEach(expense => {
        const current = categories.get(expense.category) || 0;
        categories.set(expense.category, current + expense.amount);
      });
    }
    return Array.from(categories.entries()).map(([category, total]) => ({
      category,
      total,
      color: getCategoryColor(category)
    })).sort((a, b) => b.total - a.total);
  }, [filteredTransactions, showIncome, userCategoryColors]);
  const monthlyData = useMemo(() => {
    if (!dateRange?.from) return [];
    let numMonths = 1;
    if (dateRange.to) {
      const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      numMonths = Math.max(1, Math.ceil(diffDays / 30));
    }
    const months = new Map<string, {
      month: string;
      total: number;
      income: number;
      expense: number;
      [key: string]: any;
    }>();
    for (let i = 0; i < numMonths; i++) {
      const date = subMonths(dateRange.to || new Date(), i);
      const monthKey = format(date, 'MMM yyyy');
      months.set(monthKey, {
        month: monthKey,
        total: 0,
        income: 0,
        expense: 0,
        groceries: 0,
        utilities: 0,
        entertainment: 0,
        transportation: 0,
        dining: 0,
        shopping: 0,
        health: 0,
        travel: 0,
        housing: 0,
        education: 0,
        subscriptions: 0,
        other: 0,
        salary: 0,
        freelance: 0,
        investment: 0,
        gift: 0,
        refund: 0
      });
    }
    filteredTransactions.expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = format(date, 'MMM yyyy');
      if (months.has(monthKey)) {
        const monthData = months.get(monthKey)!;
        monthData.expense += expense.amount;
        monthData.total -= expense.amount;
        monthData[expense.category] = (monthData[expense.category] || 0) + expense.amount;
      }
    });
    filteredTransactions.incomes.forEach(income => {
      const date = new Date(income.date);
      const monthKey = format(date, 'MMM yyyy');
      if (months.has(monthKey)) {
        const monthData = months.get(monthKey)!;
        monthData.income += income.amount;
        monthData.total += income.amount;
        monthData[income.category] = (monthData[income.category] || 0) + income.amount;
      }
    });
    return Array.from(months.values()).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
  }, [filteredTransactions, dateRange]);
  const topCategories = useMemo(() => {
    return categoryData.slice(0, 5);
  }, [categoryData]);
  const renderTooltip = ({
    active,
    payload
  }: any) => {
    if (active && payload && payload.length) {
      return <div className="bg-popover text-popover-foreground p-3 rounded-md shadow-md">
          {payload.map((entry: any, index: number) => <p key={index} className="text-sm">
              <span className="font-medium capitalize">{entry.name === 'total' ? 'Net' : entry.name === 'expense' ? 'Expense' : entry.name === 'income' ? 'Income' : entry.name}: </span>
              <span>{formatCurrency(entry.value, 'INR')}</span>
            </p>)}
        </div>;
    }
    return null;
  };
  const totalAmounts = useMemo(() => {
    const income = filteredTransactions.incomes.reduce((sum, income) => sum + income.amount, 0);
    const expense = filteredTransactions.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    return {
      income,
      expense,
      net: income - expense
    };
  }, [filteredTransactions]);
  return <Layout>
      <div className="max-w-7xl mx-auto px-0">
        <header className="mb-4"></header>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
          <motion.div initial={{
          opacity: 0,
          x: -10
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          duration: 0.5,
          delay: 0.1
        }} className="flex flex-col sm:flex-row gap-1 sm:items-center">
            <div className="flex flex-col gap-0.5 px-2 my-0 py-0">
              <h2 className="text-lg font-semibold leading-tight">
                {showIncome ? 'Income:' : 'Expenses:'} <span className="text-primary">{showIncome ? formatCurrency(totalAmounts.income, 'INR') : formatCurrency(totalAmounts.expense, 'INR')}</span>
              </h2>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="ml-1 text-xs py-0.5 px-1.5">
                  {showIncome ? `${filteredTransactions.incomes.length} transactions` : `${filteredTransactions.expenses.length} transactions`}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setShowIncome(!showIncome)} className="text-xs h-6 px-1.5">
                  {showIncome ? 'Show Expenses' : 'Show Income'}
                </Button>
              </div>
            </div>
          </motion.div>
          
          <motion.div initial={{
          opacity: 0,
          x: 10
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          duration: 0.5,
          delay: 0.1
        }} className="flex flex-col sm:flex-row items-center gap-1">
            <Select value={timeframe} onValueChange={handleTimeframeChange}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Select Timeframe" /></SelectTrigger>
              <SelectContent position="popper" className="w-[140px] text-xs">
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>
            {timeframe === 'custom' && <div className="grid gap-1"><Popover><PopoverTrigger asChild>
              <Button id="date" variant={"outline"} className={cn("w-[180px] h-8 justify-start text-left font-normal text-xs")}> 
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {dateRange?.from ? dateRange.to ? <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </> : format(dateRange.from, "LLL dd, y") : <span>Pick a date range</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
            </PopoverContent></Popover></div>}
          </motion.div>
        </div>
        
        {isLoading ? <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div> : showIncome && filteredTransactions.incomes.length === 0 || !showIncome && filteredTransactions.expenses.length === 0 ? <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5,
        delay: 0.2
      }} className="text-center py-16 bg-muted/20 rounded-lg text-sm">
            <Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
            <h3 className="text-lg font-medium mb-1">No {showIncome ? 'Income' : 'Expense'} Data</h3>
            <p className="text-muted-foreground text-xs">
              There are no {showIncome ? 'income entries' : 'expenses'} recorded for the selected timeframe.
            </p>
          </motion.div> : <div className="space-y-4 px-0">
            <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.2
        }}>
              <h3 className="text-base font-medium mb-2 px-2">Top {showIncome ? 'Income' : 'Spending'} Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {topCategories.map((category, index) => <motion.div key={category.category} initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.3,
              delay: 0.3 + index * 0.1
            }}>
                    <Card className="p-2 h-full hover:shadow-md transition-shadow">
                      <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: category.color }}></div>
                      <p className="text-xs font-medium capitalize">{category.category.replace(/-/g, ' ')}</p>
                      <p className="text-lg font-bold">{formatCurrency(category.total, 'INR')}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {(category.total / (showIncome ? totalAmounts.income : totalAmounts.expense) * 100).toFixed(1)}% of total
                      </p>
                    </Card>
                  </motion.div>)}
              </div>
            </motion.div>

            <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.4
        }}>
              <Tabs value={activeChartTab} onValueChange={setActiveChartTab} className="w-full">
                <div className="flex justify-between items-center mb-2 py-0 my-0">
                  <h3 className="text-base font-medium px-2">{showIncome ? 'Income' : 'Expense'} Analysis</h3>
                  <TabsList className="py-0 my-0 h-7 text-xs gap-1">
                    <TabsTrigger value="category" className="flex items-center gap-1 px-2 py-1 h-7">
                      <PieChartIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Categories</span>
                    </TabsTrigger>
                    <TabsTrigger value="trend" className="flex items-center gap-1 px-2 py-1 h-7">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Trends</span>
                    </TabsTrigger>
                    <TabsTrigger value="comparison" className="flex items-center gap-1 px-2 py-1 h-7">
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Comparison</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="category" className="mt-0">
                  <Card className="p-2 px-0 py-2">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryData} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} innerRadius={38} paddingAngle={2} label={({ name, percent }) => `${name.replace(/-/g, ' ')} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                            {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={1} />)}
                          </Pie>
                          <Tooltip content={renderTooltip} />
                          <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={10} wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} formatter={value => <span className="capitalize">{value.replace(/-/g, ' ')}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </TabsContent>
                
                <TabsContent value="trend" className="mt-0">
                  <Card className="p-2">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="month" tick={{ fill: '#888', fontSize: '11px' }} tickLine={{ stroke: '#888' }} height={30} padding={{ left: 5, right: 5 }} />
                          <YAxis tickFormatter={value => `₹${Math.abs(value)}`} tick={{ fill: '#888', fontSize: '11px' }} tickLine={{ stroke: '#888' }} width={40} />
                          <Tooltip content={renderTooltip} />
                          <Legend wrapperStyle={{ paddingTop: '4px', fontSize: '11px' }} />
                          {showIncome ? <Line type="monotone" dataKey="income" name="Income" stroke="#2a9d8f" strokeWidth={2} dot={{ r: 3, fill: '#2a9d8f', strokeWidth: 1, stroke: '#fff' }} activeDot={{ r: 4 }} /> : <Line type="monotone" dataKey="expense" name="Expense" stroke="#e63946" strokeWidth={2} dot={{ r: 3, fill: '#e63946', strokeWidth: 1, stroke: '#fff' }} activeDot={{ r: 4 }} />}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </TabsContent>
                
                <TabsContent value="comparison" className="mt-0">
                  <Card className="p-2">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }} barSize={18}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="month" angle={-45} textAnchor="end" height={40} tick={{ fill: '#888', fontSize: '11px' }} tickLine={{ stroke: '#888' }} padding={{ left: 5, right: 5 }} />
                          <YAxis tickFormatter={value => `₹${Math.abs(value)}`} tick={{ fill: '#888', fontSize: '11px' }} tickLine={{ stroke: '#888' }} width={40} />
                          <Tooltip content={renderTooltip} />
                          <Legend verticalAlign="top" wrapperStyle={{ lineHeight: '24px', paddingBottom: '4px', fontSize: '11px' }} formatter={value => <span className="capitalize">{value.replace(/-/g, ' ')}</span>} />
                          {Object.keys(monthlyData[0] || {}).filter(key => {
                        if (showIncome) {
                          return ['salary', 'freelance', 'investment', 'gift', 'refund', 'other'].includes(key) && monthlyData.some(data => data[key] > 0);
                        } else {
                          return !['salary', 'freelance', 'investment', 'gift', 'refund', 'income', 'expense', 'total', 'month'].includes(key) && monthlyData.some(data => data[key] > 0);
                        }
                      }).slice(0, 5).map((category, index) => <Bar key={`bar-${index}`} dataKey={category} name={category} stackId="a" fill={getCategoryColor(category)} />)}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
            
            <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.6
        }}>
              <h3 className="text-base font-medium mb-2 px-2 py-0 my-0">Income vs Expenses</h3>
              <Card className="p-2">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="month" tick={{ fill: '#888', fontSize: '11px' }} tickLine={{ stroke: '#888' }} padding={{ left: 5, right: 5 }} height={24} />
                      <YAxis tickFormatter={value => `₹${Math.abs(value)}`} tick={{ fill: '#888', fontSize: '11px' }} tickLine={{ stroke: '#888' }} width={40} />
                      <Tooltip content={renderTooltip} />
                      <Legend wrapperStyle={{ paddingTop: '4px', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="income" name="Income" stroke="#2a9d8f" fill="#2a9d8f" fillOpacity={0.18} />
                      <Area type="monotone" dataKey="expense" name="Expense" stroke="#e63946" fill="#e63946" fillOpacity={0.18} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          </div>}
      </div>
    </Layout>;
};
export default Analytics;