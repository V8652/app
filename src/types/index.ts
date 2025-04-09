export type ExpenseCategory =
  | 'groceries'
  | 'utilities'
  | 'entertainment'
  | 'transportation'
  | 'dining'
  | 'shopping'
  | 'health'
  | 'travel'
  | 'housing'
  | 'education'
  | 'subscriptions'
  | 'other';

export type IncomeCategory =
  | 'salary'
  | 'freelance'
  | 'investment'
  | 'gift'
  | 'refund'
  | 'other';

export type TimeFrame =
  | 'week'
  | 'month'
  | 'quarter'
  | 'year';

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
