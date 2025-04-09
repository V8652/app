
import { Expense } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { 
  ShoppingBag, Utensils, Home, Car, Monitor, 
  Zap, Heart, Plane, School, Wallet, Bookmark
} from 'lucide-react';
import { getUserCategories } from '@/lib/db';
import { useEffect, useState } from 'react';

// Category Icon mapping
const CategoryIcons: Record<string, React.ReactNode> = {
  groceries: <ShoppingBag size={16} />,
  utilities: <Zap size={16} />,
  entertainment: <Monitor size={16} />,
  transportation: <Car size={16} />,
  dining: <Utensils size={16} />,
  shopping: <ShoppingBag size={16} />,
  health: <Heart size={16} />,
  travel: <Plane size={16} />,
  housing: <Home size={16} />,
  education: <School size={16} />,
  subscriptions: <Bookmark size={16} />,
  other: <Wallet size={16} />
};

// Default category background colors
const DefaultCategoryColors: Record<string, string> = {
  groceries: 'bg-green-50 text-green-700',
  utilities: 'bg-blue-50 text-blue-700',
  entertainment: 'bg-purple-50 text-purple-700',
  transportation: 'bg-amber-50 text-amber-700',
  dining: 'bg-red-50 text-red-700',
  shopping: 'bg-indigo-50 text-indigo-700',
  health: 'bg-pink-50 text-pink-700',
  travel: 'bg-cyan-50 text-cyan-700',
  housing: 'bg-emerald-50 text-emerald-700',
  education: 'bg-orange-50 text-orange-700',
  subscriptions: 'bg-violet-50 text-violet-700',
  other: 'bg-gray-50 text-gray-700'
};

export interface ExpenseCardProps {
  expense: Expense;
  onClick?: () => void;
  onUpdate?: () => void;
}

const ExpenseCard = ({ expense, onClick, onUpdate }: ExpenseCardProps) => {
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  
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

  const {
    merchantName,
    amount,
    currency,
    date,
    category,
    paymentMethod,
    notes
  } = expense;

  const formattedDate = format(new Date(date), 'MMM d, yyyy');
  const timeAgo = formatDistanceToNow(new Date(date), { addSuffix: true });
  
  // Format currency (INR)
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const handleClick = () => {
    if (onClick) onClick();
  };
  
  // Get category color from user preferences or fall back to default
  const getCategoryColor = () => {
    const customColor = categoryColors[category];
    if (customColor) {
      return { 
        backgroundColor: customColor,
        color: '#fff'
      };
    }
    return {}; // Use default styling
  };
  
  // Get category badge class based on custom color or default
  const getCategoryBadgeClass = () => {
    if (categoryColors[category]) {
      return '';
    }
    return DefaultCategoryColors[category] || 'bg-gray-50 text-gray-700';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="md-ripple"
    >
      <Card className="android-card border-l-4" style={{ borderLeftColor: categoryColors[category] || `var(--${category}-color, var(--primary))` }}>
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {notes && (
                <p className="text-base font-medium text-foreground mb-1 line-clamp-2">{notes}</p>
              )}
              <h3 className="text-sm text-muted-foreground truncate">{merchantName}</h3>
              <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-lg font-semibold text-foreground">
                {formatCurrency(amount, currency)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div 
              className={`flex items-center rounded-full px-2 py-1 text-xs ${getCategoryBadgeClass()}`}
              style={getCategoryColor()}
            >
              <span className="mr-1">{CategoryIcons[category]}</span>
              <span className="capitalize">{category.replace(/-/g, ' ')}</span>
            </div>
            
            {paymentMethod && (
              <span className="text-xs bg-secondary px-2 py-1 rounded-full text-muted-foreground">
                {paymentMethod}
              </span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default ExpenseCard;
