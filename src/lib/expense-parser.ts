// Expense extraction and parsing logic

import { Expense, ExpenseCategory } from '@/types';
import { getEmailDetails, parseEmailBody } from './gmail-auth';
import { v4 as uuidv4 } from 'uuid';
import { applyParserRules } from './apply-parser-rules';
import { getParserRules, addParserRule } from './parser-rules';
import { getTransactions, addTransaction, updateTransaction } from './db';

// Main function to extract expense from email
export const extractExpenseFromEmail = async (messageId: string): Promise<Expense | null> => {
  try {
    // Get full email details
    const message = await getEmailDetails(messageId);
    
    // Get headers for subject and date
    const headers = message.payload.headers;
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const sender = headers.find((h: any) => h.name === 'From')?.value || '';
    const receivedDate = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();
    
    // Parse email body
    const body = parseEmailBody(message);
    
    // Create email data object for parser rules
    const emailData = {
      id: messageId,
      threadId: message.threadId,
      sender,
      subject,
      body,
      date: new Date(receivedDate)
    };
    
    // Check for duplicate transactions by emailId
    const existingTransactions = await getTransactions();
    const isDuplicate = existingTransactions.some(t => t.emailId === messageId);
    
    if (isDuplicate) {
      console.log(`Skipping duplicate email with ID: ${messageId}`);
      return null;
    }
    
    console.log(`Applying parser rules to email: ${subject}`);
    console.log(`From: ${sender}`);
    
    // Apply parser rules to extract expense data
    const result = await applyParserRules(emailData);
    
    if (result) {
      console.log('Successfully parsed email with custom rule:', result);
      return result;
    } else {
      console.log('No parser rules matched this email. Skipping extraction.');
      return null;
    }
  } catch (error) {
    console.error('Error extracting expense from email:', error);
    return null;
  }
};

// Process multiple emails to extract expenses
export const batchProcessEmails = async (messageIds: string[]): Promise<Expense[]> => {
  const expenses: Expense[] = [];
  
  for (const messageId of messageIds) {
    try {
      const expense = await extractExpenseFromEmail(messageId);
      if (expense) {
        // Check for duplicates by comparing amounts, dates, and merchant
        const isDuplicate = expenses.some(e => 
          e.amount === expense.amount && 
          e.merchantName === expense.merchantName &&
          Math.abs(new Date(e.date).getTime() - new Date(expense.date).getTime()) < 60000 // Within 1 minute
        );
        
        if (!isDuplicate) {
          expenses.push(expense);
        } else {
          console.log(`Skipping duplicate expense for ${expense.merchantName}`);
        }
      }
    } catch (error) {
      console.error(`Error processing email ${messageId}:`, error);
      // Continue processing other emails
    }
  }
  
  return expenses;
};

