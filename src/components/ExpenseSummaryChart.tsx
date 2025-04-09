
import { useMemo } from 'react';
import { Expense, CategorySummary } from '@/types';
import { Card } from '@/components/ui/card';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

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

interface ExpenseSummaryChartProps {
  expenses: Expense[];
  chartType?: 'pie' | 'bar';
}

const ExpenseSummaryChart = ({ expenses, chartType = 'pie' }: ExpenseSummaryChartProps) => {
  // Calculate category summaries
  const categorySummaries = useMemo(() => {
    const summaryMap = new Map<string, CategorySummary>();
    
    expenses.forEach(expense => {
      const { category, amount } = expense;
      
      if (!summaryMap.has(category)) {
        summaryMap.set(category, {
          category,
          total: 0,
          count: 0,
          color: CATEGORY_COLORS[category] || CATEGORY_COLORS.other
        });
      }
      
      const summary = summaryMap.get(category)!;
      summary.total += amount;
      summary.count += 1;
    });
    
    return Array.from(summaryMap.values())
      .filter(summary => summary.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  // Calculate total amount
  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format for tooltip
  const renderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.total / totalAmount) * 100).toFixed(1);
      
      return (
        <div className="bg-popover text-popover-foreground p-3 rounded-md shadow-md">
          <p className="font-medium capitalize">{data.category}</p>
          <p className="text-sm">{formatCurrency(data.total)}</p>
          <p className="text-xs text-muted-foreground">{percentage}% of total</p>
          <p className="text-xs text-muted-foreground">{data.count} transactions</p>
        </div>
      );
    }
    return null;
  };
  
  // Custom legend renderer
  const renderLegend = ({ payload }: any) => (
    <ul className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry: any, index: number) => (
        <li key={`legend-${index}`} className="flex items-center text-xs">
          <span 
            className="inline-block w-3 h-3 rounded-full mr-2" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="capitalize">{entry.value}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <Card className="p-4 chart-container">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-center">Expense Breakdown</h3>
        <p className="text-center text-muted-foreground text-sm">
          Total: {formatCurrency(totalAmount)}
        </p>
      </div>
      
      {categorySummaries.length > 0 ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={categorySummaries}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {categorySummaries.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={renderTooltip} />
                <Legend content={renderLegend} />
              </PieChart>
            ) : (
              <BarChart
                data={categorySummaries}
                margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.substring(0, 3)} 
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`} 
                />
                <Tooltip content={renderTooltip} />
                <Bar dataKey="total">
                  {categorySummaries.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-72 text-muted-foreground">
          No expenses to display
        </div>
      )}
    </Card>
  );
};

export default ExpenseSummaryChart;
