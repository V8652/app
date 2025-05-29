
import { getExpenses, getIncomes } from './db';

/**
 * Calculates the current balance based on all transactions
 * @returns The calculated balance (income - expenses)
 */
export async function calculateBalance(): Promise<number> {
  try {
    console.log('Calculating balance in real-time...');
    
    // Retrieve data without cache parameter since the functions don't accept arguments
    const expenses = await getExpenses();
    const incomes = await getIncomes();
    
    // All amounts are stored as positive, so we use the transaction type to determine how to calculate
    const totalExpenses = expenses.reduce((sum, expense) => sum + Math.abs(expense.amount), 0);
    const totalIncome = incomes.reduce((sum, income) => sum + Math.abs(income.amount), 0);
    
    // Balance is income minus expenses (both stored as positive values)
    const balance = totalIncome - totalExpenses;
    console.log(`Balance calculated: ${balance} (Income: ${totalIncome} - Expenses: ${totalExpenses})`);
    
    // Return the balance
    return balance;
  } catch (error) {
    console.error('Error calculating balance:', error);
    throw error;
  }
}
