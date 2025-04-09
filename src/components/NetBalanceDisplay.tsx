
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { getIncomes, getExpenses } from '@/lib/db';

export interface NetBalanceDisplayProps {
  totalIncome: number;
  totalExpenses: number;
  timeframe: string;
}

const NetBalanceDisplay = ({ totalIncome, totalExpenses, timeframe }: NetBalanceDisplayProps) => {
  const [netBalance, setNetBalance] = useState<number>(0);
  const [allTimeIncome, setAllTimeIncome] = useState<number>(0);
  const [allTimeExpenses, setAllTimeExpenses] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  useEffect(() => {
    const calculateNetBalance = async () => {
      setIsLoading(true);
      try {
        // Get all incomes and expenses
        const allIncomes = await getIncomes();
        const allExpenses = await getExpenses();
        
        // Calculate total income and expenses across all time
        const totalAllTimeIncome = allIncomes.reduce((sum, income) => sum + income.amount, 0);
        const totalAllTimeExpenses = allExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        // Calculate net balance (total income - total expenses)
        const totalNetBalance = totalAllTimeIncome - totalAllTimeExpenses;
        
        // Update state
        setAllTimeIncome(totalAllTimeIncome);
        setAllTimeExpenses(totalAllTimeExpenses);
        setNetBalance(totalNetBalance);
      } catch (error) {
        console.error('Error calculating net balance:', error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateNetBalance();
  }, [totalIncome, totalExpenses]); // Recalculate whenever totalIncome or totalExpenses changes

  const isPositive = netBalance >= 0;

  return (
    <Card className="border-t-4" style={{ borderTopColor: isPositive ? '#10b981' : '#ef4444' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Net Balance</CardTitle>
        <p className="text-sm text-muted-foreground">All Time</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-20 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Calculating balance...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className={`text-3xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(netBalance)}
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-center">
                <ArrowUp className="mr-1 h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  Income: <span className="font-medium text-green-500">{formatCurrency(allTimeIncome)}</span>
                </span>
              </div>
              
              <div className="flex items-center">
                <ArrowDown className="mr-1 h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">
                  Expenses: <span className="font-medium text-red-500">{formatCurrency(allTimeExpenses)}</span>
                </span>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
              {timeframe}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NetBalanceDisplay;
