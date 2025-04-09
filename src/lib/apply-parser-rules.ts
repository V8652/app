
import { Expense, ExpenseCategory } from '@/types';
import { ExpenseParserRule } from '@/types/expense-parser';
import { getParserRules, addParserRule, ExpenseParserRuleInput } from './parser-rules';
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
    const sortedRules = parserRules.sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      console.log(`\nTrying rule: ${rule.name} (priority: ${rule.priority})`);
      
      if (!rule.enabled) {
        console.log(`Skipping disabled rule: ${rule.name}`);
        continue;
      }
      
      // Check if sender matches
      const senderMatch = emailData.sender.includes(rule.senderMatch);
      console.log(`Sender match check: ${senderMatch} (looking for "${rule.senderMatch}" in "${emailData.sender}")`);
      if (!senderMatch) {
        console.log(`Sender does not match for rule: ${rule.name}`);
        continue;
      }
      
      // Check if subject matches (if specified)
      if (rule.subjectMatch) {
        const subjectMatch = emailData.subject.includes(rule.subjectMatch);
        console.log(`Subject match check: ${subjectMatch} (looking for "${rule.subjectMatch}" in "${emailData.subject}")`);
        if (!subjectMatch) {
          console.log(`Subject does not match for rule: ${rule.name}`);
          continue;
        }
      }
      
      // Skip if skip condition is met
      if (rule.skipCondition) {
        const skipRegex = new RegExp(rule.skipCondition, 'i');
        const shouldSkip = skipRegex.test(emailData.body);
        console.log(`Skip condition check: ${shouldSkip} (regex: ${rule.skipCondition})`);
        if (shouldSkip) {
          console.log(`Skipping email due to skip condition for rule: ${rule.name}`);
          continue;
        }
      }
      
      // Extract amount using regex
      console.log(`Attempting to extract amount using regex: ${rule.amountRegex}`);
      const amountRegex = new RegExp(rule.amountRegex, 'i');
      const amountMatch = emailData.body.match(amountRegex);
      console.log('Amount match result:', amountMatch);
      
      if (!amountMatch || !amountMatch[1]) {
        console.log(`Amount not found using regex for rule: ${rule.name}`);
        continue;
      }
      
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      console.log(`Extracted amount: ${amount}`);
      
      // Extract merchant name using multiple strategies
      let merchantName = 'Unknown Merchant';
      let merchantFound = false;
      
      // Determine which source to extract merchant from based on the rule setting
      const merchantSource = rule.extractMerchantFromSubject ? emailData.subject : emailData.body;
      console.log(`Using ${rule.extractMerchantFromSubject ? "subject" : "body"} for merchant extraction`);
      
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
      
      // Strategy 2: Try using merchantCondition regex if no match found and if specified
      if (!merchantFound && rule.merchantCondition && rule.merchantCondition.trim() !== '') {
        console.log(`Strategy 2: Attempting to extract merchant using regex: ${rule.merchantCondition}`);
        try {
          const merchantRegex = new RegExp(rule.merchantCondition, 'i');
          const merchantMatch = merchantSource.match(merchantRegex);
          console.log(`Merchant match result from ${rule.extractMerchantFromSubject ? "subject" : "body"}:`, merchantMatch);
          
          if (merchantMatch && merchantMatch[1]) {
            // Extract merchant name
            merchantName = merchantMatch[1].trim();
            console.log(`Extracted merchant name: ${merchantName}`);
            merchantFound = true;
          } else {
            console.log(`No merchant name found using merchantCondition regex`);
          }
        } catch (error) {
          console.error(`Error applying merchant regex "${rule.merchantCondition}" to ${rule.extractMerchantFromSubject ? "subject" : "body"}:`, error);
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
      
      // Check for no extract condition
      if (rule.noExtractCondition && rule.noExtractCondition.trim() !== '') {
        try {
          const noExtractRegex = new RegExp(rule.noExtractCondition, 'i');
          const shouldNotExtract = noExtractRegex.test(emailData.body);
          console.log(`No extract condition check: ${shouldNotExtract} (regex: ${rule.noExtractCondition})`);
          
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
        } catch (error) {
          console.error(`Error applying no extract regex "${rule.noExtractCondition}":`, error);
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
          if (merchantNote.note) {
            notes = merchantNote.note;
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

// Ensure default parser rules are created
export const ensureDefaultParserRules = async (): Promise<void> => {
  const rules = await getParserRules();
  
  // Add default rules if none exist
  if (rules.length === 0) {
    console.log('Creating default parser rules');
    
    try {
      // Amazon order confirmation
      await addParserRule({
        name: "Amazon Order",
        enabled: true,
        senderMatch: "amazon.com",
        subjectMatch: "order",
        amountRegex: "\\$(\\d+\\.\\d{2})",
        merchantCondition: "",
        paymentBank: "",
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
        subjectMatch: "receipt",
        amountRegex: "\\$(\\d+\\.\\d{1,2})",
        merchantCondition: "to (.*?)\\s",
        paymentBank: "PayPal",
        skipCondition: "",
        noExtractCondition: "",
        dateRegex: "",
        priority: 5,
        additionalSearchQuery: "",
        extractMerchantFromSubject: false,
      });
      
      console.log('Default parser rules created');
    } catch (error) {
      console.error('Error creating default parser rules:', error);
    }
  }
};
