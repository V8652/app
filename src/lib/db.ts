// Simple IndexedDB database implementation for storing transactions

import { Transaction, Expense, Income, UserPreferences, ExpenseCategory } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Database configuration
const DB_NAME = 'ExpenseTrackerDB';
const DB_VERSION = 4; // Incremented from 3 to trigger a database upgrade
const TRANSACTIONS_STORE = 'transactions';
const EXPENSES_STORE = 'expenses';
const PREFERENCES_STORE = 'preferences';
const MERCHANT_NOTES_STORE = 'merchantNotes';
const PARSER_RULES_STORE = 'parserRules'; // Define parser rules store name

// Create a single connection to the database
let dbInstance: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  // If we already have a connection, return it
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    console.log('Opening database with version:', DB_VERSION);
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database error:', event);
      reject('Could not open database');
    };

    request.onsuccess = () => {
      console.log('Database opened successfully');
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      console.log('Database upgrade needed from', (event.oldVersion || 0), 'to', event.newVersion);
      const db = (event.target as IDBOpenDBRequest).result;

      // Create or upgrade transactions store
      if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
        console.log('Creating transactions store');
        const transactionsStore = db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' });
        transactionsStore.createIndex('date', 'date', { unique: false });
        transactionsStore.createIndex('type', 'type', { unique: false });
        transactionsStore.createIndex('category', 'category', { unique: false });
        transactionsStore.createIndex('merchantName', 'merchantName', { unique: false });
      }

      // Create or upgrade expenses store
      if (!db.objectStoreNames.contains(EXPENSES_STORE)) {
        console.log('Creating expenses store');
        const expensesStore = db.createObjectStore(EXPENSES_STORE, { keyPath: 'id' });
        expensesStore.createIndex('date', 'date', { unique: false });
        expensesStore.createIndex('category', 'category', { unique: false });
        expensesStore.createIndex('merchantName', 'merchantName', { unique: false });
      }

      // Create or upgrade preferences store
      if (!db.objectStoreNames.contains(PREFERENCES_STORE)) {
        console.log('Creating preferences store');
        db.createObjectStore(PREFERENCES_STORE, { keyPath: 'id' });
      }
      
      // Create or upgrade merchant notes store
      if (!db.objectStoreNames.contains(MERCHANT_NOTES_STORE)) {
        console.log('Creating merchant notes store');
        const merchantNotesStore = db.createObjectStore(MERCHANT_NOTES_STORE, { keyPath: 'id' });
        merchantNotesStore.createIndex('merchantName', 'merchantName', { unique: false });
      }
      
      // Create or upgrade parser rules store
      if (!db.objectStoreNames.contains(PARSER_RULES_STORE)) {
        console.log('Creating parser rules store');
        const parserRulesStore = db.createObjectStore(PARSER_RULES_STORE, { keyPath: 'id' });
        parserRulesStore.createIndex('name', 'name', { unique: false });
        parserRulesStore.createIndex('priority', 'priority', { unique: false });
      }
    };
    
    // Handle database blocked errors
    request.onblocked = () => {
      console.warn('Database upgrade was blocked. Please close other tabs using this app.');
      reject('Database upgrade was blocked');
    };
  });
};

export const addTransaction = async (transaction: Transaction): Promise<string> => {
  if (!transaction.id) {
    transaction.id = uuidv4();
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction_obj = db.transaction([TRANSACTIONS_STORE], 'readwrite');
    const store = transaction_obj.objectStore(TRANSACTIONS_STORE);
    const request = store.add(transaction);

    request.onsuccess = () => resolve(transaction.id);
    request.onerror = (event) => {
      console.error('Add transaction error:', event);
      reject('Failed to add transaction');
    };
  });
};

export const saveTransaction = async (transaction: Transaction): Promise<string> => {
  if (!transaction.id) {
    transaction.id = uuidv4();
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction_obj = db.transaction([TRANSACTIONS_STORE], 'readwrite');
    const store = transaction_obj.objectStore(TRANSACTIONS_STORE);
    const request = store.put(transaction);

    request.onsuccess = () => resolve(transaction.id);
    request.onerror = (event) => {
      console.error('Save transaction error:', event);
      reject('Failed to save transaction');
    };
  });
};

export const addExpense = async (expense: Expense): Promise<string> => {
  const transaction: Transaction = {
    ...expense,
    type: 'expense'
  };
  return addTransaction(transaction);
};

export const addIncome = async (income: Income): Promise<string> => {
  return addTransaction(income as Transaction);
};

export const getTransactions = async (): Promise<Transaction[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TRANSACTIONS_STORE], 'readonly');
    const store = transaction.objectStore(TRANSACTIONS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => {
      console.error('Get transactions error:', event);
      reject('Failed to get transactions');
    };
  });
};

export const getExpenses = async (): Promise<Expense[]> => {
  const transactions = await getTransactions();
  return transactions
    .filter(t => t.type === 'expense' || !t.type)
    .map(t => ({
      ...t,
      merchantName: t.merchantName || 'Unknown',
      category: t.category as Expense['category'],
      type: 'expense'
    })) as Expense[];
};

export const getIncomes = async (): Promise<Income[]> => {
  const transactions = await getTransactions();
  return transactions
    .filter(t => t.type === 'income')
    .map(t => ({ 
      ...t, 
      merchantName: t.merchantName || 'Unknown',
      type: 'income' as const, 
      category: t.category as Income['category'] 
    })) as Income[];
};

