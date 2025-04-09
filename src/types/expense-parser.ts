
export interface ExpenseParserRule {
  /** Unique identifier for the rule */
  id: string;
  
  /** User-friendly name of the parser rule */
  name: string;
  
  /** Whether the rule is currently active */
  enabled: boolean;
  
  /** Text that must appear in the email sender address (array supports multiple patterns) */
  senderMatch: string | string[];
  
  /** Text that must appear in the email subject (optional, array supports multiple patterns) */
  subjectMatch: string | string[];
  
  /** Regular expression to extract the transaction amount (with capture group, array supports multiple patterns) */
  amountRegex: string | string[];
  
  /** Regular expression to extract the merchant name (with capture group, optional, array supports multiple patterns) */
  merchantCondition: string | string[];
  
  /** Bank or payment method to associate with transactions matching this rule */
  paymentBank: string;
  
  /** Regular expression pattern - if matched, email is skipped entirely (array supports multiple patterns) */
  skipCondition: string | string[];
  
  /** Regular expression pattern - if matched, don't extract data but don't skip either (array supports multiple patterns) */
  noExtractCondition: string | string[];
  
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
  
  /** Last modified timestamp - required for compatibility with ParserRule */
  lastModified: string;
}

// Add Cordova types needed for file access
declare global {
  interface Window {
    cordova?: {
      plugins?: {
        permissions?: {
          checkPermission: (permission: string, successCallback: (status: {hasPermission: boolean}) => void, errorCallback: () => void) => void;
          requestPermission: (permission: string, successCallback: (status: {hasPermission: boolean}) => void, errorCallback: () => void) => void;
        };
        filePicker?: {
          pickDirectory: (successCallback: (path: string) => void, errorCallback: (error: any) => void) => void;
        }
      };
      file?: {
        writeFile: (path: string, fileName: string, data: string, options: {replace: boolean}, successCallback: () => void, errorCallback: (error: any) => void) => void;
      };
    };
  }
}
