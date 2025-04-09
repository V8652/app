import { openDB } from 'idb';
import { Expense, Income, Preference, Transaction, UserCategories } from '@/types';

const DB_NAME = 'money-minder-db';
const DB_VERSION = 1;
const EXPENSES_STORE = 'expenses';
const INCOMES_STORE = 'incomes';
const PREFERENCES_STORE = 'preferences';
const MERCHANT_NOTES_STORE = 'merchantNotes';
const PARSER_RULES_STORE = 'parserRules';
const USER_CATEGORIES_STORE = 'userCategories';

// Export the initDB function needed by other modules
export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(EXPENSES_STORE)) {
        db.createObjectStore(EXPENSES_STORE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(INCOMES_STORE)) {
        db.createObjectStore(INCOMES_STORE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(PREFERENCES_STORE)) {
        db.createObjectStore(PREFERENCES_STORE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(MERCHANT_NOTES_STORE)) {
        const merchantStore = db.createObjectStore(MERCHANT_NOTES_STORE, { keyPath: 'id' });
        merchantStore.createIndex('merchantName', 'merchantName', { unique: true });
      }
      
      if (!db.objectStoreNames.contains(PARSER_RULES_STORE)) {
        db.createObjectStore(PARSER_RULES_STORE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(USER_CATEGORIES_STORE)) {
        db.createObjectStore(USER_CATEGORIES_STORE, { keyPath: 'id' });
      }
    },
  });
}

async function getDB() {
  return initDB();
}

// Expenses
export async function addExpense(expense: Expense) {
  const db = await getDB();
  await db.add(EXPENSES_STORE, expense);
}

export async function getExpenses(): Promise<Expense[]> {
  const db = await getDB();
  return db.getAll(EXPENSES_STORE);
}

export async function getExpense(id: string): Promise<Expense | undefined> {
  const db = await getDB();
  return db.get(EXPENSES_STORE, id);
}

export async function getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
  const db = await getDB();
  const tx = db.transaction(EXPENSES_STORE, 'readonly');
  const store = tx.objectStore(EXPENSES_STORE);
  let cursor = await store.openCursor();
  const expenses: Expense[] = [];

  while (cursor) {
    const expenseDate = new Date(cursor.value.date);
    if (expenseDate >= new Date(startDate) && expenseDate <= new Date(endDate)) {
      expenses.push(cursor.value);
    }
    cursor = await cursor.continue();
  }
  return expenses;
}

// Incomes
export async function addIncome(income: Income) {
  const db = await getDB();
  await db.add(INCOMES_STORE, income);
}

export async function getIncomes(): Promise<Income[]> {
  const db = await getDB();
  return db.getAll(INCOMES_STORE);
}

export async function getIncome(id: string): Promise<Income | undefined> {
  const db = await getDB();
  return db.get(INCOMES_STORE, id);
}

export async function getIncomesByDateRange(startDate: string, endDate: string): Promise<Income[]> {
  const db = await getDB();
  const tx = db.transaction(INCOMES_STORE, 'readonly');
  const store = tx.objectStore(INCOMES_STORE);
  let cursor = await store.openCursor();
  const incomes: Income[] = [];

  while (cursor) {
    const incomeDate = new Date(cursor.value.date);
    if (incomeDate >= new Date(startDate) && incomeDate <= new Date(endDate)) {
      incomes.push(cursor.value);
    }
    cursor = await cursor.continue();
  }
  return incomes;
}

// Financial Summary
export async function getFinancialSummary(startDate?: string, endDate?: string): Promise<{
  totalExpenses: number;
  totalIncome: number;
  balance: number;
}> {
  let expenses: Expense[] = [];
  let incomes: Income[] = [];

  if (startDate && endDate) {
    expenses = await getExpensesByDateRange(startDate, endDate);
    incomes = await getIncomesByDateRange(startDate, endDate);
  } else {
    expenses = await getExpenses();
    incomes = await getIncomes();
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const balance = totalIncome - totalExpenses;

  return { totalExpenses, totalIncome, balance };
}

// Update Transaction (for both Expense and Income)
export async function updateTransaction(transaction: Expense | Income) {
  const db = await getDB();
  const storeName = transaction.type === 'expense' ? EXPENSES_STORE : INCOMES_STORE;
  await db.put(storeName, transaction);
}

// Delete Transaction (for both Expense and Income)
export async function deleteTransaction(id: string, type: 'expense' | 'income') {
  const db = await getDB();
  const storeName = type === 'expense' ? EXPENSES_STORE : INCOMES_STORE;
  await db.delete(storeName, id);
}

// Preferences
export async function getPreferences(): Promise<Preference> {
  try {
    const db = await getDB();
    const result = await db.get(PREFERENCES_STORE, 'user-preferences');
    return result || {
      id: 'user-preferences',
      defaultCurrency: 'USD',
      defaultExpenseCategory: 'other',
      defaultIncomeCategory: 'other',
      defaultTimeFrame: 'month',
      categorizeAutomatically: true,
    };
  } catch (error) {
    console.error('Error getting preferences:', error);
    return {
      id: 'user-preferences',
      defaultCurrency: 'USD',
      defaultExpenseCategory: 'other',
      defaultIncomeCategory: 'other',
      defaultTimeFrame: 'month',
      categorizeAutomatically: true,
    };
  }
}

export async function savePreferences(preferences: Preference) {
  try {
    // Make sure the ID is set
    if (!preferences.id) {
      preferences.id = 'user-preferences';
    }
    
    const db = await getDB();
    await db.put(PREFERENCES_STORE, preferences);
    return true;
  } catch (error) {
    console.error('Error saving preferences:', error);
    return false;
  }
}

// Add function to get all transactions (for import/export functionality)
export async function getTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  const expenses = await db.getAll(EXPENSES_STORE);
  const incomes = await db.getAll(INCOMES_STORE);
  return [...expenses, ...incomes];
}