export const getTransactionsByDateRange = async (startDate: string, endDate: string): Promise<Transaction[]> => {
  const transactions = await getTransactions();
  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= new Date(startDate) && transactionDate <= new Date(endDate);
  });
};

export const getExpensesByDateRange = async (startDate: string, endDate: string): Promise<Expense[]> => {
  const transactions = await getTransactionsByDateRange(startDate, endDate);
  return transactions
    .filter(t => t.type === 'expense' || !t.type)
    .map(t => ({ 
      ...t, 
      merchantName: t.merchantName || 'Unknown',
      category: t.category as Expense['category'],
      type: 'expense'
    })) as Expense[];
};

export const getIncomesByDateRange = async (startDate: string, endDate: string): Promise<Income[]> => {
  const transactions = await getTransactionsByDateRange(startDate, endDate);
  return transactions
    .filter(t => t.type === 'income')
    .map(t => ({ 
      ...t, 
      type: 'income' as const, 
      category: t.category as Income['category'] 
    })) as Income[];
};

export const updateTransaction = async (transaction: Transaction): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction_obj = db.transaction([TRANSACTIONS_STORE], 'readwrite');
    const store = transaction_obj.objectStore(TRANSACTIONS_STORE);
    const request = store.put(transaction);

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error('Update transaction error:', event);
      reject('Failed to update transaction');
    };
  });
};

export const updateExpense = async (expense: Expense): Promise<void> => {
  const transaction: Transaction = {
    ...expense,
    type: 'expense'
  };
  return updateTransaction(transaction);
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TRANSACTIONS_STORE], 'readwrite');
    const store = transaction.objectStore(TRANSACTIONS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error('Delete transaction error:', event);
      reject('Failed to delete transaction');
    };
  });
};

export const deleteExpense = async (id: string): Promise<void> => {
  return deleteTransaction(id);
};

export const deleteIncome = async (id: string): Promise<void> => {
  return deleteTransaction(id);
};

export async function savePreferences(preferences: UserPreferences): Promise<void> {
  // Convert "none" to empty string for default expense category if needed
  if (preferences.defaultExpenseCategory === "none" as any) {
    preferences.defaultExpenseCategory = "" as ExpenseCategory;
  }
  
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PREFERENCES_STORE], 'readwrite');
    const store = transaction.objectStore(PREFERENCES_STORE);
    const request = store.put({ id: 'user-preferences', ...preferences });

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error('Save preferences error:', event);
      reject('Failed to save preferences');
    };
  });
};

export async function getPreferences(): Promise<UserPreferences> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PREFERENCES_STORE], 'readonly');
    const store = transaction.objectStore(PREFERENCES_STORE);
    const request = store.get('user-preferences');

    request.onsuccess = () => {
      if (request.result) {
        // If the stored defaultExpenseCategory is an empty string, convert it to "none" for the UI
        if (request.result.defaultExpenseCategory === "") {
          request.result.defaultExpenseCategory = "none" as any;
        }
        resolve(request.result);
      } else {
        resolve({
          defaultCurrency: 'INR',
          defaultExpenseCategory: 'other',
          defaultIncomeCategory: 'other',
          defaultTimeFrame: 'month',
          categorizeAutomatically: true
        });
      }
    };
    request.onerror = (event) => {
      console.error('Get preferences error:', event);
      reject('Failed to get preferences');
    };
  });
};

export const getUniqueMerchants = async (): Promise<string[]> => {
  try {
    const expenses = await getExpenses();
    
    // Extract unique merchant names
    const merchantNames = new Set<string>();
    
    for (const expense of expenses) {
      if (expense.merchantName && expense.merchantName.trim() !== '') {
        merchantNames.add(expense.merchantName.trim());
      }
    }
    
    return Array.from(merchantNames).sort();
  } catch (error) {
    console.error('Error getting unique merchants:', error);
    return [];
  }
};

export const applyMerchantNotesToTransactions = async (
  merchantName: string, 
  category: ExpenseCategory | "", 
  notes: string
): Promise<number> => {
  try {
    const expenses = await getExpenses();
    let updatedCount = 0;
    
    for (const expense of expenses) {
      if (expense.merchantName === merchantName) {
        let shouldUpdate = false;
        
        // Only update category if it's provided and the transaction doesn't already have one
        if (category && (!expense.category || expense.category === 'other')) {
          expense.category = category;
          shouldUpdate = true;
        }
        
        // Only update notes if provided and the transaction doesn't already have notes
        if (notes && (!expense.notes || expense.notes.trim() === '')) {
          expense.notes = notes;
          shouldUpdate = true;
        }
        
        if (shouldUpdate) {
          await updateExpense(expense);
          updatedCount++;
        }
      }
    }
    
    return updatedCount;
  } catch (error) {
    console.error('Error applying merchant notes to transactions:', error);
    return 0;
  }
};

export const getFinancialSummary = async (startDate?: string, endDate?: string): Promise<{
  totalExpenses: number;
  totalIncome: number;
  balance: number;
}> => {
  let expenses: Expense[];
  let incomes: Income[];

  if (startDate && endDate) {
    expenses = await getExpensesByDateRange(startDate, endDate);
    incomes = await getIncomesByDateRange(startDate, endDate);
  } else {
    expenses = await getExpenses();
    incomes = await getIncomes();
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

  return {
    totalExpenses,
    totalIncome,
    balance: totalIncome - totalExpenses
  };
};
