import { Expense, Income } from '@/types';
import { getExpenses, getIncomes, addExpense, addIncome } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { parseCSVFile, forceDownloadCSV } from './csv-utils';
import { v4 as uuidv4 } from 'uuid';
import { dbEvents, DatabaseEvent } from './db-event';
import Papa from 'papaparse';

/**
 * Export transaction data (expenses and incomes) to CSV with improved handling
 */
export const exportTransactionsToCSV = async (filename: string): Promise<void> => {
  try {
    // Fetch all transactions
    const expenses = await getExpenses();
    const incomes = await getIncomes();
    
    console.log(`Exporting ${expenses.length} expenses and ${incomes.length} incomes`);
    
    if (expenses.length === 0 && incomes.length === 0) {
      toast({
        title: "No Data to Export",
        description: "You don't have any transactions to export yet. Add some transactions first.",
        variant: "destructive"
      });
      return;
    }
    
    // Prepare transactions for CSV with all fields
    const exportData = [
      ...expenses.map(expense => ({
        id: expense.id,
        type: 'expense',
        amount: expense.amount.toFixed(2),
        date: new Date(expense.date).toISOString().split('T')[0],
        merchantName: expense.merchantName || '',
        category: expense.category || '',
        paymentMethod: expense.paymentMethod || '',
        notes: expense.notes || '',
        currency: expense.currency || 'INR',
        isManualEntry: expense.isManualEntry ? 'Yes' : 'No',
        isEdited: expense.isEdited ? 'Yes' : 'No',
        source: expense.source || ''
      })),
      ...incomes.map(income => ({
        id: income.id,
        type: 'income',
        amount: income.amount.toFixed(2),
        date: new Date(income.date).toISOString().split('T')[0],
        merchantName: income.merchantName || '',
        category: income.category || '',
        paymentMethod: income.paymentMethod || '',
        notes: income.notes || '',
        currency: income.currency || 'INR',
        isManualEntry: income.isManualEntry ? 'Yes' : 'No',
        isEdited: income.isEdited ? 'Yes' : 'No',
        source: income.source || ''
      }))
    ];
    
    // Generate CSV content with proper formatting
    const csvContent = Papa.unparse(exportData, {
      header: true,
      skipEmptyLines: true,
      quotes: true, // Always quote fields for safety
      quoteChar: '"',
      delimiter: ',',
      newline: '\n'
    });
    
    // Use our improved CSV download function
    await forceDownloadCSV(csvContent, filename);
    
    toast({
      title: "Export Complete",
      description: `${expenses.length + incomes.length} transactions exported successfully`
    });
  } catch (error) {
    console.error('Error exporting transactions:', error);
    toast({
      title: "Export Failed",
      description: `Failed to export transactions: ${(error as Error).message || "Unknown error"}`,
      variant: "destructive"
    });
  }
};

/**
 * Import transaction data (expenses and incomes) from CSV with improved handling
 */
export const importTransactionsFromCSV = async (file: File): Promise<(Expense | Income)[]> => {
  try {
    console.log("Starting to parse CSV file", file.name);
    
    // Parse CSV file
    const transactions = await parseCSVFile<Record<string, any>>(file);
    console.log("Parsed transactions:", transactions.length);
    
    if (transactions.length === 0) {
      toast({
        title: "No Data to Import",
        description: "No valid transactions found in the CSV file.",
        variant: "destructive"
      });
      return [];
    }
    
    // Counters for success message
    let expenseCount = 0;
    let incomeCount = 0;
    let errorCount = 0;
    const importedTransactions: (Expense | Income)[] = [];
    
    // Process each transaction
    for (const transaction of transactions) {
      try {
        // Validate required fields
        if (!transaction.amount) {
          console.warn('Transaction missing amount:', transaction);
          errorCount++;
          continue;
        }
        
        if (!transaction.date) {
          console.warn('Transaction missing date:', transaction);
          errorCount++;
          continue;
        }
        
        // Normalize the transaction type
        const type = transaction.type?.toLowerCase();
        console.log("Processing transaction of type:", type);
        
        // Common fields
        const commonFields = {
          id: transaction.id || uuidv4(),
          amount: Number(transaction.amount),
          date: transaction.date,
          category: transaction.category || '',
          notes: transaction.notes || '',
          paymentMethod: transaction.paymentMethod || '',
          currency: transaction.currency || 'INR'
        };
        
        if (type === 'expense') {
          // Create expense
          const expense: Expense = {
            ...commonFields,
            type: 'expense',
            merchantName: transaction.merchantName || ''
          };
          
          console.log("Adding expense:", expense.amount, expense.merchantName);
          await addExpense(expense);
          importedTransactions.push(expense);
          expenseCount++;
        } else if (type === 'income') {
          // Create income
          const income: Income = {
            ...commonFields,
            type: 'income',
            merchantName: '',
            source: transaction.merchantName || transaction.source || ''
          };
          
          console.log("Adding income:", income.amount, income.source);
          await addIncome(income);
          importedTransactions.push(income);
          incomeCount++;
        } else {
          console.warn('Unknown transaction type:', type);
          errorCount++;
        }
      } catch (error) {
        console.error('Error importing transaction:', error);
        errorCount++;
      }
    }
    
    // Update UI with multiple events for better reactivity
    dbEvents.emit(DatabaseEvent.TRANSACTION_UPDATED);
    dbEvents.emit(DatabaseEvent.TRANSACTION_ADDED);
    dbEvents.emit(DatabaseEvent.TRANSACTION_IMPORTED);
    dbEvents.emit(DatabaseEvent.DATA_IMPORTED);
    
    // Show appropriate message
    let message = '';
    if (expenseCount > 0 && incomeCount > 0) {
      message = `Imported ${expenseCount} expenses and ${incomeCount} incomes.`;
    } else if (expenseCount > 0) {
      message = `Imported ${expenseCount} expenses.`;
    } else if (incomeCount > 0) {
      message = `Imported ${incomeCount} incomes.`;
    } else {
      message = 'No valid transactions were found in the file.';
    }
    
    if (errorCount > 0) {
      message += ` (${errorCount} items skipped due to errors)`;
    }
    
    toast({
      title: "Import Complete",
      description: message
    });
    
    return importedTransactions;
  } catch (error) {
    console.error('Error importing transactions:', error);
    toast({
      title: "Import Failed",
      description: `Failed to import transactions: ${(error as Error).message || "Unknown error"}`,
      variant: "destructive"
    });
    return [];
  }
};
