import React, { useEffect, useState } from 'react';
import { Expense, Income } from '@/types';
import { deleteTransaction, getUserCategories } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';
import { Trash2, CreditCard, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { getCategoryIcon, CategoryIconName, categoryIconMap } from '@/lib/category-icons';

interface TransactionCardViewProps {
  transaction: (Expense | Income | null) | (Expense | Income)[];
  transactionType: string;
  onEdit: (transaction: Expense | Income) => void;
  onDelete: () => Promise<void>;
  categoryColors: Record<string, string>;
}

const TransactionCardView: React.FC<TransactionCardViewProps> = ({
  transaction,
  transactionType,
  onEdit,
  onDelete,
  categoryColors,
}) => {
  const [categoryIcons, setCategoryIcons] = useState<Record<string, CategoryIconName>>({});
  const [localTransactions, setLocalTransactions] = useState<Array<Expense | Income>>(
    Array.isArray(transaction) ? transaction : (transaction ? [transaction] : [])
  );

  // Sync localTransactions with prop changes
  useEffect(() => {
    setLocalTransactions(Array.isArray(transaction) ? transaction : (transaction ? [transaction] : []));
  }, [transaction]);

  // Load custom category icons
  useEffect(() => {
    const loadCategoryIcons = async () => {
      try {
        const userCategories = await getUserCategories();
        if (userCategories.categoryIcons) {
          setCategoryIcons(userCategories.categoryIcons as Record<string, CategoryIconName>);
        }
      } catch (error) {
        console.error('Error loading category icons:', error);
      }
    };
    
    loadCategoryIcons();
  }, []);

  const handleDelete = async (transaction: Expense | Income, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await deleteTransaction(transaction.id);
      setLocalTransactions((prev) => prev.filter((t) => t.id !== transaction.id)); // Optimistic update
      dbEvents.emit(DatabaseEvent.TRANSACTION_DELETED);
      dbEvents.emit(DatabaseEvent.DATA_IMPORTED);
      dbEvents.emit(DatabaseEvent.BALANCE_UPDATED);
      dbEvents.emit(DatabaseEvent.UI_REFRESH_NEEDED);
      dbEvents.emit(DatabaseEvent.TRANSACTION_LIST_REFRESH);
      toast({
        title: 'Transaction deleted',
        description: 'The transaction has been successfully removed',
      });
      if (onDelete) {
        await onDelete();
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete transaction. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (localTransactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No transactions to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 force-refresh-animation">
      {localTransactions.map((item) => (
        <SingleTransactionCard
          key={item.id}
          transaction={item}
          onEdit={onEdit}
          onDelete={handleDelete}
          categoryColors={categoryColors}
          categoryIcons={categoryIcons}
        />
      ))}
    </div>
  );
};

const normalizeCategoryKey = (category: string) =>
  (category || '').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-').trim();

const SingleTransactionCard = ({
  transaction,
  onEdit,
  onDelete,
  categoryColors,
  categoryIcons,
}: {
  transaction: Expense | Income;
  onEdit: (transaction: Expense | Income) => void;
  onDelete: (transaction: Expense | Income, e?: React.MouseEvent) => Promise<void>;
  categoryColors: Record<string, string>;
  categoryIcons: Record<string, CategoryIconName>;
}) => {
  const controls = useAnimation();
  const [isDragging, setIsDragging] = useState(false);
  const isIncome = transaction.type === 'income';

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = -100;
    setIsDragging(false);
    if (info.offset.x < threshold) {
      controls.start({ x: -200, opacity: 0 });
      await onDelete(transaction);
    } else {
      controls.start({ x: 0 });
    }
  };

  const formattedDate = new Date(transaction.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const formattedAmount = formatCurrency(Math.abs(transaction.amount), transaction.currency);
  const key = normalizeCategoryKey(transaction.category);
  const hasCustomIcon = Object.prototype.hasOwnProperty.call(categoryIcons, key);
  const hasCustomColor = Object.prototype.hasOwnProperty.call(categoryColors, key);
  const categoryColor = hasCustomColor ? categoryColors[key] : (isIncome ? '#10b981' : '#ef4444');
  const CategoryIcon = hasCustomIcon
    ? (categoryIconMap[categoryIcons[key]] || categoryIconMap.DollarSign)
    : getCategoryIcon(key);
  
  // Format category name with first letter capitalized
  const formatCategoryName = (category: string): string => {
    if (!category) return 'Uncategorized';
    
    // Handle hyphenated categories like 'credit-card'
    if (category.includes('-')) {
      return category.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <motion.div
      animate={controls}
      drag="x"
      dragConstraints={{ left: -200, right: 0 }}
      dragElastic={0.5}
      onDragEnd={handleDragEnd}
      onClick={() => !isDragging && onEdit(transaction)}
      onDragStart={() => setIsDragging(true)}
      className="relative"
    >
      {/* Delete button background */}
      <div className="absolute inset-y-0 right-0 w-16 bg-red-500 flex items-center justify-center rounded-r-lg">
        <Trash2 className="h-5 w-5 text-white" />
      </div>

      {/* Card content */}
      <motion.div
        className="bg-card rounded-lg p-4 cursor-pointer relative z-10"
        whileHover={{ scale: isDragging ? 1 : 1.01 }}
        style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="p-2 rounded-full"
              style={{ backgroundColor: `${categoryColor}20` }}
            >
              <CategoryIcon className="h-5 w-5" style={{ color: categoryColor }} />
            </div>
            <div>
              <h3 className="font-medium">{transaction.notes || transaction.merchantName}</h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formattedDate}</span>
                {transaction.paymentMethod && (
                  <>
                    <span>•</span>
                    <CreditCard className="h-3 w-3" />
                    <span>{transaction.paymentMethod}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className={isIncome ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
            {formattedAmount}
          </div>
          {/* Visible Delete Button */}
          <Button
            variant="destructive"
            size="icon"
            className="ml-2"
            aria-label="Delete transaction"
            onClick={(e) => onDelete(transaction, e)}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TransactionCardView;
