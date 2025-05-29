// Types for transactions
export interface Transaction {
  id: string;
  type: 'expense' | 'income';
  amount: number; // Positive number for both expenses and incomes
  currency: string;
  date: string;
  merchantName: string;
  category: string;
  paymentMethod?: string;
  notes?: string;
  isRecurring?: boolean;
  isAutoEnriched?: boolean;
  isManualEntry?: boolean;
  source?: string; // Added source property
  sender?: string; // Added sender property for SMS transactions
}

export interface Expense extends Transaction {
  type: 'expense';
  category: ExpenseCategory;
  isEdited?: boolean;
  isAutoEnriched?: boolean;
}

export interface Income extends Transaction {
  type: 'income';
  category: IncomeCategory;
  isEdited?: boolean;
  isAutoEnriched?: boolean;
}

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
  | 'uncategorized'  
  | 'other';

export type IncomeCategory =
  | 'salary'
  | 'freelance'
  | 'investments'
  | 'rent'
  | 'gifts'
  | 'other';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface CategorySummary {
  category: string;
  total: number;
  count: number;
  color: string;
}

export interface UserCategories {
  id: string;
  expenseCategories?: string[];
  incomeCategories?: string[];
  categoryColors?: Record<string, string>;
  categoryIcons?: Record<string, string>;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  color?: string;
}

export interface ParserRule {
  id: string;
  name: string;
  enabled: boolean;
  priority?: number;
  senderMatch: string | string[];
  amountRegex: string | string[];
  merchantCondition: string | string[];
  merchantCommonPatterns?: string | string[];
  skipCondition?: string | string[];
  paymentBank: string;
  transactionType?: 'expense' | 'income';
  categoryOverride?: string;
}

export interface Preference {
  id: string; // Added missing id property
  theme?: 'light' | 'dark' | 'system';
  currency?: string;
  defaultExpenseCategory?: string;
  defaultIncomeCategory?: string;
  defaultCurrency?: string;
  defaultTimeFrame?: TimeFrame;
  categorizeAutomatically?: boolean;
}

export interface FinancialSummary {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
}

export type TimeFrame = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  defaultTimeframe: TimeFrame;
  defaultExpenseCategory: string;
  defaultIncomeCategory: string;
  showBalanceOnDashboard: boolean;
  enableAutoCategories: boolean;
  enableNotifications: boolean;
}
