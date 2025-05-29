
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import IncomeForm from '@/components/IncomeForm';
import { Income } from '@/types';
import { getIncome, updateTransaction } from '@/lib/db';
import { toast } from '@/hooks/use-toast';

const EditIncome = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [income, setIncome] = useState<Income | null>(null);

  useEffect(() => {
    const loadIncome = async () => {
      if (!id) return;
      try {
        const data = await getIncome(id);
        setIncome(data);
      } catch (error) {
        console.error('Error loading income:', error);
        toast({
          title: 'Error',
          description: 'Could not load income details.',
          variant: 'destructive'
        });
        navigate('/');
      }
    };

    loadIncome();
  }, [id, navigate]);

  const handleSubmit = async (updatedIncome: Income) => {
    try {
      await updateTransaction({ ...updatedIncome, id: id! });
      toast({
        title: 'Income Updated',
        description: 'Your income has been successfully updated.'
      });
      navigate('/');
    } catch (error) {
      console.error('Error updating income:', error);
      toast({
        title: 'Error',
        description: 'Could not update income. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (!income) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Edit Income</h1>
      <IncomeForm 
        income={income}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/')}
      />
    </div>
  );
};

export default EditIncome;
