
import React from 'react';
import { useNavigate } from 'react-router-dom';
import IncomeForm from '@/components/IncomeForm';
import { Income } from '@/types';
import { addIncome } from '@/lib/db';
import { toast } from '@/hooks/use-toast';

const AddIncome = () => {
  const navigate = useNavigate();

  const handleSubmit = async (income: Income) => {
    try {
      await addIncome(income);
      toast({
        title: 'Income Added',
        description: 'Your income has been successfully added.'
      });
      navigate('/');
    } catch (error) {
      console.error('Error adding income:', error);
      toast({
        title: 'Error Adding Income',
        description: 'Could not add your income. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Add New Income</h1>
      <IncomeForm 
        onSubmit={handleSubmit} 
        onCancel={() => navigate('/')}
      />
    </div>
  );
};

export default AddIncome;
