
// Expense extraction and parsing logic

import { Expense, ExpenseCategory } from '@/types';
import { getEmailDetails, parseEmailBody } from './gmail-auth';
import { v4 as uuidv4 } from 'uuid';
import { applyParserRules } from './apply-parser-rules';
import { getParserRules } from './parser-rules';
import { getTransactions, addTransaction, updateTransaction } from './db';
import { toast } from '@/hooks/use-toast';

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
    throw error; // Propagate error up for better error handling
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

// List expense emails using parser rules as guidance and consider date range
export const listExpenseEmails = async (maxResults = 500, fromDate?: number, toDate?: number): Promise<any[]> => {
  try {
    console.log(`Running listExpenseEmails with fromDate: ${fromDate}, toDate: ${toDate}`);
    
    // Validate Gmail API access before proceeding
    if (!window.gapi?.client?.gmail) {
      try {
        console.log('Gmail API not loaded, attempting to load it');
        await window.gapi.client.load('gmail', 'v1');
      } catch (error) {
        console.error('Failed to load Gmail API:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to Gmail API. Please try reconnecting your account.',
          variant: 'destructive',
        });
        throw new Error('Gmail API initialization failed. Please reconnect your account.');
      }
    }
    
    // Check if we have a valid token
    try {
      const token = window.gapi.client.getToken();
      if (!token) {
        console.error('No valid token available');
        toast({
          title: 'Authentication Error',
          description: 'Your session has expired. Please reconnect your Gmail account.',
          variant: 'destructive',
        });
        throw new Error('Authentication error: No valid token found. Please reconnect your Gmail account.');
      }
    } catch (tokenError) {
      console.error('Error checking token:', tokenError);
      throw new Error('Authentication error: Failed to validate your session. Please reconnect your Gmail account.');
    }
    
    // Get all parser rules to build a combined query
    const rules = await getParserRules();
    const enabledRules = rules.filter(rule => rule.enabled);
    
    if (enabledRules.length === 0) {
      console.log('No enabled parser rules found');
      toast({
        title: 'No Parser Rules',
        description: 'Please create and enable at least one parser rule in Settings > Parsing.',
        variant: 'destructive',
      });
      return [];
    }
    
    // Build the Gmail search query from the enabled rules
    let searchQuery = '';
    
    // Combine all sender matches with OR
    const senderQueries = enabledRules
      .filter(rule => rule.senderMatch && rule.senderMatch.trim() !== '')
      .map(rule => `from:(${rule.senderMatch})`);
      
    if (senderQueries.length > 0) {
      searchQuery += `(${senderQueries.join(' OR ')})`;
    }
    
    // Add subject query if available (combine with OR)
    const subjectRules = enabledRules.filter(rule => rule.subjectMatch && rule.subjectMatch.trim() !== '');
    if (subjectRules.length > 0) {
      const subjectQueries = subjectRules.map(rule => `subject:(${rule.subjectMatch})`);
      if (searchQuery) {
        searchQuery += ` AND (${subjectQueries.join(' OR ')})`;
      } else {
        searchQuery += `(${subjectQueries.join(' OR ')})`;
      }
    }
    
    // Add any additional search queries (combine with OR)
    const additionalQueries = enabledRules
      .filter(rule => rule.additionalSearchQuery && rule.additionalSearchQuery.trim() !== '')
      .map(rule => `(${rule.additionalSearchQuery})`);
    
    if (additionalQueries.length > 0) {
      if (searchQuery) {
        searchQuery += ` AND (${additionalQueries.join(' OR ')})`;
      } else {
        searchQuery += `(${additionalQueries.join(' OR ')})`;
      }
    }
    
    // Add date range filter if provided - Using proper date format for Gmail query
    if (fromDate) {
      // Convert UNIX timestamp to Gmail date format (YYYY/MM/DD)
      const fromDateObj = new Date(fromDate * 1000);
      const formattedFromDate = `${fromDateObj.getFullYear()}/${(fromDateObj.getMonth() + 1).toString().padStart(2, '0')}/${fromDateObj.getDate().toString().padStart(2, '0')}`;
      
      // Use the Gmail "after:" operator for the from date
      if (searchQuery) {
        searchQuery += ` after:${formattedFromDate}`;
      } else {
        searchQuery += `after:${formattedFromDate}`;
      }
      
      console.log(`Added after:${formattedFromDate} to query`);
    }
    
    if (toDate) {
      // Convert UNIX timestamp to Gmail date format (YYYY/MM/DD)
      const toDateObj = new Date(toDate * 1000);
      // Add 1 day to make it inclusive of the end date (before: is exclusive)
      // Gmail's 'before:' is exclusive of the specified date
      toDateObj.setDate(toDateObj.getDate() + 1);
      const formattedToDate = `${toDateObj.getFullYear()}/${(toDateObj.getMonth() + 1).toString().padStart(2, '0')}/${toDateObj.getDate().toString().padStart(2, '0')}`;
      
      // Use the Gmail "before:" operator for the to date
      searchQuery += ` before:${formattedToDate}`;
      
      console.log(`Added before:${formattedToDate} to query`);
    }
    
    console.log('Using Gmail search query:', searchQuery);
    
    try {
      // Attempt to call the Gmail API with retry mechanism
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          const response = await window.gapi.client.gmail.users.messages.list({
            userId: 'me',
            q: searchQuery || 'is:unread',  // Use a fallback query if no rules matched
            maxResults: maxResults
          });
          
          const messages = response.result.messages || [];
          console.log(`Found ${messages.length} emails matching query`);
          
          // Check if no emails were found
          if (!messages || messages.length === 0) {
            console.log('No emails found matching the query and date range');
            return [];
          }
          
          // Log some information about the first few messages to help with debugging
          if (messages.length > 0) {
            console.log(`First few message IDs: ${messages.slice(0, 3).map(m => m.id).join(', ')}`);
          }
          
          return messages;
        } catch (apiError: any) {
          // Check if error is authorization-related (401)
          if (apiError?.status === 401 || (apiError?.result?.error?.code === 401)) {
            if (retryCount < maxRetries) {
              console.log(`Authentication error, retry attempt ${retryCount + 1}`);
              retryCount++;
              
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            } else {
              console.error('Authentication error after retries:', apiError);
              throw new Error('Authentication error: Your session has expired. Please reconnect your Gmail account.');
            }
          } else {
            // For other errors, throw immediately
            console.error('Gmail API error details:', apiError?.result?.error || apiError);
            
            if (apiError?.status === 403) {
              throw new Error('Permission denied: You may need to reconnect your Gmail account with proper permissions.');
            } else if (apiError?.status === 429) {
              throw new Error('Rate limit exceeded: Too many requests to Gmail API. Please try again later.');
            } else if (apiError?.result?.error?.message) {
              throw new Error(`Gmail API error: ${apiError.result.error.message}`);
            } else {
              throw new Error('Failed to retrieve emails from Gmail. Please try again.');
            }
          }
        }
      }
      
      throw new Error('Failed to communicate with Gmail after several attempts. Please try again later.');
    } catch (error) {
      console.error('Error listing expense emails:', error);
      throw error; // Propagate error up for better error handling
    }
  } catch (error) {
    console.error('Error listing expense emails:', error);
    throw error; // Propagate error up for better error handling
  }
};
