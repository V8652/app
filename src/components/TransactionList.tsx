import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Transaction } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { getTransactionsByDateRange, getUserCategories } from '@/lib/db';
import TransactionDetails from './TransactionDetails';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { getCategoryIcon, CategoryIconName, categoryIconMap } from '@/lib/category-icons';

interface TransactionListProps {
  dateRange: { from: Date; to: Date };
  filter?: string;
}

const TransactionList = ({ dateRange, filter }: TransactionListProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [deletedTransactionId, setDeletedTransactionId] = useState<string | null>(null);
  const [categoryIcons, setCategoryIcons] = useState<Record<string, CategoryIconName>>({});
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});

  // Initialize expanded state for new groups
  const initializeExpandedState = useCallback((newTransactions: Transaction[]) => {
    const newGroups = new Set(newTransactions.map(t => new Date(t.date).toDateString()));
    setExpandedGroups(prev => {
      const updated = { ...prev };
      newGroups.forEach(date => {
        if (updated[date] === undefined) {
          updated[date] = true; // Default to expanded
        }
      });
      return updated;
    });
  }, []);

  // Memoize the loadTransactions function to prevent unnecessary re-renders
  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const from = dateRange.from;
      const to = dateRange.to;
      // Add one day to the end date to include transactions on the end date
      to.setDate(to.getDate() + 1);
      
      const results = await getTransactionsByDateRange(from.toISOString(), to.toISOString());
      let filtered = results;
      
      // Apply category filter if provided
      if (filter && filter !== 'all') {
        filtered = results.filter(transaction => transaction.category === filter);
      }
      
      setTransactions(filtered);
      initializeExpandedState(filtered);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, filter, initializeExpandedState]);

  // Memoize grouped transactions to prevent unnecessary recalculations
  const groupedTransactions = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });
    
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
      .map(([date, txns]) => ({
        date: new Date(date),
        transactions: txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }));
  }, [transactions]);

  // Helper to normalize category key
  const normalizeCategoryKey = (category: string) =>
    (category || '').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-').trim();

  const loadCategoryData = async () => {
    try {
      const userCategories = await getUserCategories();
      // Normalize keys for icons
      const icons: Record<string, CategoryIconName> = {};
      Object.entries(userCategories.categoryIcons || {}).forEach(([key, value]) => {
        icons[normalizeCategoryKey(key)] = value as CategoryIconName;
      });
      setCategoryIcons(icons);

      // Normalize keys for colors
      const colors: Record<string, string> = {};
      Object.entries(userCategories.categoryColors || {}).forEach(([key, value]) => {
        colors[normalizeCategoryKey(key)] = value;
      });
      setCategoryColors(colors);
    } catch (error) {
      console.error('Error loading category data:', error);
    }
  };

  useEffect(() => {
    loadTransactions();
    loadCategoryData();
    
    // Subscribe to relevant database events
    const unsubscribeAdd = dbEvents.subscribe(DatabaseEvent.TRANSACTION_ADDED, loadTransactions);
    const unsubscribeUpdate = dbEvents.subscribe(DatabaseEvent.TRANSACTION_UPDATED, loadTransactions);
    const unsubscribeDelete = dbEvents.subscribe(DatabaseEvent.TRANSACTION_DELETED, () => {
      // Optimistically update the UI without reloading all transactions
      if (deletedTransactionId) {
        setTransactions(prev => {
          const updated = prev.filter(t => t.id !== deletedTransactionId);
          // Preserve expanded state for all groups
          const updatedGroups = new Set(updated.map(t => new Date(t.date).toDateString()));
          setExpandedGroups(prev => {
            const newState = { ...prev };
            // Keep existing expanded states
            Object.keys(newState).forEach(date => {
              if (!updatedGroups.has(date)) {
                delete newState[date];
              }
            });
            return newState;
          });
          return updated;
        });
        setDeletedTransactionId(null);
      }
    });
    const unsubscribeImport = dbEvents.subscribe(DatabaseEvent.DATA_IMPORTED, loadTransactions);
    const unsubscribeRefresh = dbEvents.subscribe(DatabaseEvent.TRANSACTION_LIST_REFRESH, loadTransactions);
    
    // Listen for category changes
    const handleCategoryChange = () => {
      loadCategoryData();
    };
    const unsubscribeCategory = dbEvents.subscribe(DatabaseEvent.CATEGORY_UPDATED, handleCategoryChange);
    const unsubscribeData = dbEvents.subscribe(DatabaseEvent.DATA_IMPORTED, handleCategoryChange);
    const unsubscribeUI = dbEvents.subscribe(DatabaseEvent.UI_REFRESH_NEEDED, handleCategoryChange);
    
    return () => {
      unsubscribeAdd();
      unsubscribeUpdate();
      unsubscribeDelete();
      unsubscribeImport();
      unsubscribeRefresh();
      unsubscribeCategory();
      unsubscribeData();
      unsubscribeUI();
    };
  }, [loadTransactions, deletedTransactionId]);

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };
  
  const handleDelete = (transactionId: string) => {
    setDeletedTransactionId(transactionId);
    // Emit balance update event immediately for real-time updates
    dbEvents.emit(DatabaseEvent.BALANCE_UPDATED);
  };

  const toggleGroup = (dateKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(Math.abs(amount));
  };

  const getCategoryData = (category: string, isIncome: boolean) => {
    const key = normalizeCategoryKey(category);
    const categoryColor = categoryColors[key] || (isIncome ? '#10b981' : '#ef4444');
    // Try custom icon, else use getCategoryIcon with normalized key
    const CategoryIcon = categoryIcons[key]
      ? categoryIconMap[categoryIcons[key]] || categoryIconMap.DollarSign
      : getCategoryIcon(key); // use normalized key here
    return { categoryColor, CategoryIcon };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-2">
            <div className="h-6 bg-secondary animate-pulse rounded"></div>
            <div className="h-20 bg-secondary animate-pulse rounded"></div>
            <div className="h-6 bg-secondary animate-pulse rounded"></div>
            <div className="h-20 bg-secondary animate-pulse rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No transactions found for this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groupedTransactions.map(group => {
        const dateKey = group.date.toISOString();
        const isExpanded = expandedGroups[dateKey] !== false; // Default to expanded

        return (
          <div key={dateKey}>
            <div 
              className="flex items-center justify-between mb-2 cursor-pointer"
              onClick={() => toggleGroup(dateKey)}
            >
              <h3 className="text-sm font-medium">
                {formatDistanceToNow(group.date, { addSuffix: true })}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardContent className="p-0">
                      <ul className="divide-y">
                        {group.transactions.map(transaction => {
                          const isIncome = transaction.amount > 0 || transaction.type === 'income';
                          const { categoryColor, CategoryIcon } = getCategoryData(transaction.category, isIncome);
                          return (
                            <motion.li 
                              key={transaction.id}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="p-4 cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => handleTransactionClick(transaction)}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                                    style={{
                                      backgroundColor: `${categoryColor}20`,
                                      color: categoryColor,
                                      minWidth: 32,
                                      minHeight: 24,
                                    }}
                                  >
                                    <CategoryIcon className="h-4 w-4" style={{ color: categoryColor }} />
                                    {transaction.category?.replace(/-/g, ' ') || 'Uncategorized'}
                                  </span>
                                  <div>
                                    <p className="font-medium">{transaction.merchantName}</p>
                                  </div>
                                </div>
                                <div className={`text-right ${transaction.amount < 0 ? 'text-destructive' : 'text-green-500'}`}> 
                                  <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                                  {transaction.paymentMethod && (
                                    <p className="text-xs text-muted-foreground">{transaction.paymentMethod}</p>
                                  )}
                                </div>
                              </div>
                            </motion.li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      
      <TransactionDetails 
        transaction={selectedTransaction} 
        isOpen={isModalOpen} 
        onClose={handleClose}
        onDelete={() => selectedTransaction && handleDelete(selectedTransaction.id)}
        categoryIcons={categoryIcons || {}}
        categoryColors={categoryColors || {}}
      />
    </div>
  );
};

export default TransactionList;
