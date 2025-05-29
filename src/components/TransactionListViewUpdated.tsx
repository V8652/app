import React, { useState, useEffect } from 'react';
import { Expense, Income } from '@/types';
import { getUserCategories } from '@/lib/db';
import { getCategoryIcon, CategoryIconName, categoryIconMap } from '@/lib/category-icons';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ChevronUp, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { deleteTransaction } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TransactionListViewProps {
  transactions: (Expense | Income)[];
  onEdit?: (transaction: Expense | Income) => void;
  onDelete?: (transaction: Expense | Income) => Promise<void>;
}

const TransactionListViewUpdated: React.FC<TransactionListViewProps> = ({ transactions, onEdit, onDelete }) => {
  const [sortedTransactions, setSortedTransactions] = useState<(Expense | Income)[]>([]);
  const [sortKey, setSortKey] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [categoryIcons, setCategoryIcons] = useState<Record<string, CategoryIconName>>({});
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});

  // Load custom category icons and colors
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

  // Initial load of category data
  useEffect(() => {
    loadCategoryData();
  }, []);

  // Listen for category changes
  useEffect(() => {
    const handleCategoryChange = () => {
      loadCategoryData();
    };

    const unsubscribeCategory = dbEvents.subscribe(DatabaseEvent.CATEGORY_UPDATED, handleCategoryChange);
    const unsubscribeData = dbEvents.subscribe(DatabaseEvent.DATA_IMPORTED, handleCategoryChange);
    const unsubscribeUI = dbEvents.subscribe(DatabaseEvent.UI_REFRESH_NEEDED, handleCategoryChange);

    return () => {
      unsubscribeCategory();
      unsubscribeData();
      unsubscribeUI();
    };
  }, []);

  useEffect(() => {
    // Force re-render when transactions change
    setRefreshTrigger(prev => prev + 1);
  }, [transactions]);

  useEffect(() => {
    const sortTransactions = () => {
      const sorted = [...transactions].sort((a, b) => {
        const order = sortOrder === 'asc' ? 1 : -1;
        if (sortKey === 'date') {
          return order * (new Date(a.date).getTime() - new Date(b.date).getTime());
        } else if (sortKey === 'amount') {
          return order * (a.amount - b.amount);
        }
        return 0;
      });
      setSortedTransactions(sorted);
    };

    sortTransactions();
  }, [transactions, sortKey, sortOrder, refreshTrigger]);

  const handleSort = (key: 'date' | 'amount') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const handleDelete = async (transaction: Expense | Income) => {
    try {
      await deleteTransaction(transaction.id);
      
      toast({
        title: 'Transaction deleted',
        description: 'The transaction has been removed successfully',
      });
      
      // Emit multiple events to ensure UI updates everywhere
      setTimeout(() => {
        dbEvents.emit(DatabaseEvent.TRANSACTION_DELETED);
        dbEvents.emit(DatabaseEvent.DATA_IMPORTED);
        dbEvents.emit(DatabaseEvent.BALANCE_UPDATED);
        dbEvents.emit(DatabaseEvent.UI_REFRESH_NEEDED);
        
        // Call parent onDelete callback if provided
        if (onDelete) {
          onDelete(transaction);
        }
      }, 100);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete transaction. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Get category icon and color with fallbacks
  const getCategoryData = (category: string, isIncome: boolean) => {
    const categoryColor = categoryColors[category] || 
      (isIncome ? '#10b981' : '#ef4444');
    
    const CategoryIcon = categoryIcons[category] 
      ? categoryIconMap[categoryIcons[category]] || categoryIconMap.DollarSign
      : getCategoryIcon(category);

    return { categoryColor, CategoryIcon };
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border force-refresh-animation shadow-sm bg-card" key={`transaction-list-${refreshTrigger}`}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/40">
              <TableHead 
                onClick={() => handleSort('date')} 
                className="w-[130px] cursor-pointer hover:text-primary transition-colors"
              >
                <div className="flex items-center">
                  Date
                  {sortKey === 'date' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead className="max-w-[200px]">
                Description
              </TableHead>
              <TableHead 
                onClick={() => handleSort('amount')} 
                className="w-[130px] cursor-pointer hover:text-primary transition-colors"
              >
                <div className="flex items-center">
                  Amount
                  {sortKey === 'amount' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead className="w-[120px]">
                Category
              </TableHead>
              <TableHead className="w-[80px]">
                Type
              </TableHead>
              <TableHead className="w-[100px] text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {sortedTransactions.map((transaction, index) => {
                const isIncome = transaction.type === 'income';
                const { categoryColor, CategoryIcon } = getCategoryData(transaction.category, isIncome);

                return (
                  <motion.tr
                    key={`${transaction.id}-${refreshTrigger}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-muted/20 cursor-pointer"
                    onClick={() => onEdit && onEdit(transaction)}
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(transaction.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      <div className="flex items-center gap-2">
                        <div 
                          className="p-1 rounded-full"
                          style={{ backgroundColor: `${categoryColor}20` }}
                        >
                          <CategoryIcon className="h-4 w-4" style={{ color: categoryColor }} />
                        </div>
                        <span className="font-medium truncate">
                          {transaction.merchantName}
                        </span>
                      </div>
                      {/* Only show notes if not empty and not auto-extracted */}
                      {transaction.notes && transaction.notes.trim() !== '' && !transaction.notes.startsWith('Auto-extracted from SMS. Bank:') && (
                        <div className="text-xs text-muted-foreground mt-1">{transaction.notes}</div>
                      )}
                    </TableCell>
                    <TableCell className={isIncome ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                      <div className="flex items-center">
                        {isIncome ?
                          <ArrowUp className="h-3 w-3 mr-1" /> :
                          <ArrowDown className="h-3 w-3 mr-1" />
                        }
                        {/* Always show minus for expense */}
                        {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span 
                          className="px-2 py-1 text-xs rounded-full"
                          style={{ 
                            backgroundColor: `${categoryColor}20`,
                            color: categoryColor
                          }}
                        >
                          {transaction.category}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        isIncome ?
                          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {isIncome ? 'Income' : 'Expense'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {onEdit && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(transaction);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        )}
                        {onDelete && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(transaction);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </TableBody>
          {/* --- Merchant Extraction Patterns UI (for settings or rule editor, not for transaction list) --- */}
          {/* <div className="mt-4">
            <label className="block font-medium mb-1">Merchant Extraction Patterns</label>
            {merchantPatterns.map((pattern, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={pattern}
                  onChange={e => handleMerchantPatternChange(idx, e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Enter merchant regex pattern"
                />
                <Button variant="destructive" size="icon" onClick={() => removeMerchantPattern(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addMerchantPattern}>
              + Add Pattern
            </Button>
          </div> */}
        </Table>
      </div>
    </div>
  );
};

export default TransactionListViewUpdated;
