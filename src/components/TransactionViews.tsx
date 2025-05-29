import { useState, useMemo, useEffect, useRef } from 'react';
import { Expense, Income } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Tag, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { getUserCategories, getExpenses, getIncomes } from '@/lib/db';
import { format, isToday, isYesterday } from 'date-fns';
import TransactionCardView from './TransactionCardView';
import ExpenseEditForm from '@/components/ExpenseEditForm';
import IncomeEditForm from '@/components/IncomeEditForm';
import { motion, AnimatePresence } from 'framer-motion';

interface TransactionViewsProps {
  expenses: Expense[];
  incomes: Income[];
  activeTab?: 'expenses' | 'income' | 'all';
  onTransactionChange?: () => void;
}

interface GroupedTransactions {
  date: Date;
  transactions: (Expense | Income)[];
}

const TransactionViews = ({
  expenses,
  incomes,
  activeTab = 'all',
  onTransactionChange
}: TransactionViewsProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'merchantName'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [isEditIncomeOpen, setIsEditIncomeOpen] = useState(false);
  const [localExpenses, setLocalExpenses] = useState<Expense[]>(expenses);
  const [localIncomes, setLocalIncomes] = useState<Income[]>(incomes);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [currentTab, setCurrentTab] = useState<'all' | 'income' | 'expenses'>(activeTab);
  const expandedDatesRef = useRef<Set<string>>(expandedDates);

  useEffect(() => {
    expandedDatesRef.current = expandedDates;
  }, [expandedDates]);

  useEffect(() => {
    setLocalExpenses(expenses);
    setLocalIncomes(incomes);
  }, [expenses, incomes]);

  const reloadData = async () => {
    try {
      console.log('Reloading transaction data after deletion');
      const [updatedExpenses, updatedIncomes] = await Promise.all([getExpenses(), getIncomes()]);
      setLocalExpenses(updatedExpenses);
      setLocalIncomes(updatedIncomes);
      setRefreshKey(prev => prev + 1);
      console.log('TransactionViews data reloaded after deletion');
      if (onTransactionChange) {
        onTransactionChange();
      }
    } catch (error) {
      console.error('Error reloading data:', error);
    }
  };

  const paymentMethods = useMemo(() => {
    const methodsSet = new Set<string>();
    [...localExpenses, ...localIncomes].forEach(transaction => {
      if (transaction.paymentMethod) {
        methodsSet.add(transaction.paymentMethod);
      }
    });
    return Array.from(methodsSet);
  }, [localExpenses, localIncomes]);

  useEffect(() => {
    const loadCategoryColors = async () => {
      try {
        const userCategories = await getUserCategories();
        if (userCategories.categoryColors) {
          setCategoryColors(userCategories.categoryColors);
        }
      } catch (error) {
        console.error('Error loading category colors:', error);
      }
    };
    loadCategoryColors();
  }, []);

  const filteredTransactions = useMemo(() => {
    let transactions: (Expense | Income)[] = [];
    if (currentTab === 'all') {
      transactions = [...localExpenses, ...localIncomes];
    } else {
      transactions = currentTab === 'income' ? localIncomes : localExpenses;
    }
    
    return transactions.filter(transaction => {
      // Apply category and payment method filters first
      const matchesCategoryFilter = categoryFilter === 'all' || 
        transaction.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchesPaymentMethod = paymentMethodFilter === 'all' || 
        transaction.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase();
      
      // If search term is empty, only apply category and payment method filters
      if (!searchTerm.trim()) {
        return matchesCategoryFilter && matchesPaymentMethod;
      }
      
      const searchLower = searchTerm.toLowerCase().trim();
      
      // Convert amount to string and remove any non-numeric characters for comparison
      const amountStr = Math.abs(transaction.amount).toString();
      const searchAmount = searchLower.replace(/[^0-9.]/g, '');
      
      // Check if search term matches amount (exact or partial numeric match)
      const matchesAmount = searchAmount && amountStr.includes(searchAmount);
      
      // Check if search term matches merchant name (case-insensitive partial match)
      const matchesMerchant = transaction.merchantName?.toLowerCase().includes(searchLower);
      
      // Check if search term matches notes (case-insensitive partial match)
      const matchesNotes = transaction.notes?.toLowerCase().includes(searchLower);
      
      // Check if search term matches category (case-insensitive partial match)
      const matchesCategory = transaction.category.toLowerCase().includes(searchLower);
      
      // Return true if any of the search criteria match AND category/payment method filters match
      return (matchesAmount || matchesMerchant || matchesNotes || matchesCategory) && 
             matchesCategoryFilter && 
             matchesPaymentMethod;
    }).sort((a, b) => {
      if (sortField === 'date') {
        return sortDirection === 'asc' ? 
          new Date(a.date).getTime() - new Date(b.date).getTime() : 
          new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortField === 'amount') {
        return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      } else {
        const aName = a.merchantName || '';
        const bName = b.merchantName || '';
        return sortDirection === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
      }
    });
  }, [currentTab, localExpenses, localIncomes, searchTerm, categoryFilter, paymentMethodFilter, sortField, sortDirection, refreshKey]);

  const groupTransactionsByDate = (transactions: (Expense | Income)[]): GroupedTransactions[] => {
    const groups: { [key: string]: (Expense | Income)[] } = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(transaction);
    });
    
    return Object.entries(groups)
      .map(([dateStr, transactions]) => ({
        date: new Date(dateStr),
        transactions: transactions.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const formatDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const groupedTransactions = useMemo(() => {
    const transactions = filteredTransactions;
    return groupTransactionsByDate(transactions);
  }, [filteredTransactions]);

  const toggleDateSection = (dateStr: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateStr)) {
        newSet.delete(dateStr);
      } else {
        newSet.add(dateStr);
      }
      return newSet;
    });
  };

  const renderCategoryOptions = () => {
    // Combine categories from both incomes and expenses
    const categories = new Set([
      ...localIncomes.map(income => income.category),
      ...localExpenses.map(expense => expense.category)
    ]);
    
    return <>
        <SelectItem value="all">All Categories</SelectItem>
      {Array.from(categories).sort().map(category => (
        <SelectItem key={category} value={category}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
        </SelectItem>
      ))}
      </>;
  };

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsEditExpenseOpen(true);
  };

  const handleIncomeClick = (income: Income) => {
    setSelectedIncome(income);
    setIsEditIncomeOpen(true);
  };

  const handleExpenseEditSave = async () => {
    setIsEditExpenseOpen(false);
    setSelectedExpense(null);
    await reloadData();
  };

  const handleIncomeEditSave = async () => {
    setIsEditIncomeOpen(false);
    setSelectedIncome(null);
    await reloadData();
  };

  // Remove a transaction from local state and update UI immediately
  const removeTransactionFromLocalState = (transactionId: string) => {
    if (currentTab === 'income') {
      setLocalIncomes(prev => prev.filter(t => t.id !== transactionId));
    } else {
      setLocalExpenses(prev => prev.filter(t => t.id !== transactionId));
    }
  };

  // Updated delete handler: receives transactionId, updates local state, preserves expandedDates
  const handleTransactionDelete = async (transactionId: string) => {
    removeTransactionFromLocalState(transactionId);
    if (onTransactionChange) onTransactionChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search transactions..." 
              className="pl-8 w-full" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          
          <Select value={currentTab} onValueChange={(value: 'expenses' | 'income' | 'all') => setCurrentTab(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expenses">Expenses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2 mt-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full">
              <Tag className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {renderCategoryOptions()}
            </SelectContent>
          </Select>
          
          {paymentMethods.length > 0 && (
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {paymentMethods.map(method => (
                  <SelectItem key={method} value={method}>{method}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {groupedTransactions.map(({ date, transactions }) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isExpanded = expandedDates.has(dateStr);

          // Calculate group totals
          const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
          const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

          return (
            <Card key={dateStr} className="overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50"
                onClick={() => toggleDateSection(dateStr)}
              >
                <div className="flex items-center space-x-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <h3 className="font-medium">{formatDate(date)}</h3>
                  <span className="text-muted-foreground">({transactions.length})</span>
                </div>
                <div className="flex gap-2 text-sm">
                  {totalIncome > 0 && (
                    <span className="text-green-500 font-semibold">
                      +{totalIncome.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                    </span>
                  )}
                  {totalExpenses > 0 && (
                    <span className="text-red-500 font-semibold">
                      -{totalExpenses.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
              </div>
              
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {transactions.map((transaction) => (
                          <TransactionCardView
                            key={transaction.id}
                            transaction={transaction}
                            transactionType={transaction.type}
                            onEdit={transaction.type === 'expense' ? handleExpenseClick : handleIncomeClick}
                            onDelete={async () => await handleTransactionDelete(transaction.id)}
                            categoryColors={categoryColors}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      {selectedExpense && <ExpenseEditForm expense={selectedExpense} isOpen={isEditExpenseOpen} onClose={() => setIsEditExpenseOpen(false)} onSave={handleExpenseEditSave} />}

      {selectedIncome && <IncomeEditForm income={selectedIncome} isOpen={isEditIncomeOpen} onClose={() => setIsEditIncomeOpen(false)} onSave={handleIncomeEditSave} />}
    </div>
  );
};

export default TransactionViews;
