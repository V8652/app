// Define the SmsParserRule interface for parsing expenses from SMS messages
export interface SmsParserRule {
  id: string;
  name: string;
  enabled: boolean;
  pattern: string;
  merchantNameRegex: string;
  senderMatch: string | string[];
  amountRegex: string | string[];
  merchantCondition: string | string[];
  merchantCommonPatterns?: string[];
  paymentBank: string;
  skipCondition?: string | string[];
  priority?: number;
  lastModified: string;
  createdAt?: number;
  updatedAt?: number;
  lastError?: string;
  successCount?: number;
  merchantStartText?: string;
  merchantEndText?: string;
  merchantStartIndex?: number;
  transactionType?: 'expense' | 'income';
}

export interface SmsParserRuleFormData {
  name: string;
  enabled: boolean;
  pattern: string;
  merchantNameRegex: string;
  senderMatch: string | string[];
  amountRegex: string | string[];
  merchantCondition: string | string[];
  merchantCommonPatterns?: string[];
  paymentBank: string;
  skipCondition?: string | string[];
  priority?: number;
  merchantStartText?: string;
  merchantEndText?: string;
  merchantStartIndex?: number;
  transactionType?: 'expense' | 'income';
}