// Format date for Gmail search query
// Gmail requires dates in YYYY/M/D format (no leading zeros)
const formatDateForGmailSearch = (date: Date): string => {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

// List expense emails using parser rules as guidance and consider date range
export const listExpenseEmails = async (maxResults = 500, fromDate?: number, toDate?: number): Promise<any[]> => {
  try {
    // Get all parser rules to build a combined query
    const rules = await getParserRules();
    const enabledRules = rules.filter(rule => rule.enabled);
    
    console.log(`Found ${enabledRules.length} enabled parser rules out of ${rules.length} total rules`);
    
    if (enabledRules.length === 0) {
      console.log('No enabled parser rules found. Please create and enable some parser rules.');
      return [];
    }
    
    // Build the Gmail search query from the enabled rules
    let searchQuery = '';
    
    // Combine all sender matches with OR
    const allSenderPatterns: string[] = [];
    enabledRules.forEach(rule => {
      const senderPatterns = Array.isArray(rule.senderMatch) ? rule.senderMatch : [rule.senderMatch];
      senderPatterns.forEach(pattern => {
        if (pattern && pattern.trim() !== '' && !allSenderPatterns.includes(pattern)) {
          allSenderPatterns.push(pattern);
        }
      });
    });
    
    if (allSenderPatterns.length > 0) {
      const senderQueries = allSenderPatterns.map(pattern => `from:(${pattern})`);
      searchQuery += `(${senderQueries.join(' OR ')})`;
      console.log(`Added sender patterns to query: ${allSenderPatterns.join(', ')}`);
    } else {
      console.log('Warning: No sender patterns found in enabled rules');
    }
    
    // Add subject query if available (combine with OR)
    const allSubjectPatterns: string[] = [];
    enabledRules.forEach(rule => {
      if (!rule.subjectMatch) return;
      
      const subjectPatterns = Array.isArray(rule.subjectMatch) ? rule.subjectMatch : [rule.subjectMatch];
      subjectPatterns.forEach(pattern => {
        if (pattern && pattern.trim() !== '' && !allSubjectPatterns.includes(pattern)) {
          allSubjectPatterns.push(pattern);
        }
      });
    });
    
    if (allSubjectPatterns.length > 0) {
      const subjectQueries = allSubjectPatterns.map(pattern => `subject:(${pattern})`);
      if (searchQuery) {
        searchQuery += ` AND (${subjectQueries.join(' OR ')})`;
      } else {
        searchQuery += `(${subjectQueries.join(' OR ')})`;
      }
      console.log(`Added subject patterns to query: ${allSubjectPatterns.join(', ')}`);
    }
    
    // Add any additional search queries (combine with OR)
    const additionalQueries = enabledRules
      .filter(rule => rule.additionalSearchQuery && rule.additionalSearchQuery.trim() !== '')
      .map(rule => `(${rule.additionalSearchQuery})`);
    
    if (additionalQueries.length > 0) {
      if (searchQuery) {
        searchQuery += ` OR (${additionalQueries.join(' OR ')})`;
      } else {
        searchQuery += `(${additionalQueries.join(' OR ')})`;
      }
      console.log(`Added additional search patterns: ${additionalQueries.join(', ')}`);
    }
    
    // Handle date range with proper formatting for Gmail search query
    if (fromDate) {
      try {
        const fromDateObj = new Date(fromDate * 1000);
        console.log(`Original fromDate object: ${fromDateObj.toISOString()}`);
        
        // Format date for Gmail search query (YYYY/M/D)
        const formattedFromDate = formatDateForGmailSearch(fromDateObj);
        console.log(`Using fromDate: ${formattedFromDate} (from timestamp: ${fromDate})`);
        
        // Add to search query
        searchQuery += searchQuery ? ` after:${formattedFromDate}` : `after:${formattedFromDate}`;
      } catch (error) {
        console.error("Error formatting fromDate:", error);
      }
    } else {
      console.log('No fromDate provided');
    }
    
    if (toDate) {
      try {
        const toDateObj = new Date(toDate * 1000);
        console.log(`Original toDate object: ${toDateObj.toISOString()}`);
        
        // For "before:" we need to add 1 day since before: is exclusive
        toDateObj.setDate(toDateObj.getDate() + 1);
        
        // Format date for Gmail search query (YYYY/M/D)
        const formattedToDate = formatDateForGmailSearch(toDateObj);
        console.log(`Using toDate: ${formattedToDate} (from timestamp: ${toDate})`);
        
        // Add to search query
        searchQuery += searchQuery ? ` before:${formattedToDate}` : `before:${formattedToDate}`;
      } catch (error) {
        console.error("Error formatting toDate:", error);
      }
    } else {
      console.log('No toDate provided');
    }
    
    // Ensure we have a valid query or use a default
    if (!searchQuery.trim()) {
      // If no search parameters were added, use a fallback query that includes emails from the last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const formattedFallbackDate = formatDateForGmailSearch(ninetyDaysAgo);
      searchQuery = `after:${formattedFallbackDate}`;
      console.warn('Using fallback search query as no valid parameters were found:', searchQuery);
    }
    
    console.log('Final Gmail search query:', searchQuery);
    
    try {
      // Check if Gmail API is loaded
      if (!window.gapi?.client?.gmail) {
        console.log('Gmail API not loaded yet, attempting to load it');
        await window.gapi.client.load('gmail', 'v1');
      }
      
      // Make the API request to list messages
      console.log(`Making Gmail API request with query: "${searchQuery}" and maxResults: ${maxResults}`);
      const response = await window.gapi.client.gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: maxResults
      });
      
      const messages = response.result.messages || [];
      console.log(`Found ${messages.length} emails matching query`);
      
      if (messages.length === 0) {
        console.log(`No emails found matching the query. Check your parser rules and date range.`);
        console.log(`Date range: ${fromDate ? new Date(fromDate * 1000).toISOString() : 'none'} to ${toDate ? new Date(toDate * 1000).toISOString() : 'none'}`);
      }
      
      return messages;
    } catch (error) {
      console.error('Error listing expense emails:', error);
      // Log more details about the error
      if (error.result && error.result.error) {
        console.error('API Error details:', error.result.error);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error listing expense emails:', error);
    throw error;
  }
};

// Create sample parser rules if none exist to help users get started
export const ensureDefaultParserRules = async (): Promise<void> => {
  try {
    const rules = await getParserRules();
    
    // Add default rules if none exist
    if (rules.length === 0) {
      console.log('Creating default parser rules');
      
      // Amazon order confirmation
      await addParserRule({
        name: "Amazon Order",
        enabled: true,
        senderMatch: "amazon.com",
        subjectMatch: ["order", "purchase"],
        amountRegex: ["\\$(\\d+\\.\\d{2})", "Total: \\$(\\d+\\.\\d{2})"],
        merchantCondition: "Amazon",
        paymentBank: "Credit Card",
        skipCondition: "cancel|refund",
        noExtractCondition: "",
        dateRegex: "",
        priority: 10,
        additionalSearchQuery: "",
        extractMerchantFromSubject: false,
      });
      
      // PayPal receipt
      await addParserRule({
        name: "PayPal Receipt",
        enabled: true,
        senderMatch: "paypal.com",
        subjectMatch: ["receipt", "payment"],
        amountRegex: ["\\$(\\d+\\.\\d{1,2})", "Amount: \\$(\\d+\\.\\d{1,2})"],
        merchantCondition: "to (.*?)\\s",
        paymentBank: "PayPal",
        skipCondition: "",
        noExtractCondition: "",
        dateRegex: "",
        priority: 5,
        additionalSearchQuery: "",
        extractMerchantFromSubject: false,
      });
      
      // Bank Statement
      await addParserRule({
        name: "Bank Statement",
        enabled: true,
        senderMatch: ["bank", "statement", "transaction"],
        subjectMatch: ["statement", "transaction", "alert"],
        amountRegex: ["\\$(\\d+\\.\\d{2})", "(\\d+\\.\\d{2})"],
        merchantCondition: "",
        paymentBank: "Bank",
        skipCondition: "",
        noExtractCondition: "",
        dateRegex: "",
        priority: 3,
        additionalSearchQuery: "",
        extractMerchantFromSubject: false,
      });
      
      console.log('Default parser rules created successfully');
    } else {
      console.log(`Found ${rules.length} existing parser rules, skipping default rule creation`);
    }
  } catch (error) {
    console.error('Error creating default parser rules:', error);
  }
};
