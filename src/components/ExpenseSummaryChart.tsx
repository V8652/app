
import { useMemo, useEffect, useState } from 'react';
import { Expense, CategorySummary } from '@/types';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getUserCategories } from '@/lib/db';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';

// Default category colors for charts with more vibrant colors
const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
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
  other: '#94a3b8',
  // Add more default categories here
  snacks: '#9b5de5',
  'home-expenses': '#fd7e14',
  personal: '#6366f1',
  'health/medical': '#ec4899',
  loan: '#fee440',
  'utilities/hardware': '#8b5cf6',
  'dmart/glossary': '#10b981'
};

interface ExpenseSummaryChartProps {
  expenses: Expense[];
  chartType?: 'pie' | 'bar';
}

const ExpenseSummaryChart = ({
  expenses,
  chartType = 'pie'
}: ExpenseSummaryChartProps) => {
  const [customCategoryColors, setCustomCategoryColors] = useState<Record<string, string>>({});
  const [animateKey, setAnimateKey] = useState(0);
  const [localExpenses, setLocalExpenses] = useState<Expense[]>(expenses);

  // Listen to database events to refresh chart data
  useEffect(() => {
    const handleDatabaseChange = () => {
      setAnimateKey(prev => prev + 1);
    };
    
    const unsubscribeAdded = dbEvents.subscribe(DatabaseEvent.TRANSACTION_ADDED, handleDatabaseChange);
    const unsubscribeUpdated = dbEvents.subscribe(DatabaseEvent.TRANSACTION_UPDATED, handleDatabaseChange);
    const unsubscribeDeleted = dbEvents.subscribe(DatabaseEvent.TRANSACTION_DELETED, handleDatabaseChange);
    const unsubscribeImported = dbEvents.subscribe(DatabaseEvent.DATA_IMPORTED, handleDatabaseChange);
    
    return () => {
      unsubscribeAdded();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeImported();
    };
  }, []);

  // Update local expenses when props change or when animateKey changes (due to db events)
  useEffect(() => {
    setLocalExpenses(expenses);
  }, [expenses, animateKey]);

  useEffect(() => {
    const loadCustomCategoryColors = async () => {
      try {
        const userCategories = await getUserCategories();
        if (userCategories.categoryColors) {
          setCustomCategoryColors(userCategories.categoryColors);
        }
      } catch (error) {
        console.error('Error loading custom category colors:', error);
      }
    };
    loadCustomCategoryColors();
  }, []);

  // Trigger animation update when expenses change
  useEffect(() => {
    setAnimateKey(prev => prev + 1);
  }, [expenses]);

  // Get color for a category
  const getCategoryColor = (category: string): string => {
    return customCategoryColors[category] || DEFAULT_CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLORS.other;
  };

  // Calculate category summaries
  const categorySummaries = useMemo(() => {
    const summaryMap = new Map<string, CategorySummary>();
    localExpenses.forEach(expense => {
      const {
        category,
        amount
      } = expense;
      if (!summaryMap.has(category)) {
        // Get color for this category
        const color = getCategoryColor(category);
        summaryMap.set(category, {
          category,
          total: 0,
          count: 0,
          color: color
        });
      }
      const summary = summaryMap.get(category)!;
      summary.total += amount;
      summary.count += 1;
    });
    return Array.from(summaryMap.values()).filter(summary => summary.total > 0).sort((a, b) => b.total - a.total);
  }, [localExpenses, customCategoryColors]);

  // Calculate total amount
  const totalAmount = useMemo(() => {
    return localExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [localExpenses]);

  // Format for tooltip
  const renderTooltip = ({
    active,
    payload
  }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = (data.total / totalAmount * 100).toFixed(1);
      return <div className="bg-popover text-popover-foreground p-3 rounded-md shadow-md">
          <p className="font-medium capitalize">{data.category.replace(/-/g, ' ')}</p>
          <p className="text-sm">{formatCurrency(data.total, 'INR')}</p>
          <p className="text-xs text-muted-foreground">{percentage}% of total</p>
          <p className="text-xs text-muted-foreground">{data.count} transactions</p>
        </div>;
    }
    return null;
  };

  // Custom legend renderer with improved spacing and overflow handling
  const renderLegend = ({
    payload
  }: any) => <div className="overflow-auto max-h-24 scrollbar-thin">
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-2 py-2">
        {payload.map((entry: any, index: number) => <li key={`legend-${index}`} className="flex items-center text-xs">
            <span className="inline-block w-3 h-3 rounded-full mr-1.5" style={{
          backgroundColor: entry.color
        }} />
            <span className="capitalize whitespace-nowrap">{entry.value.replace(/-/g, ' ')}</span>
          </li>)}
      </ul>
    </div>;

  // Custom label formatter for pie chart
  const renderCustomLabel = ({
    name,
    percent
  }: any) => {
    // Don't show labels for small slices
    if (percent < 0.05) return null;
    return `${(percent * 100).toFixed(0)}%`;
  };

  return <Card className="overflow-hidden shadow-md border-none bg-gradient-to-br from-slate-900 to-slate-800 text-white" key={`chart-${animateKey}`}>
      <div className="p-0 px-[0px] py-[0px]">
        <h3 className="text-lg font-semibold text-center mb-1 pt-4">Expense Breakdown</h3>
        <p className="text-center text-gray-300 text-sm mb-4">
          Total: {formatCurrency(totalAmount, 'INR')}
        </p>
      
        {categorySummaries.length > 0 ? <div className="w-full">
            {chartType === 'pie' ?
        // Improved pie chart container
        <div className="w-full h-[300px] md:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{
              top: 10,
              right: 10,
              bottom: 10,
              left: 10
            }}>
                    <Pie 
                      data={categorySummaries} 
                      dataKey="total" 
                      nameKey="category" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={100} 
                      innerRadius={50} 
                      paddingAngle={3} 
                      label={renderCustomLabel} 
                      labelLine={false}
                      animationDuration={800}
                      animationBegin={0}
                    >
                      {categorySummaries.map((entry, index) => <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke="#1e293b" 
                        strokeWidth={1.5}
                      />)}
                    </Pie>
                    <Tooltip content={renderTooltip} />
                    <Legend 
                      content={renderLegend} 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                      wrapperStyle={{
                        paddingTop: "10px",
                        color: "#e2e8f0"
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div> :
        // Improved bar chart container - removing unsupported properties
        <div className="w-full h-[300px] md:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={categorySummaries} 
                    margin={{
                      top: 10,
                      right: 10,
                      bottom: 60,
                      left: 20
                    }} 
                    barSize={24}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      dataKey="category" 
                      tick={{
                        fontSize: 12,
                        fill: "#e2e8f0"
                      }} 
                      interval={0} 
                      angle={-45} 
                      textAnchor="end" 
                      height={60} 
                      tickFormatter={value => value.substring(0, 8)} 
                    />
                    <YAxis 
                      tick={{
                        fontSize: 12,
                        fill: "#e2e8f0"
                      }} 
                      tickFormatter={value => formatCurrency(value, 'INR').replace('₹', '')} 
                    />
                    <Tooltip content={renderTooltip} />
                    <Bar dataKey="total">
                      {categorySummaries.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          style={{
                            filter: 'drop-shadow(0px 0px 5px rgba(0, 0, 0, 0.3))'
                          }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>}
          </div> : <div className="flex items-center justify-center h-60 text-gray-400">
            No expenses to display
          </div>}
      </div>
    </Card>;
};

export default ExpenseSummaryChart;
