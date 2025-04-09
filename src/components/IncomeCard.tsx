
import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowDown, Edit, Trash, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { Income, IncomeCategory } from '@/types';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import IncomeForm from '@/components/IncomeForm';
import { updateTransaction, deleteTransaction } from '@/lib/db';
import { toast } from '@/hooks/use-toast';

// Income category icons and colors
const CATEGORY_CONFIG: Record<IncomeCategory, { color: string; icon: JSX.Element }> = {
  'salary': { color: 'bg-blue-500', icon: <DollarSign className="h-4 w-4" /> },
  'freelance': { color: 'bg-purple-500', icon: <DollarSign className="h-4 w-4" /> },
  'investment': { color: 'bg-green-500', icon: <ArrowDown className="h-4 w-4" /> },
  'gift': { color: 'bg-pink-500', icon: <DollarSign className="h-4 w-4" /> },
  'refund': { color: 'bg-yellow-500', icon: <ArrowDown className="h-4 w-4" /> },
  'other': { color: 'bg-gray-500', icon: <DollarSign className="h-4 w-4" /> },
};

interface IncomeCardProps {
  income: Income;
  onUpdate?: () => void;
}

const IncomeCard = ({ income, onUpdate }: IncomeCardProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Format currency (INR)
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleUpdateIncome = async (updatedIncome: Income) => {
    try {
      await updateTransaction(updatedIncome);
      toast({
        title: 'Income Updated',
        description: 'Your income has been successfully updated.',
      });
      setIsEditDialogOpen(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating income:', error);
      toast({
        title: 'Error Updating Income',
        description: 'Could not update your income. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteIncome = async () => {
    try {
      await deleteTransaction(income.id);
      toast({
        title: 'Income Deleted',
        description: 'Your income has been successfully deleted.',
      });
      setIsConfirmDeleteOpen(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting income:', error);
      toast({
        title: 'Error Deleting Income',
        description: 'Could not delete your income. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const categoryConfig = CATEGORY_CONFIG[income.category as IncomeCategory] || CATEGORY_CONFIG.other;
  
  // Safely format the date (handling both string and number types)
  const formatDate = (dateValue: string | number) => {
    const date = typeof dateValue === 'number' 
      ? new Date(dateValue) 
      : new Date(dateValue);
    return format(date, 'MMM d, yyyy');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card className="h-full hover:shadow-md transition-all duration-300 border-l-4 border-l-green-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-start space-x-2">
              <div className={`p-1.5 rounded-full ${categoryConfig.color} text-white`}>
                {categoryConfig.icon}
              </div>
              <div className="flex flex-col">
                {income.notes && (
                  <p className="text-base font-medium text-foreground line-clamp-2">{income.notes}</p>
                )}
                <h3 className="text-xs text-muted-foreground line-clamp-1">{income.merchantName}</h3>
              </div>
            </div>
            <Badge variant="success" className="h-6">Income</Badge>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-500">
                {formatCurrency(income.amount, income.currency)}
              </div>
              <div className="text-sm text-muted-foreground flex items-center space-x-2">
                <span>{formatDate(income.date)}</span>
                <span>•</span>
                <Badge variant="outline" className="capitalize">
                  {income.category}
                </Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <div className="flex justify-end space-x-2 w-full">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="h-8 px-2"
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-destructive hover:text-destructive h-8 px-2"
                onClick={() => setIsConfirmDeleteOpen(true)}
              >
                <Trash className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Income</DialogTitle>
          </DialogHeader>
          
          <IncomeForm 
            initialData={income}
            onSubmit={handleUpdateIncome}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this income entry? This action cannot be undone.</p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteIncome}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IncomeCard;