// Add function to add any transaction (for import functionality)
export async function addTransaction(transaction: Transaction) {
  const db = await getDB();
  const storeName = transaction.type === 'expense' ? EXPENSES_STORE : INCOMES_STORE;
  await db.add(storeName, transaction);
}

// Add functions for merchant notes functionality
export async function getUniqueMerchants(): Promise<string[]> {
  try {
    const db = await getDB();
    const expenses = await db.getAll(EXPENSES_STORE);
    const incomes = await db.getAll(INCOMES_STORE);
    
    // Extract all merchant names
    const merchantNames = [
      ...expenses.map(e => e.merchantName || ''),
      ...incomes.map(i => i.merchantName || '')
    ]
    .filter(name => name.trim() !== '')
    .sort();
    
    // Remove duplicates
    return [...new Set(merchantNames)];
  } catch (error) {
    console.error('Error getting unique merchants:', error);
    return [];
  }
}

export async function applyMerchantNotesToTransactions(
  merchantName: string,
  category: string,
  notes: string
): Promise<number> {
  try {
    const db = await getDB();
    let updatedCount = 0;
    
    // Apply to expenses
    const expenses = await db.getAll(EXPENSES_STORE);
    const matchingExpenses = expenses.filter(e => 
      e.merchantName === merchantName && 
      (!e.category || e.category === 'other') &&
      (!e.notes || e.notes.trim() === '')
    );
    
    for (const expense of matchingExpenses) {
      const updatedExpense = {
        ...expense,
        category: category as any || expense.category,
        notes: notes || expense.notes
      };
      await db.put(EXPENSES_STORE, updatedExpense);
      updatedCount++;
    }
    
    // Apply to incomes
    const incomes = await db.getAll(INCOMES_STORE);
    const matchingIncomes = incomes.filter(i => 
      i.merchantName === merchantName && 
      (!i.category || i.category === 'other') &&
      (!i.notes || i.notes.trim() === '')
    );
    
    for (const income of matchingIncomes) {
      const updatedIncome = {
        ...income,
        category: category as any || income.category,
        notes: notes || income.notes
      };
      await db.put(INCOMES_STORE, updatedIncome);
      updatedCount++;
    }
    
    return updatedCount;
  } catch (error) {
    console.error('Error applying merchant notes to transactions:', error);
    return 0;
  }
}

// Add functions for user categories
export async function getUserCategories(): Promise<UserCategories> {
  try {
    const db = await getDB();
    const result = await db.get(USER_CATEGORIES_STORE, 'user-categories');
    return result || { expenseCategories: [], incomeCategories: [] };
  } catch (error) {
    console.error('Error getting user categories:', error);
    return { expenseCategories: [], incomeCategories: [] };
  }
}

export async function saveUserCategories(categories: UserCategories): Promise<boolean> {
  try {
    const db = await getDB();
    const existingCategories = await getUserCategories();
    
    // Fix: Properly merge category colors
    const updatedCategories = {
      id: 'user-categories',
      expenseCategories: categories.expenseCategories || existingCategories.expenseCategories || [],
      incomeCategories: categories.incomeCategories || existingCategories.incomeCategories || [],
      // Make sure we keep the existing colors and add the new ones
      categoryColors: {
        ...(existingCategories.categoryColors || {}),
        ...(categories.categoryColors || {})
      }
    };
    
    await db.put(USER_CATEGORIES_STORE, updatedCategories);
    return true;
  } catch (error) {
    console.error('Error saving user categories:', error);
    return false;
  }
}
