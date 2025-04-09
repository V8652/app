
export type ExpenseCategory =
  | 'other'
  | string; // Allow any string to support custom categories

export type IncomeCategory =
  | 'other'
  | string; // Allow any string to support custom categories

export type TimeFrame =
  | 'week'
  | 'month'
  | 'quarter'
  | 'year';

// Updated Preference interface to match UserPreferences
export interface Preference {
  id: string;
  defaultCurrency: string;
  defaultExpenseCategory: ExpenseCategory;
  defaultIncomeCategory: IncomeCategory;
  defaultTimeFrame: TimeFrame;
  categorizeAutomatically: boolean;
  gmailCredentials?: GmailCredentials;
}

export interface UserPreferences {
  defaultCurrency: string;
  defaultExpenseCategory: ExpenseCategory;
  defaultIncomeCategory: IncomeCategory;
  defaultTimeFrame: TimeFrame;
  categorizeAutomatically: boolean;
  gmailCredentials?: GmailCredentials;
}

export interface GmailCredentials {
  clientId: string;
  apiKey: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  category: ExpenseCategory | IncomeCategory;
  description?: string;
  type: 'income' | 'expense';
  merchantName?: string;
  notes?: string;
  paymentMethod?: string;
  emailId?: string;
  isManualEntry?: boolean;
  isEdited?: boolean;
}

export interface Income extends Omit<Transaction, 'category'> {
  id: string;
  date: string;
  amount: number;
  currency: string;
  category: IncomeCategory;
  merchantName: string;
  description?: string;
  notes?: string;
  paymentMethod?: string;
  type: 'income';
  isManualEntry?: boolean;
  isEdited?: boolean;
}

export interface Expense extends Omit<Transaction, 'category'> {
  id: string;
  merchantName: string;
  amount: number;
  currency: string;
  date: string;
  category: ExpenseCategory;
  notes?: string;
  paymentMethod?: string;
  emailId?: string;
  type: 'expense';
  isManualEntry?: boolean;
  isEdited?: boolean;
}

// Add CategorySummary interface for charts
export interface CategorySummary {
  category: string;
  total: number;
  count: number;
  color: string;
}

// Add DateRange interface for analytics
export interface DateRange {
  from: Date;
  to: Date;
}

// Updated UserCategories interface to ensure categoryColors is properly typed
export interface UserCategories {
  id?: string;
  expenseCategories?: string[];
  incomeCategories?: string[];
  categoryColors?: Record<string, string>; // Map category names to colors
}

// Add interface for category with color
export interface CategoryWithColor {
  name: string;
  color: string;
}
