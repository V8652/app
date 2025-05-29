import { Expense, Income, Transaction, ExpenseCategory, IncomeCategory } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getTransactions } from './db';
import { getSmsParserRules } from './sms-parser-rules';
import { getPreviousTransactionData } from './transaction-enricher';
import { SmsParserRule } from '@/types/sms-parser';
import { extractMerchantName } from './merchant-extract';

/**
 * Interface for the processed SMS message structure
 */
interface ProcessedSmsMessage {
  body: string;
  date: string;
  amount: number;
  merchantName: string;
  sender?: string;
}

/**
 * Tests an SMS message against the parser rules and returns the result
 * @param smsText The SMS text content to test
 * @param sender The SMS sender
 * @param fromDate Optional start date for the date range
 * @param toDate Optional end date for the date range
 * @param customRules Optional array of rules to test with instead of loading from storage
 * @returns Object containing the processed expense and rule details
 */
export const testSmsWithRules = async (
  smsText: string,
  sender: string,
  fromDate?: Date,
  toDate?: Date,
  customRules?: SmsParserRule[]
) => {
  try {
    // Use custom rules if provided, otherwise load from storage
    const rules = customRules || await getSmsParserRules();
    
    // Group rules by transaction type
    const expenseRules = rules.filter(rule => rule.transactionType === 'expense');
    const incomeRules = rules.filter(rule => rule.transactionType === 'income');
    
    // Sort rules by priority (highest first)
    const sortedExpenseRules = [...expenseRules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const sortedIncomeRules = [...incomeRules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Try expense rules first
    for (const rule of sortedExpenseRules) {
      if (!rule.enabled) continue;
      
      try {
        // Check if sender matches
        const senderPatterns = Array.isArray(rule.senderMatch) ? rule.senderMatch : [rule.senderMatch];
        const senderMatches = senderPatterns.some(pattern => {
          if (!pattern || pattern.trim() === '') return false;
          try {
            return sender.toLowerCase().includes(pattern.toLowerCase()) || 
                   new RegExp(pattern, 'i').test(sender);
          } catch (error) {
            console.error(`Invalid sender pattern: ${pattern}`, error);
            return false;
          }
        });
        
        if (!senderMatches) continue;
        
        // Check skip conditions
        if (rule.skipCondition) {
          const skipConditions = Array.isArray(rule.skipCondition) ? rule.skipCondition : [rule.skipCondition];
          const shouldSkip = skipConditions.some(condition => {
            if (!condition || condition.trim() === '') return false;
            try {
              return smsText.toLowerCase().includes(condition.toLowerCase()) ||
                     (condition.startsWith('/') && condition.lastIndexOf('/') > 1 &&
                      new RegExp(condition.slice(1, condition.lastIndexOf('/')), 
                               condition.slice(condition.lastIndexOf('/') + 1) || 'i')
                      .test(smsText));
            } catch (error) {
              console.error(`Invalid skip condition: ${condition}`, error);
              return false;
            }
          });
          
          if (shouldSkip) continue;
        }
        
        // Try to extract amount
        let amount: number | null = null;
        const amountPatterns = Array.isArray(rule.amountRegex) ? rule.amountRegex : [rule.amountRegex];
        
        for (const pattern of amountPatterns) {
          try {
            const amountRegex = new RegExp(pattern, 'i');
            const match = smsText.match(amountRegex);
            if (match && match[1]) {
              amount = Math.abs(parseFloat(match[1].replace(/,/g, '')));
              if (!isNaN(amount)) break;
            }
          } catch (error) {
            console.error(`Invalid amount pattern: ${pattern}`, error);
          }
        }
        
        if (!amount) continue;
        
        // Extract merchant name
        let merchantName = "Unknown Merchant";
        
        // Try merchant name extraction methods in order
        if (rule.merchantStartText || rule.merchantEndText) {
          merchantName = extractMerchantName(
            smsText,
            rule.merchantStartText,
            rule.merchantEndText,
            rule.merchantStartIndex || 1
          ) || "Unknown Merchant";
        }
        
        if (!merchantName || merchantName === "Unknown Merchant") {
          if (rule.merchantCondition) {
            const merchantPatterns = Array.isArray(rule.merchantCondition) ? 
              rule.merchantCondition : [rule.merchantCondition];
            
            for (const pattern of merchantPatterns) {
              try {
                const merchantRegex = new RegExp(pattern, 'i');
                const match = smsText.match(merchantRegex);
                if (match && match[1]) {
                  merchantName = match[1].trim();
                  break;
                }
              } catch (error) {
                console.error(`Invalid merchant pattern: ${pattern}`, error);
              }
            }
          }
        }
        
        // Apply merchant name cleaning patterns
        if (merchantName && rule.merchantCommonPatterns) {
          const commonPatterns = Array.isArray(rule.merchantCommonPatterns) ?
            rule.merchantCommonPatterns : [rule.merchantCommonPatterns];
            
          for (const pattern of commonPatterns) {
            try {
              const cleaningRegex = new RegExp(pattern, 'i');
              const match = merchantName.match(cleaningRegex);
              if (match && match[1]) {
                merchantName = match[1].trim();
                break;
              }
            } catch (error) {
              console.error(`Invalid merchant cleaning pattern: ${pattern}`, error);
            }
          }
        }
        
        // Create transaction date
        let transactionDate = new Date();
        if (fromDate && toDate) {
          const midDate = new Date((fromDate.getTime() + toDate.getTime()) / 2);
          transactionDate = midDate;
        }
        
        // Create transaction object
        const smsData: ProcessedSmsMessage = {
          body: smsText,
          date: transactionDate.toISOString(),
          amount: amount,
          merchantName: merchantName,
          sender: sender
        };
        
        // Create transaction with expense type
        const transaction = await createTransactionFromSms(smsData, rule.paymentBank, 'expense');
        
        return {
          expense: transaction,
          matchedRule: rule,
          transactionType: 'expense'
        };
      } catch (error) {
        console.error(`Error processing expense rule ${rule.name}:`, error);
      }
    }
    
    // If no expense match, try income rules
    for (const rule of sortedIncomeRules) {
      if (!rule.enabled) continue;
      
      try {
        // Check if sender matches
        const senderPatterns = Array.isArray(rule.senderMatch) ? rule.senderMatch : [rule.senderMatch];
        const senderMatches = senderPatterns.some(pattern => {
          if (!pattern || pattern.trim() === '') return false;
          try {
            return sender.toLowerCase().includes(pattern.toLowerCase()) || 
                   new RegExp(pattern, 'i').test(sender);
          } catch (error) {
            console.error(`Invalid sender pattern: ${pattern}`, error);
            return false;
          }
        });
        
        if (!senderMatches) continue;
        
        // Check skip conditions
        if (rule.skipCondition) {
          const skipConditions = Array.isArray(rule.skipCondition) ? rule.skipCondition : [rule.skipCondition];
          const shouldSkip = skipConditions.some(condition => {
            if (!condition || condition.trim() === '') return false;
            try {
              return smsText.toLowerCase().includes(condition.toLowerCase()) ||
                     (condition.startsWith('/') && condition.lastIndexOf('/') > 1 &&
                      new RegExp(condition.slice(1, condition.lastIndexOf('/')), 
                               condition.slice(condition.lastIndexOf('/') + 1) || 'i')
                      .test(smsText));
            } catch (error) {
              console.error(`Invalid skip condition: ${condition}`, error);
              return false;
            }
          });
          
          if (shouldSkip) continue;
        }
        
        // Try to extract amount
        let amount: number | null = null;
        const amountPatterns = Array.isArray(rule.amountRegex) ? rule.amountRegex : [rule.amountRegex];
        
        for (const pattern of amountPatterns) {
          try {
            const amountRegex = new RegExp(pattern, 'i');
            const match = smsText.match(amountRegex);
            if (match && match[1]) {
              amount = Math.abs(parseFloat(match[1].replace(/,/g, '')));
              if (!isNaN(amount)) break;
            }
          } catch (error) {
            console.error(`Invalid amount pattern: ${pattern}`, error);
          }
        }
        
        if (!amount) continue;
        
        // Extract merchant name
        let merchantName = "Unknown Merchant";
        
        // Try merchant name extraction methods in order
        if (rule.merchantStartText || rule.merchantEndText) {
          merchantName = extractMerchantName(
            smsText,
            rule.merchantStartText,
            rule.merchantEndText,
            rule.merchantStartIndex || 1
          ) || "Unknown Merchant";
        }
        
        if (!merchantName || merchantName === "Unknown Merchant") {
          if (rule.merchantCondition) {
            const merchantPatterns = Array.isArray(rule.merchantCondition) ? 
              rule.merchantCondition : [rule.merchantCondition];
            
            for (const pattern of merchantPatterns) {
              try {
                const merchantRegex = new RegExp(pattern, 'i');
                const match = smsText.match(merchantRegex);
                if (match && match[1]) {
                  merchantName = match[1].trim();
                  break;
                }
              } catch (error) {
                console.error(`Invalid merchant pattern: ${pattern}`, error);
              }
            }
          }
        }
        
        // Apply merchant name cleaning patterns
        if (merchantName && rule.merchantCommonPatterns) {
          const commonPatterns = Array.isArray(rule.merchantCommonPatterns) ?
            rule.merchantCommonPatterns : [rule.merchantCommonPatterns];
            
          for (const pattern of commonPatterns) {
            try {
              const cleaningRegex = new RegExp(pattern, 'i');
              const match = merchantName.match(cleaningRegex);
              if (match && match[1]) {
                merchantName = match[1].trim();
                break;
              }
            } catch (error) {
              console.error(`Invalid merchant cleaning pattern: ${pattern}`, error);
            }
          }
        }
        
        // Create transaction date
        let transactionDate = new Date();
        if (fromDate && toDate) {
          const midDate = new Date((fromDate.getTime() + toDate.getTime()) / 2);
          transactionDate = midDate;
        }
        
        // Create transaction object
        const smsData: ProcessedSmsMessage = {
          body: smsText,
          date: transactionDate.toISOString(),
          amount: amount,
          merchantName: merchantName,
          sender: sender
        };
        
        // Create transaction with income type
        const transaction = await createTransactionFromSms(smsData, rule.paymentBank, 'income');
        
        return {
          expense: transaction,
          matchedRule: rule,
          transactionType: 'income'
        };
      } catch (error) {
        console.error(`Error processing income rule ${rule.name}:`, error);
      }
    }
    
    // If no expense or income match, return a consistent object
    return {
      expense: null,
      matchedRule: null,
      transactionType: null
    };
  } catch (error) {
    console.error('Error testing SMS with rules:', error);
    return {
      expense: null,
      matchedRule: null,
      transactionType: null
    };
  }
};

/**
 * Checks if a transaction already exists to avoid duplicates
 * @param smsData The processed SMS message data
 * @returns Promise<boolean> True if a duplicate exists, false otherwise
 */
export const isTransactionDuplicate = async (smsData: ProcessedSmsMessage & { id?: string; }): Promise<boolean> => {
  try {
    // Get existing transactions
    const transactions = await getTransactions();
    const smsDate = new Date(smsData.date);
    // Look for similar transactions with matching timestamp, amount, merchant name, and ID (if present)
    const duplicates = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const timeDiff = Math.abs(transactionDate.getTime() - smsDate.getTime());
      const isWithinTimeWindow = timeDiff < 30 * 1000; // 30 seconds window
      const amountMatch = transaction.amount === smsData.amount;
      const merchantMatch = transaction.merchantName.toLowerCase() === smsData.merchantName.toLowerCase();
      const idMatch = smsData.id ? transaction.id === smsData.id : false;
      // If ID is present, use it for comparison; otherwise, use other fields
      if (smsData.id) {
        return idMatch;
      } else {
        return isWithinTimeWindow && amountMatch && merchantMatch;
      }
    });
    return duplicates.length > 0;
  } catch (error) {
    console.error('Error checking for duplicate transactions:', error);
    return false;
  }
};

