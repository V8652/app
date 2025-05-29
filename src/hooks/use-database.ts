import { useState, useEffect, useCallback, useMemo } from 'react';
import { Expense, Income, Transaction } from '@/types';
import { 
  getExpenses, 
  getIncomes, 
  getExpensesByDateRange, 
  getIncomesByDateRange,
  getFinancialSummary
} from '@/lib/db';
import { dbEvents, DatabaseEvent, useDbEvents, useMultipleDbEvents } from '@/lib/db-event';

interface UseTransactionsOptions {
  timeframe?: 'week' | 'month' | 'all' | 'custom';
  dateRange?: { from: Date, to: Date };
  autoRefresh?: boolean;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const { timeframe = 'month', dateRange, autoRefresh = true } = options;
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [summary, setSummary] = useState({
    totalExpenses: 0,
    totalIncome: 0,
    balance: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    console.log('Explicitly refreshing transactions data');
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleDatabaseChange = useCallback(() => {
    console.log('Database change detected in useTransactions hook, refreshing');
    setRefreshKey(prev => prev + 1);
  }, []);

  const loadData = useCallback(async () => {
    console.log('Loading data in useTransactions with timeframe:', timeframe);
    setIsLoading(true);
    setError(null);
    
    try {
      let expensesResult: Expense[];
      let incomesResult: Income[];
      let startDate: string | undefined;
      let endDate: string | undefined;
      
      if (timeframe === 'week') {
        const today = new Date();
        const firstDay = new Date(today);
        firstDay.setDate(today.getDate() - today.getDay());
        const lastDay = new Date(today);
        lastDay.setDate(today.getDate() + (6 - today.getDay()));
        
        startDate = firstDay.toISOString();
        endDate = lastDay.toISOString();
        
        expensesResult = await getExpensesByDateRange(startDate, endDate);
        incomesResult = await getIncomesByDateRange(startDate, endDate);
      } else if (timeframe === 'month') {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        startDate = firstDay.toISOString();
        endDate = lastDay.toISOString();
        
        expensesResult = await getExpensesByDateRange(startDate, endDate);
        incomesResult = await getIncomesByDateRange(startDate, endDate);
      } else if (timeframe === 'custom' && dateRange) {
        startDate = dateRange.from.toISOString();
        endDate = dateRange.to.toISOString();
        
        expensesResult = await getExpensesByDateRange(startDate, endDate);
        incomesResult = await getIncomesByDateRange(startDate, endDate);
      } else {
        expensesResult = await getExpenses();
        incomesResult = await getIncomes();
      }
      
      const financialSummary = (startDate && endDate) 
        ? await getFinancialSummary(startDate, endDate) 
        : await getFinancialSummary();
      
      expensesResult.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      incomesResult.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setExpenses(expensesResult);
      setIncomes(incomesResult);
      setSummary(financialSummary);
      
      dbEvents.emit(DatabaseEvent.BALANCE_UPDATED);
      
      console.log('useTransactions loaded data:', {
        expenses: expensesResult.length,
        incomes: incomesResult.length,
        financialSummary
      });
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, dateRange]);

  useMultipleDbEvents([
    [DatabaseEvent.TRANSACTION_ADDED, handleDatabaseChange],
    [DatabaseEvent.TRANSACTION_UPDATED, handleDatabaseChange],
    [DatabaseEvent.TRANSACTION_DELETED, handleDatabaseChange],
    [DatabaseEvent.DATA_IMPORTED, handleDatabaseChange],
    [DatabaseEvent.GMAIL_SCAN_COMPLETED, handleDatabaseChange],
    [DatabaseEvent.BALANCE_UPDATED, handleDatabaseChange],
    [DatabaseEvent.USER_PREFERENCES_UPDATED, handleDatabaseChange],
  ]);

  useEffect(() => {
    if (autoRefresh || refreshKey > 0) {
      loadData();
    }
  }, [autoRefresh, loadData, refreshKey]);

  const allTransactions = useMemo(() => {
    return [...expenses, ...incomes].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [expenses, incomes]);

  return {
    expenses,
    incomes,
    summary,
    isLoading,
    error,
    refresh,
    allTransactions,
  };
}

export function useTransaction(id: string, type: 'expense' | 'income') {
  const [transaction, setTransaction] = useState<Expense | Income | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const fetchTransaction = useCallback(async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { getExpense, getIncome } = await import('@/lib/db');
      
      const result = type === 'expense' 
        ? await getExpense(id)
        : await getIncome(id);
      
      setTransaction(result || null);
    } catch (err) {
      console.error(`Error fetching ${type}:`, err);
      setError(err instanceof Error ? err : new Error(`Failed to load ${type}`));
    } finally {
      setIsLoading(false);
    }
  }, [id, type]);
  
  const handleTransactionChange = useCallback(() => {
    console.log(`Refreshing transaction ${id} due to database change`);
    setRefreshKey(prev => prev + 1);
  }, [id]);
  
  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction, refreshKey]);
  
  useMultipleDbEvents([
    [DatabaseEvent.TRANSACTION_ADDED, handleTransactionChange],
    [DatabaseEvent.TRANSACTION_UPDATED, handleTransactionChange],
    [DatabaseEvent.TRANSACTION_DELETED, handleTransactionChange],
    [DatabaseEvent.DATA_IMPORTED, handleTransactionChange],
  ]);
  
  return { 
    transaction, 
    isLoading, 
    error, 
    refresh: () => setRefreshKey(prev => prev + 1)
  };
}

export function useBalanceMonitor() {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const fetchBalance = useCallback(async () => {
    setIsLoading(true);
    try {
      const summary = await getFinancialSummary();
      setBalance(summary.balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBalanceChange = useCallback(() => {
    console.log('Balance change detected');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useMultipleDbEvents([
    [DatabaseEvent.BALANCE_UPDATED, handleBalanceChange],
    [DatabaseEvent.TRANSACTION_ADDED, handleBalanceChange],
    [DatabaseEvent.TRANSACTION_UPDATED, handleBalanceChange],
    [DatabaseEvent.TRANSACTION_DELETED, handleBalanceChange],
    [DatabaseEvent.DATA_IMPORTED, handleBalanceChange],
  ]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance, refreshTrigger]);

  return { balance, isLoading, refresh: () => setRefreshTrigger(prev => prev + 1) };
}
