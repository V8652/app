
import React, { useState } from 'react';
import { Expense, Income, Transaction } from '@/types';
import ExpenseEditForm from './ExpenseEditForm';
import IncomeEditForm from './IncomeEditForm';
import { Button } from './ui/button';
import { PencilIcon } from 'lucide-react';

interface EditableTransactionProps {
  transaction: Transaction;
  onTransactionUpdated: () => void;
}

export const EditableTransaction: React.FC<EditableTransactionProps> = ({ 
  transaction,
  onTransactionUpdated
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleEditClose = () => {
    setIsEditing(false);
  };

  const handleSaved = () => {
    onTransactionUpdated();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleEditClick}
        className="h-8 w-8 p-0"
        aria-label="Edit transaction"
      >
        <PencilIcon className="h-4 w-4" />
      </Button>
      
      {isEditing && transaction.type === 'expense' && (
        <ExpenseEditForm
          expense={transaction as Expense}
          isOpen={isEditing}
          onClose={handleEditClose}
          onSave={handleSaved}
        />
      )}

      {isEditing && transaction.type === 'income' && (
        <IncomeEditForm
          income={transaction as Income}
          isOpen={isEditing}
          onClose={handleEditClose}
          onSave={handleSaved}
        />
      )}
    </>
  );
};
