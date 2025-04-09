
import React, { useState } from 'react';
import { Expense } from '@/types';
import ExpenseEditForm from './ExpenseEditForm';
import { Button } from './ui/button';
import { PencilIcon } from 'lucide-react';

interface EditableTransactionProps {
  transaction: Expense;
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
      
      {isEditing && (
        <ExpenseEditForm
          expense={transaction}
          isOpen={isEditing}
          onClose={handleEditClose}
          onSave={handleSaved}
        />
      )}
    </>
  );
};

// Add a component that displays expense-related information
interface TransactionListViewExtensionProps {
  expenses: Expense[];
}

export const TransactionListViewExtension: React.FC<TransactionListViewExtensionProps> = ({ expenses }) => {
  // This component is currently a placeholder that could be expanded later
  return null;
};
