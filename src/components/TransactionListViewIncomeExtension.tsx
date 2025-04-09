
import React, { useState } from 'react';
import { Income } from '@/types';
import IncomeEditForm from './IncomeEditForm';
import { Button } from './ui/button';
import { PencilIcon } from 'lucide-react';

interface EditableIncomeProps {
  income: Income;
  onTransactionUpdated: () => void;
}

export const EditableIncome: React.FC<EditableIncomeProps> = ({ 
  income,
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
        aria-label="Edit income transaction"
      >
        <PencilIcon className="h-4 w-4" />
      </Button>
      
      {isEditing && (
        <IncomeEditForm
          income={income}
          isOpen={isEditing}
          onClose={handleEditClose}
          onSave={handleSaved}
        />
      )}
    </>
  );
};
