
import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, 
  AreaChart, Area 
} from 'recharts';
import { DateRange } from '@/types';
import { getExpenses } from '@/lib/db';
import { Expense, ExpenseCategory } from '@/types';
import { format, subMonths, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, PieChart as PieChartIcon, TrendingUp, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

// Category colors for charts
const CATEGORY_COLORS: Record<string, string> = {
  groceries: '#4ade80',
  utilities: '#60a5fa',
  entertainment: '#c084fc',
  transportation: '#fbbf24',
  dining: '#f87171',
  shopping: '#818cf8',
  health: '#f472b6',
  travel: '#22d3ee',
  housing: '#34d399',
  education: '#fb923c',
  subscriptions: '#a78bfa',
  other: '#94a3b8'
};

const Analytics = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [timeframe, setTimeframe] = useState<'30days' | '90days' | '6months' | '12months'>('30days');
  const [isLoading, setIsLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState('category');

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setIsLoading(true);
    try {
      const result = await getExpenses();
      setExpenses(result);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter expenses based on timeframe
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case '30days':
        startDate = subDays(now, 30);
        break;
      case '90days':
        startDate = subDays(now, 90);
        break;
      case '6months':
        startDate = subMonths(now, 6);
        break;
      case '12months':
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = subDays(now, 30);
    }
    
    return expenses.filter(expense => new Date(expense.date) >= startDate);
  }, [expenses, timeframe]);

  // Category data for pie chart
  const categoryData = useMemo(() => {
    const categories = new Map<ExpenseCategory, number>();
    
    filteredExpenses.forEach(expense => {
      const current = categories.get(expense.category) || 0;
      categories.set(expense.category, current + expense.amount);
    });
    
    return Array.from(categories.entries())
      .map(([category, total]) => ({
        category,
        total,
        color: CATEGORY_COLORS[category] || CATEGORY_COLORS.other
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  // Monthly data for trend charts
  const monthlyData = useMemo(() => {
    // Create a map of months
    const months = new Map<string, { month: string, total: number, [key: string]: any }>();
    
    // Determine how many months to show based on timeframe
    const numMonths = timeframe === '30days' ? 1 : 
                      timeframe === '90days' ? 3 : 
                      timeframe === '6months' ? 6 : 12;
    
    // Initialize months map with empty data
    for (let i = 0; i < numMonths; i++) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'MMM yyyy');
      months.set(monthKey, { 
        month: monthKey, 
        total: 0,
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
        other: 0
      });
    }
    
    // Populate months map with expense data
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = format(date, 'MMM yyyy');
      
      if (months.has(monthKey)) {
        const monthData = months.get(monthKey)!;
        monthData.total += expense.amount;
        monthData[expense.category] += expense.amount;
      }
    });
    
    // Convert map to array and sort by date
    return Array.from(months.values())
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
  }, [filteredExpenses, timeframe]);

  // Top spending categories
  const topCategories = useMemo(() => {
    return categoryData.slice(0, 5);
  }, [categoryData]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Custom tooltip for charts
  const renderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-popover text-popover-foreground p-3 rounded-md shadow-md">
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm">
              <span className="font-medium capitalize">{entry.name === 'total' ? 'Total' : entry.name}: </span>
              <span>{formatCurrency(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Total spending amount
  const totalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Visualize and analyze your spending patterns
            </p>
          </motion.div>
        </header>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center"
          >
            <h2 className="text-xl font-semibold">
              Total Spent: <span className="text-primary">{formatCurrency(totalSpent)}</span>
            </h2>
            <Badge variant="outline" className="ml-3">
              {filteredExpenses.length} transactions
            </Badge>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Select 
              value={timeframe} 
              onValueChange={(value: any) => setTimeframe(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center py-24 bg-muted/20 rounded-lg"
          >
            <Activity className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No Expense Data</h3>
            <p className="text-muted-foreground">
              There are no expenses recorded for the selected timeframe.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Top Categories */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="text-lg font-medium mb-4">Top Spending Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {topCategories.map((category, index) => (
                  <motion.div
                    key={category.category}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + (index * 0.1) }}
                  >
                    <Card className="p-4 h-full">
                      <div 
                        className="w-3 h-3 rounded-full mb-2" 
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <p className="text-sm font-medium capitalize">{category.category}</p>
                      <p className="text-2xl font-bold">{formatCurrency(category.total)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {((category.total / totalSpent) * 100).toFixed(1)}% of total
                      </p>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Charts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Tabs 
                value={activeChartTab} 
                onValueChange={setActiveChartTab}
                className="w-full"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Expense Analysis</h3>
                  <TabsList>
                    <TabsTrigger value="category" className="flex items-center gap-1">
                      <PieChartIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Categories</span>
                    </TabsTrigger>
                    <TabsTrigger value="trend" className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="hidden sm:inline">Trends</span>
                    </TabsTrigger>
                    <TabsTrigger value="comparison" className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Comparison</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="category" className="mt-0">
                  <Card className="p-4">
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            dataKey="total"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            outerRadius={130}
                            innerRadius={60}
                            paddingAngle={2}
                            label={({ name, percent }) => 
                              `${name} (${(percent * 100).toFixed(0)}%)`
                            }
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={renderTooltip} />
                          <Legend 
                            layout="horizontal" 
                            verticalAlign="bottom" 
                            align="center"
                            formatter={(value) => <span className="capitalize">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </TabsContent>
                
                <TabsContent value="trend" className="mt-0">
                  <Card className="p-4">
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={monthlyData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis dataKey="month" />
                          <YAxis
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip content={renderTooltip} />
                          <Line
                            type="monotone"
                            dataKey="total"
                            name="Total"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </TabsContent>
                
                <TabsContent value="comparison" className="mt-0">
                  <Card className="p-4">
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={monthlyData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                          barSize={36}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis 
                            dataKey="month" 
                            angle={-45} 
                            textAnchor="end" 
                            height={70} 
                          />
                          <YAxis 
                            tickFormatter={(value) => `$${value}`} 
                          />
                          <Tooltip content={renderTooltip} />
                          <Legend 
                            verticalAlign="top" 
                            wrapperStyle={{ lineHeight: '40px' }} 
                            formatter={(value) => <span className="capitalize">{value}</span>}
                          />
                          {Object.keys(CATEGORY_COLORS)
                            .filter(category => 
                              monthlyData.some(data => data[category] > 0)
                            )
                            .slice(0, 5) // Show top 5 categories to avoid clutter
                            .map((category, index) => (
                              <Bar
                                key={`bar-${index}`}
                                dataKey={category}
                                name={category}
                                stackId="a"
                                fill={CATEGORY_COLORS[category]}
                              />
                            ))
                          }
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
            
            {/* Monthly Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <h3 className="text-lg font-medium mb-4">Monthly Spending Breakdown</h3>
              <Card className="p-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={monthlyData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="month" />
                      <YAxis 
                        tickFormatter={(value) => `$${value}`} 
                      />
                      <Tooltip content={renderTooltip} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Analytics;
