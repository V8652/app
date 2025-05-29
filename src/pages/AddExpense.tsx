
import React from 'react';
import { useNavigate } from 'react-router-dom';
import ExpenseForm from '@/components/ExpenseForm';
import { Expense } from '@/types';
import { addExpense } from '@/lib/db';
import { toast } from '@/hooks/use-toast';

const AddExpense = () => {
  const navigate = useNavigate();

  const handleSubmit = async (expense: Expense) => {
    try {
      await addExpense(expense);
      toast({
        title: 'Expense Added',
        description: 'Your expense has been successfully added.'
      });
      navigate('/');
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: 'Error Adding Expense',
        description: 'Could not add your expense. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Add New Expense</h1>
      <ExpenseForm 
        onSubmit={handleSubmit} 
        onCancel={() => navigate('/')}
      />
    </div>
  );
};

export default AddExpense;
