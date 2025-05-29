export interface MerchantExtraction {
  startText?: string;
  endText?: string;
  startIndex?: number;
}

export interface SmsParserRule {
  id: string;
  name: string;
  enabled: boolean;
  senderMatch: string | string[];
  amountRegex: string | string[];
  merchantCondition: string | string[]; // Already supports multiple patterns
  merchantCommonPatterns?: string[];
  paymentBank: string;
  priority: number;
  lastModified: string;
  createdAt: number;
  updatedAt: number;
  lastError?: string;
  successCount?: number;
  pattern?: string;
  merchantNameRegex?: string;
  skipCondition?: string | string[];
  transactionType?: 'expense' | 'income';
  merchantExtractions?: MerchantExtraction[]; // New field for multiple extractions
  merchantStartText?: string;
  merchantEndText?: string;
  merchantStartIndex?: number;
}

export type SmsParserRuleFormData = {
  name: string;
  enabled: boolean;
  senderMatch: string | string[];
  amountRegex: string | string[];
  merchantCondition?: string | string[]; // Made optional
  merchantCommonPatterns?: string[];
  paymentBank: string;
  skipCondition?: string | string[];
  priority: number;
  pattern?: string;
  merchantNameRegex?: string;
  transactionType?: 'expense' | 'income';
  merchantExtractions?: MerchantExtraction[]; // New field for multiple extractions
  merchantStartText?: string;
  merchantEndText?: string;
  merchantStartIndex?: number;
};
