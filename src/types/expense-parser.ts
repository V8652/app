
export interface ExpenseParserRule {
  /** Unique identifier for the rule */
  id: string;
  
  /** User-friendly name of the parser rule */
  name: string;
  
  /** Whether the rule is currently active */
  enabled: boolean;
  
  /** Text that must appear in the email sender address */
  senderMatch: string;
  
  /** Text that must appear in the email subject (optional) */
  subjectMatch: string;
  
  /** Regular expression to extract the transaction amount (with capture group) */
  amountRegex: string;
  
  /** Regular expression to extract the merchant name (with capture group, optional) */
  merchantCondition: string;
  
  /** Bank or payment method to associate with transactions matching this rule */
  paymentBank: string;
  
  /** Regular expression pattern - if matched, email is skipped entirely */
  skipCondition: string;
  
  /** Regular expression pattern - if matched, don't extract data but don't skip either */
  noExtractCondition: string;
  
  /** Regular expression to extract the transaction date (with capture group) */
  dateRegex: string;
  
  /** Rule priority - higher numbers are processed first */
  priority: number;
  
  /** Optional additional search query for finding relevant emails */
  additionalSearchQuery?: string;
  
  /** Regular expressions for cleaning merchant names (each with a capture group) */
  merchantCommonPatterns?: string[];
  
  /** Whether to extract merchant from subject only (if true) or body only (if false) */
  extractMerchantFromSubject?: boolean;
  
  /** Timestamp when the rule was created */
  createdAt: number;
  
  /** Timestamp when the rule was last updated */
  updatedAt: number;
  
  /** Details about any failed parsing attempts */
  lastError?: string;
  
  /** Count of successful parses */
  successCount?: number;
}
