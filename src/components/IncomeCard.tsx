
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { Income } from '@/types';
import { deleteTransaction } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface IncomeCardProps {
  income: Income;
  onEdit: (income: Income) => void;
  onDelete: () => void;
}

const IncomeCard: React.FC<IncomeCardProps> = ({ income, onEdit, onDelete }) => {
  const handleDelete = async () => {
    try {
      // Fixed: Pass type 'income' as the second argument
      await deleteTransaction(income.id, 'income');
      onDelete();
      toast({
        title: 'Income deleted',
        description: 'The income has been removed successfully',
      });
    } catch (error) {
      console.error('Error deleting income:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete income. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formattedDate = new Date(income.date).toLocaleDateString();
  const formattedAmount = formatCurrency(income.amount, income.currency);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{income.merchantName}</span>
          <span className="text-green-600 font-semibold whitespace-nowrap">{formattedAmount}</span>
        </CardTitle>
        <CardDescription>{formattedDate}</CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="grid gap-1">
          <div className="text-sm">
            <span className="font-medium">Category:</span> {income.category}
          </div>
          
          {income.paymentMethod && (
            <div className="text-sm">
              <span className="font-medium">Payment Method:</span> {income.paymentMethod}
            </div>
          )}
          
          {income.notes && (
            <div className="text-sm">
              <span className="font-medium">Notes:</span> {income.notes}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-2">
        <div className="flex justify-between w-full">
          <Button variant="outline" size="sm" onClick={() => onEdit(income)}>
            <Pencil className="mr-1 h-3 w-3" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-1 h-3 w-3" /> Delete
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default IncomeCard;
