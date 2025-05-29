import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Expense, Income } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Tag, Filter, ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';
import { formatCurrency } from '@/lib/utils';
import { getCategoryIcon, CategoryIconName, categoryIconMap } from '@/lib/category-icons';
import TransactionDetails from './TransactionDetails';
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ExpenseEditForm from './ExpenseEditForm';
import { getUserCategories } from '@/lib/db';

const normalizeCategoryKey = (category: string) =>
  (category || '').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-').trim();

const TransactionCard = React.memo(({ 
  transaction, 
  onView, 
  onEdit,
  categoryIcons,
  categoryColors
}: { 
  transaction: Expense | Income;
  onView: (transaction: Expense | Income) => void;
  onEdit: (transaction: Expense | Income) => void;
  categoryIcons: Record<string, CategoryIconName>;
  categoryColors: Record<string, string>;
}) => {
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0], [0.5, 1]);
  const deleteOpacity = useTransform(x, [-100, 0], [1, 0]);
  const editOpacity = useTransform(x, [0, 100], [0, 1]);

  const key = normalizeCategoryKey(transaction.category);
  const hasCustomIcon = Object.prototype.hasOwnProperty.call(categoryIcons, key);
  const hasCustomColor = Object.prototype.hasOwnProperty.call(categoryColors, key);
  const categoryColor = hasCustomColor ? categoryColors[key] : (transaction.type === 'income' ? '#10b981' : '#ef4444');
  const CategoryIcon = hasCustomIcon
    ? (categoryIconMap[categoryIcons[key]] || categoryIconMap.DollarSign)
    : getCategoryIcon(key);

  return (
    <motion.div
      key={transaction.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="relative"
      drag="x"
      dragControls={dragControls}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(event, info) => {
        if (info.offset.x < -50) {
          onView(transaction);
        } else if (info.offset.x > 50) {
          onEdit(transaction);
        }
      }}
      style={{ x, opacity }}
    >
      {/* Delete Action */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center"
        style={{ opacity: deleteOpacity }}
      >
        <Trash2 className="h-6 w-6 text-white" />
      </motion.div>

      {/* Edit Action */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-20 bg-blue-500 flex items-center justify-center"
        style={{ opacity: editOpacity }}
      >
        <Pencil className="h-6 w-6 text-white" />
      </motion.div>

      {/* Transaction Content */}
      <div
        className="p-4 cursor-pointer hover:bg-accent/50 bg-background"
        onClick={() => onView(transaction)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${categoryColor}20` }}>
              <CategoryIcon className="h-6 w-6" style={{ color: categoryColor }} />
            </div>
            <div>
              <span className="font-medium block">{transaction.notes && transaction.notes.trim() !== '' ? transaction.notes : transaction.merchantName}</span>
              {transaction.notes && transaction.notes.trim() !== '' && (
                <span className="text-xs text-muted-foreground capitalize block">
                  {transaction.merchantName}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className={`font-medium block ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
            </span>
            {transaction.paymentMethod && (
              <span className="text-xs text-muted-foreground block">{transaction.paymentMethod}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

TransactionCard.displayName = 'TransactionCard';

interface TransactionDashboardProps {
  expenses: Expense[];
  incomes: Income[];
  onTransactionChange?: () => void;
}

interface GroupedTransactions {
  date: Date;
  transactions: (Expense | Income)[];
  totalIncome: number;
  totalExpenses: number;
}

const TransactionDashboard: React.FC<TransactionDashboardProps> = ({
  expenses,
  incomes,
  onTransactionChange
}) => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expenses'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedTransaction, setSelectedTransaction] = useState<Expense | Income | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const scrollPositions = useRef<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingTransaction, setEditingTransaction] = useState<Expense | Income | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [categoryIcons, setCategoryIcons] = useState<Record<string, CategoryIconName>>({});
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadCategoryData = async () => {
      try {
        const userCategories = await getUserCategories();
        if (userCategories.categoryIcons) {
          setCategoryIcons(userCategories.categoryIcons as Record<string, CategoryIconName>);
        }
        if (userCategories.categoryColors) {
          setCategoryColors(userCategories.categoryColors);
        }
      } catch (error) {
        console.error('Error loading category data:', error);
      }
    };
    loadCategoryData();
  }, []);

  // Memoized filtered transactions
  const filteredTransactions = useMemo(() => {
    let transactions: (Expense | Income)[] = [];
    
    // Combine transactions based on active tab
    if (activeTab === 'all') {
      transactions = [...expenses, ...incomes];
    } else if (activeTab === 'expenses') {
      transactions = expenses;
    } else {
      transactions = incomes;
    }

    return transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.merchantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
      const matchesPaymentMethod = paymentMethodFilter === 'all' || transaction.paymentMethod === paymentMethodFilter;

      return matchesSearch && matchesCategory && matchesPaymentMethod;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, incomes, activeTab, searchTerm, categoryFilter, paymentMethodFilter]);

  // Memoized grouped transactions
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, GroupedTransactions> = {};
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      // Normalize date to midnight UTC
      const normalizedDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      const dateKey = normalizedDate.toISOString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: normalizedDate,
          transactions: [],
          totalIncome: 0,
          totalExpenses: 0
        };
      }
      
      groups[dateKey].transactions.push(transaction);
      if (transaction.type === 'income') {
        groups[dateKey].totalIncome += transaction.amount;
      } else {
        groups[dateKey].totalExpenses += transaction.amount;
      }
    });
    
    return Object.entries(groups)
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
      .map(([_, group]) => group);
  }, [filteredTransactions]);

  // Format date for display
  const formatDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  // Toggle group expansion
  const toggleGroup = useCallback((dateKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  }, []);

  // Handle transaction click
  const handleTransactionClick = useCallback((transaction: Expense | Income) => {
    setSelectedTransaction(transaction);
    setIsDetailsOpen(true);
  }, []);

  // Handle transaction delete
  const handleTransactionDelete = useCallback(async () => {
    if (selectedTransaction) {
      if (onTransactionChange) {
        onTransactionChange();
      }
      setIsDetailsOpen(false);
      setSelectedTransaction(null);
    }
  }, [selectedTransaction, onTransactionChange]);

  // Handle edit
  const handleEdit = useCallback((transaction: Expense | Income) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  }, []);

  // Handle edit save
  const handleEditSave = useCallback(() => {
    setIsEditDialogOpen(false);
    setEditingTransaction(null);
    if (onTransactionChange) {
      onTransactionChange();
    }
  }, [onTransactionChange]);

  // Preserve scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const visibleGroups = Array.from(expandedGroups);
      if (visibleGroups.length > 0) {
        scrollPositions.current[visibleGroups[0]] = scrollTop;
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [expandedGroups]);

  // Restore scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const visibleGroups = Array.from(expandedGroups);
    if (visibleGroups.length > 0) {
      const savedPosition = scrollPositions.current[visibleGroups[0]];
      if (savedPosition !== undefined) {
        container.scrollTop = savedPosition;
      }
    }
  }, [expandedGroups]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col space-y-2">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search transactions..." 
              className="pl-8" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={activeTab} onValueChange={(value: 'all' | 'income' | 'expenses') => setActiveTab(value)}>
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
        
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full">
              <Tag className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Array.from(new Set([...expenses, ...incomes].map(t => t.category))).map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
            <SelectTrigger className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {Array.from(new Set([...expenses, ...incomes].map(t => t.paymentMethod))).map(method => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transaction Groups */}
      <div ref={containerRef} className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
        <AnimatePresence>
          {groupedTransactions.map(group => {
            const dateKey = group.date.toISOString();
            const isExpanded = expandedGroups.has(dateKey);

            return (
              <motion.div
                key={dateKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50"
                    onClick={() => toggleGroup(dateKey)}
                  >
                    <div className="flex items-center space-x-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <h3 className="font-medium">{formatDate(group.date)}</h3>
                      <span className="text-muted-foreground">({group.transactions.length})</span>
                    </div>
                    <div className="flex gap-2 text-sm">
                      {group.totalIncome > 0 && (
                        <span className="text-green-500 font-semibold">
                          +{formatCurrency(group.totalIncome)}
                        </span>
                      )}
                      {group.totalExpenses > 0 && (
                        <span className="text-red-500 font-semibold">
                          -{formatCurrency(group.totalExpenses)}
                        </span>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CardContent className="p-0">
                          <div className="divide-y">
                            {group.transactions.map(transaction => (
                              <TransactionCard
                                key={transaction.id}
                                transaction={transaction}
                                onView={handleTransactionClick}
                                onEdit={handleEdit}
                                categoryIcons={categoryIcons}
                                categoryColors={categoryColors}
                              />
                            ))}
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Transaction Details Modal */}
      <TransactionDetails
        transaction={selectedTransaction}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTransaction(null);
        }}
        onDelete={handleTransactionDelete}
        categoryIcons={categoryIcons}
        categoryColors={categoryColors}
      />

      {/* Edit Transaction Dialog */}
      {editingTransaction && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
              <DialogDescription>
                Update the transaction details below
              </DialogDescription>
            </DialogHeader>
            
            <ExpenseEditForm
              expense={editingTransaction as Expense}
              isOpen={isEditDialogOpen}
              onClose={() => setIsEditDialogOpen(false)}
              onSave={handleEditSave}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TransactionDashboard; 