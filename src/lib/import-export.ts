
import { Transaction, ExpenseCategory, IncomeCategory } from '@/types';
import { getTransactions, addTransaction } from '@/lib/db';

// Export transactions to CSV file
export const exportTransactionsToCSV = async (filename: string = 'transactions.csv'): Promise<void> => {
  try {
    console.log(`Exporting transactions to CSV file: ${filename}`);
    
    // Get all transactions
    const transactions = await getTransactions();
    
    // Convert transactions to CSV format
    const headers = ['id', 'date', 'amount', 'currency', 'merchantName', 'notes', 'category', 'type'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(t => [
        t.id,
        t.date,
        t.amount,
        t.currency,
        `"${t.merchantName?.replace(/"/g, '""') || ''}"`,
        `"${t.notes?.replace(/"/g, '""') || ''}"`,
        t.category,
        t.type || 'expense'
      ].join(','))
    ].join('\n');
    
    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting transactions to CSV:', error);
    throw error;
  }
};

// Export transactions to JSON file
export const exportTransactions = async (filename: string = 'transactions.json'): Promise<void> => {
  try {
    console.log(`Exporting transactions to JSON file: ${filename}`);
    
    // Get all transactions
    const transactions = await getTransactions();
    
    // Create a blob and trigger download
    const jsonContent = JSON.stringify(transactions, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting transactions to JSON:', error);
    throw error;
  }
};

// Helper function to validate transaction type
const validateTransactionType = (type: string): 'expense' | 'income' => {
  if (type === 'expense' || type === 'income') {
    return type;
  }
  return 'expense'; // Default to expense if invalid
};

// Helper function to validate transaction category
const validateCategory = (category: string, type: 'expense' | 'income'): ExpenseCategory | IncomeCategory => {
  const expenseCategories: ExpenseCategory[] = [
    'groceries', 'utilities', 'entertainment', 'transportation', 
    'dining', 'shopping', 'health', 'travel', 'housing', 
    'education', 'subscriptions', 'other'
  ];
  
  const incomeCategories: IncomeCategory[] = [
    'salary', 'freelance', 'investment', 'gift', 'refund', 'other'
  ];
  
  // Check if category is valid based on transaction type
  if (type === 'expense' && expenseCategories.includes(category as ExpenseCategory)) {
    return category as ExpenseCategory;
  } else if (type === 'income' && incomeCategories.includes(category as IncomeCategory)) {
    return category as IncomeCategory;
  }
  
  // Return default category based on transaction type
  return type === 'expense' ? 'other' : 'other';
};

// Import transactions from a JSON file
export const importTransactions = async (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        if (!event.target?.result) {
          throw new Error('Failed to read file');
        }
        
        const jsonData = JSON.parse(event.target.result as string);
        let importedCount = 0;
        
        // Validate and import each transaction
        if (Array.isArray(jsonData)) {
          for (const item of jsonData) {
            // Basic validation
            if (item.amount && (item.date || typeof item.date === 'string')) {
              // Parse transaction type safely
              const transactionType = validateTransactionType(item.type || 'expense');
              // Parse category safely
              const category = validateCategory(item.category || 'other', transactionType);
              
              // Ensure required fields are present
              const transaction: Transaction = {
                id: item.id || crypto.randomUUID(),
                date: item.date,
                amount: parseFloat(item.amount),
                currency: item.currency || 'USD', 
                category: category,
                type: transactionType,
                merchantName: item.merchantName || 'Unknown',
                notes: item.notes || '',
                paymentMethod: item.paymentMethod || ''
              };
              
              await addTransaction(transaction);
              importedCount++;
            }
          }
          console.log(`Successfully imported ${importedCount} transactions`);
          resolve();
        } else {
          throw new Error('Invalid JSON format: Expected an array of transactions');
        }
      } catch (error) {
        console.error('Error importing transactions:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};

// Import transactions from a CSV file
export const importTransactionsFromCSV = async (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        if (!event.target?.result) {
          throw new Error('Failed to read file');
        }
        
        const csvData = event.target.result as string;
        const lines = csvData.split('\n');
        let headers = lines[0].split(',');
        
        // Standardize headers (case insensitive)
        headers = headers.map(h => h.trim().toLowerCase());
        
        const requiredFields = ['amount', 'date'];
        const missingFields = requiredFields.filter(
          field => !headers.some(h => h === field)
        );
        
        if (missingFields.length > 0) {
          throw new Error(`CSV is missing required fields: ${missingFields.join(', ')}`);
        }
        
        let importedCount = 0;
        
        // Parse and import each row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Handle quoted values with commas
          const values: string[] = [];
          let inQuotes = false;
          let currentValue = '';
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue);
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          
          values.push(currentValue);
          
          // Map CSV values to transaction object
          const record: Record<string, string> = {};
          headers.forEach((header, index) => {
            if (index < values.length) {
              record[header] = values[index];
            }
          });
          
          // Parse transaction type and validate
          const transactionType = validateTransactionType(record.type || 'expense');
          // Parse category and validate
          const category = validateCategory(record.category || 'other', transactionType);
          
          // Create a transaction object
          const transaction: Transaction = {
            id: record.id || crypto.randomUUID(),
            date: record.date,
            amount: parseFloat(record.amount),
            currency: record.currency || 'USD',
            merchantName: record.merchantname || 'Unknown',
            notes: record.notes || '',
            category: category,
            type: transactionType,
            paymentMethod: record.paymentmethod || ''
          };
          
          await addTransaction(transaction);
          importedCount++;
        }
        
        console.log(`Successfully imported ${importedCount} transactions from CSV`);
        resolve();
      } catch (error) {
        console.error('Error importing transactions from CSV:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};
