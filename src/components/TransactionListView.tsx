import React from 'react';
import { Transaction, Expense, Income } from '@/types';
import { formatCurrency } from '@/lib/currency-formatter';
import { formatDate } from '@/lib/date-formatter';
import { getCategoryIcon } from '@/lib/category-icons';
import { CategoryIconName, categoryIconMap } from '@/lib/category-icons';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface TransactionListViewProps {
  transactions: (Expense | Income)[];
  onTransactionClick: (item: Expense | Income) => void;
  categoryIcons: Record<string, CategoryIconName>;
  categoryColors: Record<string, string>;
}

const normalizeCategoryKey = (category: string) =>
  (category || '').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-').trim();

const TransactionListView: React.FC<TransactionListViewProps> = ({ 
  transactions, 
  onTransactionClick,
  categoryIcons = {},
  categoryColors = {}
}) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No transactions to display
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((item, index) => {
        const isIncome = item.type === 'income';
        const key = normalizeCategoryKey(item.category);
        const hasCustomIcon = Object.prototype.hasOwnProperty.call(categoryIcons, key);
        const hasCustomColor = Object.prototype.hasOwnProperty.call(categoryColors, key);
        const categoryColor = hasCustomColor ? categoryColors[key] : (isIncome ? '#10b981' : '#ef4444');
        const CategoryIcon = hasCustomIcon
          ? (categoryIconMap[categoryIcons[key]] || categoryIconMap.DollarSign)
          : getCategoryIcon(key);
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="force-refresh-animation"
            onClick={() => onTransactionClick(item)}
          >
            <div className="flex items-center p-4 rounded-xl bg-card hover:bg-accent/10 transition-all duration-200 cursor-pointer border shadow-sm hover:shadow-md">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: `${categoryColor}20` }}>
                <CategoryIcon className="h-5 w-5" style={{ color: categoryColor }} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {item.merchantName}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>{formatDate(new Date(item.date))}</span>
                  {item.paymentMethod && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground"></span>
                      <span className="truncate">{item.paymentMethod}</span>
                    </>
                  )}
                </div>
              </div>
              
              <p className={cn(
                "font-medium text-right pl-3 text-lg",
                item.type === 'income' ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-400"
              )}>
                {item.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(item.amount), item.currency)}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default TransactionListView;
