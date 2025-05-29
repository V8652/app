
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ExpenseForm from '@/components/ExpenseForm';
import { Expense } from '@/types';
import { getExpense, updateTransaction } from '@/lib/db';
import { toast } from '@/hooks/use-toast';

const EditExpense = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<Expense | null>(null);

  useEffect(() => {
    const loadExpense = async () => {
      if (!id) return;
      try {
        const data = await getExpense(id);
        setExpense(data);
      } catch (error) {
        console.error('Error loading expense:', error);
        toast({
          title: 'Error',
          description: 'Could not load expense details.',
          variant: 'destructive'
        });
        navigate('/');
      }
    };

    loadExpense();
  }, [id, navigate]);

  const handleSubmit = async (updatedExpense: Expense) => {
    try {
      await updateTransaction({ ...updatedExpense, id: id! });
      toast({
        title: 'Expense Updated',
        description: 'Your expense has been successfully updated.'
      });
      navigate('/');
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: 'Error',
        description: 'Could not update expense. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (!expense) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Edit Expense</h1>
      <ExpenseForm 
        expense={expense}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/')}
      />
    </div>
  );
};

export default EditExpense;