/**
 * Creates a Transaction object from SMS data
 * @param smsData The processed SMS message data
 * @param bankName The name of the bank (payment method)
 * @param type The transaction type ('expense' or 'income')
 * @returns Transaction object ready to be saved
 */
export const createTransactionFromSms = async (
  smsData: ProcessedSmsMessage, 
  bankName: string,
  type: 'expense' | 'income' = 'expense'
): Promise<Transaction> => {
  const currentDate = smsData.date || new Date().toISOString();
  
  // Get previous transaction data for this merchant
  const previousData = await getPreviousTransactionData(smsData.merchantName);
  
  // Set category based on previous transactions or default
  let category: string;
  if (previousData && previousData.category) {
    category = previousData.category;
  } else {
    category = type === 'income' ? 'other' as IncomeCategory : 'other' as ExpenseCategory;
  }
  
  // Set notes based on previous transactions or default
  let notes: string;
  if (previousData && previousData.notes) {
    notes = previousData.notes;
  } else {
    notes = '';
  }
  
  const finalAmount = smsData.amount;
  
  console.log(`Creating ${type} transaction for ${smsData.merchantName} with amount ${finalAmount}`);
  
  return {
    id: uuidv4(),
    merchantName: smsData.merchantName,
    amount: finalAmount,
    currency: 'INR',
    date: currentDate,
    category: category,
    notes: notes,
    paymentMethod: bankName,
    type: type,
    sender: smsData.sender
  };
};

/**
 * Creates an Expense object from SMS data (legacy function)
 * @param smsData The processed SMS message data
 * @param bankName The name of the bank (payment method)
 * @returns Expense object ready to be saved
 */
export const createExpenseFromSms = async (smsData: ProcessedSmsMessage, bankName: string): Promise<Expense> => {
  const transaction = await createTransactionFromSms(smsData, bankName, 'expense');
  return transaction as Expense;
};
