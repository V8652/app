
import { Expense, ExpenseCategory } from '@/types';
import { getParserRules, ParserRule, addParserRule } from './parser-rules';
import { getMerchantNoteByName } from '@/lib/merchant-notes';

// Function to extract expense data from email content based on parser rules
export const applyParserRules = async (emailData: any): Promise<Expense | null> => {
  try {
    console.log('Starting to apply parser rules to email:', {
      sender: emailData.sender,
      subject: emailData.subject,
      date: emailData.date
    });
    
    const parserRules = await getParserRules();
    console.log(`Found ${parserRules.length} parser rules to apply`);
    
    // Sort rules by priority (highest first)
    const sortedRules = parserRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    for (const rule of sortedRules) {
      console.log(`\nTrying rule: ${rule.name} (priority: ${rule.priority || 0})`);
      
      if (!rule.enabled) {
        console.log(`Skipping disabled rule: ${rule.name}`);
        continue;
      }
      
      // Check if sender matches any of the sender patterns
      const senderPatterns = Array.isArray(rule.senderMatch) ? rule.senderMatch : [rule.senderMatch];
      const senderMatch = senderPatterns.some(pattern => emailData.sender.includes(pattern));
      
      console.log(`Sender match check: ${senderMatch} (checking "${senderPatterns.join(', ')}" in "${emailData.sender}")`);
      if (!senderMatch) {
        console.log(`Sender does not match for rule: ${rule.name}`);
        continue;
      }
      
      // Check if subject matches any of the subject patterns (if specified)
      if (rule.subjectMatch && (
          (Array.isArray(rule.subjectMatch) && rule.subjectMatch.length > 0) || 
          (!Array.isArray(rule.subjectMatch) && rule.subjectMatch.trim() !== '')
      )) {
        const subjectPatterns = Array.isArray(rule.subjectMatch) ? rule.subjectMatch : [rule.subjectMatch];
        const subjectMatch = subjectPatterns.some(pattern => emailData.subject.includes(pattern));
        
        console.log(`Subject match check: ${subjectMatch} (checking "${subjectPatterns.join(', ')}" in "${emailData.subject}")`);
        if (!subjectMatch) {
          console.log(`Subject does not match for rule: ${rule.name}`);
          continue;
        }
      }
      
      // Skip if any skip condition is met
      if (rule.skipCondition) {
        const skipPatterns = Array.isArray(rule.skipCondition) ? rule.skipCondition : [rule.skipCondition];
        const shouldSkip = skipPatterns.some(pattern => {
          if (!pattern || pattern.trim() === '') return false;
          try {
            const skipRegex = new RegExp(pattern, 'i');
            return skipRegex.test(emailData.body);
          } catch (error) {
            console.error(`Error with skip condition regex "${pattern}":`, error);
            return false;
          }
        });
        
        console.log(`Skip condition check: ${shouldSkip} (patterns: ${skipPatterns.join(', ')})`);
        if (shouldSkip) {
          console.log(`Skipping email due to skip condition for rule: ${rule.name}`);
          continue;
        }
      }
      
      // Try all amount regex patterns until one matches
      console.log(`Attempting to extract amount using regex patterns`);
      const amountPatterns = Array.isArray(rule.amountRegex) ? rule.amountRegex : [rule.amountRegex];
      
      let amountMatch = null;
      let matchedAmountPattern = '';
      
      for (const pattern of amountPatterns) {
        if (!pattern || pattern.trim() === '') continue;
        try {
          const amountRegex = new RegExp(pattern, 'i');
          const match = emailData.body.match(amountRegex);
          if (match && match[1]) {
            amountMatch = match;
            matchedAmountPattern = pattern;
            break;
          }
        } catch (error) {
          console.error(`Error with amount regex "${pattern}":`, error);
        }
      }
      
      console.log('Amount match result:', amountMatch, 'from pattern:', matchedAmountPattern);
      
      if (!amountMatch || !amountMatch[1]) {
        console.log(`Amount not found using any regex pattern for rule: ${rule.name}`);
        continue;
      }
      
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      console.log(`Extracted amount: ${amount}`);
      
      // Extract merchant name using multiple strategies
      let merchantName = 'Unknown Merchant';
      let merchantFound = false;
      
      // Determine which source to extract merchant from based on the rule setting
      const merchantSource = rule.extractMerchantFromSubject === true ? emailData.subject : emailData.body;
      console.log(`Using ${rule.extractMerchantFromSubject === true ? "subject" : "body"} for merchant extraction`);
      
      // Strategy 1: Try using merchantCommonPatterns first if specified
      if (rule.merchantCommonPatterns && rule.merchantCommonPatterns.length > 0) {
        console.log(`Strategy 1: Attempting to extract merchant using common patterns first`);
        
        for (const pattern of rule.merchantCommonPatterns) {
          try {
            if (!pattern || pattern.trim() === '') continue;
            
            console.log(`Trying common pattern "${pattern}" on "${merchantSource}"`);
            const commonRegex = new RegExp(pattern, 'i');
            const commonMatch = merchantSource.match(commonRegex);
            
            if (commonMatch && commonMatch[1]) {
              merchantName = commonMatch[1].trim();
              console.log(`Extracted merchant name using common pattern "${pattern}": ${merchantName}`);
              merchantFound = true;
              break;
            } else {
              console.log(`Pattern "${pattern}" did not match or no capture group`);
            }
          } catch (error) {
            console.error(`Error applying merchant common pattern "${pattern}":`, error);
          }
        }
      }
      
      // Strategy 2: Try using merchantCondition regex patterns if no match found
      if (!merchantFound && rule.merchantCondition) {
        console.log(`Strategy 2: Attempting to extract merchant using regex patterns`);
        
        const merchantPatterns = Array.isArray(rule.merchantCondition) ? rule.merchantCondition : [rule.merchantCondition];
        
        for (const pattern of merchantPatterns) {
          try {
            if (!pattern || pattern.trim() === '') continue;
            
            console.log(`Trying merchant condition "${pattern}" on "${merchantSource}"`);
            const merchantRegex = new RegExp(pattern, 'i');
            const merchantMatch = merchantSource.match(merchantRegex);
            
            if (merchantMatch && merchantMatch[1]) {
              merchantName = merchantMatch[1].trim();
              console.log(`Extracted merchant name using condition "${pattern}": ${merchantName}`);
              merchantFound = true;
              break;
            } else {
              console.log(`Pattern "${pattern}" did not match or no capture group`);
            }
          } catch (error) {
            console.error(`Error applying merchant condition "${pattern}":`, error);
          }
        }
      }
      
      // Strategy 3: Extract from sender as last resort
      if (!merchantFound) {
        console.log('Strategy 3: No merchant found, extracting from sender');
        merchantName = extractMerchantFromSender(emailData.sender);
        merchantFound = true;
      }
      
      // Extract date using regex (if specified)
      let transactionDate = emailData.date;
      if (rule.dateRegex && rule.dateRegex.trim() !== '') {
        console.log(`Attempting to extract date using regex: ${rule.dateRegex}`);
        try {
          const dateRegex = new RegExp(rule.dateRegex, 'i');
          const dateMatch = emailData.body.match(dateRegex);
          console.log('Date match result:', dateMatch);
          
          if (dateMatch && dateMatch[1]) {
            try {
              const parsedDate = new Date(dateMatch[1]);
              if (!isNaN(parsedDate.getTime())) {
                transactionDate = parsedDate;
                console.log(`Extracted date: ${transactionDate}`);
              } else {
                console.log(`Extracted date string "${dateMatch[1]}" is not a valid date`);
              }
            } catch (error) {
              console.error('Error parsing date:', error);
            }
          } else {
            console.log(`Date not found using regex for rule: ${rule.name}`);
          }
        } catch (error) {
          console.error(`Error applying date regex "${rule.dateRegex}":`, error);
        }
      }
      
      // Check for no extract condition - if ANY pattern matches, don't extract
      if (rule.noExtractCondition) {
        const noExtractPatterns = Array.isArray(rule.noExtractCondition) ? rule.noExtractCondition : [rule.noExtractCondition];
        const shouldNotExtract = noExtractPatterns.some(pattern => {
          if (!pattern || pattern.trim() === '') return false;
          try {
            const noExtractRegex = new RegExp(pattern, 'i');
            return noExtractRegex.test(emailData.body);
          } catch (error) {
            console.error(`Error with no extract regex "${pattern}":`, error);
            return false;
          }
        });
        
        console.log(`No extract condition check: ${shouldNotExtract} (patterns: ${noExtractPatterns.join(', ')})`);
        
        if (shouldNotExtract) {
          console.log(`No extract condition met for rule: ${rule.name}. Processing but not extracting.`);
          
          return {
            id: emailData.id,
            emailId: emailData.id,
            date: transactionDate.toISOString(),
            amount: 0,
            merchantName: merchantName,
            category: 'other',
            description: `Processed - No Extract: ${emailData.subject}`,
            currency: 'INR',
            paymentMethod: rule.paymentBank || 'Unknown Bank',
            type: 'expense'
          };
        }
      }
      
      // If all checks pass, extract expense data
      console.log(`✅ Successfully extracted expense using rule: ${rule.name}`);
      console.log(`Final merchant name: ${merchantName}`);
      
      // Check for existing merchant notes to apply
      let category: ExpenseCategory = 'other';
      let notes = '';
      
      try {
        const merchantNote = await getMerchantNoteByName(merchantName);
        if (merchantNote) {
          console.log(`Found merchant note for ${merchantName}`);
          if (merchantNote.category) {
            category = merchantNote.category as ExpenseCategory;
            console.log(`Applied category from merchant note: ${category}`);
          }
          if (merchantNote.notes) {
            notes = merchantNote.notes;
            console.log(`Applied note from merchant note: ${notes}`);
          }
        }
      } catch (error) {
        console.error('Error applying merchant note:', error);
      }
      
      return {
        id: emailData.id,
        emailId: emailData.id,
        date: transactionDate.toISOString(),
        amount: amount,
        merchantName: merchantName,
        category: category,
        description: emailData.subject,
        notes: notes,
        currency: 'INR',
        paymentMethod: rule.paymentBank || 'Unknown Bank',
        type: 'expense'
      };
    }
    
    console.log('⚠️ No matching parser rules found for email.');
    return null;
  } catch (error) {
    console.error('Error applying parser rules:', error);
    return null;
  }
};

// Helper function to extract merchant name from sender
function extractMerchantFromSender(sender: string, defaultName = 'Unknown Merchant'): string {
  console.log(`Extracting merchant from sender: ${sender}`);
  
  // Try to extract name part from "Name <email>" format
  const senderParts = sender.split('<');
  if (senderParts.length > 1 && senderParts[0].trim()) {
    const name = senderParts[0].trim();
    console.log(`Extracted merchant name from sender display name: ${name}`);
    return name;
  }
  
  // Try to extract from email domain (e.g., amazon.com -> amazon)
  try {
    const emailParts = sender.split('@');
    if (emailParts.length > 1) {
      const domain = emailParts[1].split('.')[0];
      if (domain && domain.length > 0) {
        // Capitalize first letter
        const capitalizedDomain = domain.charAt(0).toUpperCase() + domain.slice(1);
        console.log(`Extracted merchant name from sender domain: ${capitalizedDomain}`);
        return capitalizedDomain;
      }
    }
  } catch (e) {
    console.error('Error extracting domain from sender:', e);
  }
  
  console.log(`Couldn't extract merchant name from sender, using default: ${defaultName}`);
  return defaultName;
}

// Export the ensureDefaultParserRules function that was previously commented out
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
