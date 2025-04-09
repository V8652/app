
import { ParserRule, getParserRules, addParserRule } from '@/lib/parser-rules';
import { toast } from '@/hooks/use-toast';
import { checkAndRequestStoragePermissions } from '@/lib/import-export';
import { saveToExportDirectory } from '@/lib/export-path';

// Helper function to safely convert string or string[] to CSV-safe string
function formatForCSV(value: string | string[]): string {
  if (Array.isArray(value)) {
    // For arrays, join the elements with a special delimiter that we can parse later
    // Make sure each item is properly escaped for CSV
    return value.map(item => item.replace(/"/g, '""')).join('||');
  } else if (typeof value === 'string') {
    // For strings, just escape double quotes
    return value.replace(/"/g, '""');
  }
  return '';
}

// Export parser rules to CSV
export async function exportParserRulesToCSV(): Promise<void> {
  try {
    console.log('Starting parser rules export process...');
    const rules = await getParserRules();
    console.log(`Retrieved ${rules.length} parser rules`);
    
    if (rules.length === 0) {
      console.log('No parser rules to export');
      toast({
        title: "No Data",
        description: "There are no parser rules to export.",
      });
      return;
    }
    
    // Create CSV header with all fields including merchantCommonPatterns
    let csv = 'id,name,senderMatch,subjectMatch,additionalSearchQuery,merchantNameRegex,amountRegex,dateRegex,categoryMatch,enabled,merchantCondition,paymentBank,skipCondition,noExtractCondition,priority,extractMerchantFromSubject,merchantCommonPatterns\n';
    console.log('CSV header created:', csv);
    
    // Add each rule as a row
    rules.forEach(rule => {
      try {
        // Escape commas and quotes in fields using our helper function
        const id = `"${rule.id ? formatForCSV(rule.id) : ''}"`;
        const name = `"${rule.name ? formatForCSV(rule.name) : ''}"`;
        const senderMatch = `"${formatForCSV(rule.senderMatch)}"`;
        const subjectMatch = `"${formatForCSV(rule.subjectMatch)}"`;
        const additionalSearchQuery = `"${rule.additionalSearchQuery ? formatForCSV(rule.additionalSearchQuery) : ''}"`;
        const merchantNameRegex = `"${rule.merchantNameRegex ? formatForCSV(rule.merchantNameRegex) : ''}"`;
        const amountRegex = `"${formatForCSV(rule.amountRegex)}"`;
        const dateRegex = `"${rule.dateRegex ? formatForCSV(rule.dateRegex) : ''}"`;
        const categoryMatch = `"${rule.categoryMatch ? formatForCSV(rule.categoryMatch) : ''}"`;
        const enabled = rule.enabled ? 'true' : 'false';
        const merchantCondition = `"${formatForCSV(rule.merchantCondition || '')}"`;
        const paymentBank = `"${rule.paymentBank ? formatForCSV(rule.paymentBank) : ''}"`;
        const skipCondition = `"${formatForCSV(rule.skipCondition || '')}"`;
        const noExtractCondition = `"${formatForCSV(rule.noExtractCondition || '')}"`;
        const priority = rule.priority?.toString() || '0';
        const extractMerchantFromSubject = rule.extractMerchantFromSubject ? 'true' : 'false';
        const merchantCommonPatterns = `"${formatForCSV(rule.merchantCommonPatterns || [])}"`;
        
        const row = `${id},${name},${senderMatch},${subjectMatch},${additionalSearchQuery},${merchantNameRegex},${amountRegex},${dateRegex},${categoryMatch},${enabled},${merchantCondition},${paymentBank},${skipCondition},${noExtractCondition},${priority},${extractMerchantFromSubject},${merchantCommonPatterns}\n`;
        csv += row;
      } catch (ruleError) {
        console.error('Error processing rule for CSV:', ruleError, rule);
      }
    });
    
    console.log('CSV data created, preparing to create blob');
    
    // Create a blob with the CSV data
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    console.log('Blob created for CSV data');
    
    // Get current date for filename
    const date = new Date();
    const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
    
    // Save the file to the export directory
    const result = await saveToExportDirectory(`parser_rules_${timestamp}.csv`, blob, 'text/csv');
    console.log('Save to export directory result:', result);
    
    if (!result) {
      throw new Error('Failed to save file');
    }
  } catch (error) {
    console.error('Error exporting parser rules to CSV:', error);
    toast({
      title: "Export Failed",
      description: `Could not export parser rules: ${(error as Error).message || 'Unknown error'}`,
      variant: "destructive"
    });
    throw error;
  }
}

// Helper function to parse CSV value back to string or string[] as needed
function parseCSVValue(value: string): string | string[] {
  if (!value) return '';
  
  // Remove surrounding quotes if present
  const unquotedValue = value.replace(/^"(.*)"$/, '$1');
  
  if (unquotedValue.includes('||')) {
    // If the value contains our delimiter, split it into an array
    return unquotedValue.split('||').map(item => item.replace(/""/g, '"'));
  }
  
  // Replace double quotes with single quotes (CSV escape format)
  return unquotedValue.replace(/""/g, '"');
}

// Import parser rules from CSV
export async function importParserRulesFromCSV(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    console.log('Starting parser rules import from:', file.name);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        if (!e.target?.result) {
          console.error('Failed to read CSV file');
          reject(new Error('Failed to read file'));
          return;
        }
        
        const csvData = e.target.result as string;
        console.log('CSV data loaded, length:', csvData.length);
        const lines = csvData.split('\n');
        console.log('CSV lines count:', lines.length);
        
        // Get header to detect column positions
        const headerLine = lines[0].trim();
        const headerColumns = parseCSVLine(headerLine);
        console.log('Detected CSV header columns:', headerColumns);
        
        // Create a map of column names to indices
        const columnMap = new Map<string, number>();
        headerColumns.forEach((column, index) => {
          columnMap.set(column.toLowerCase(), index);
        });
        
        // Skip header row
        const dataLines = lines.slice(1).filter(line => line.trim() !== '');
        console.log('CSV data lines count:', dataLines.length);
        
        let importedCount = 0;
        for (const line of dataLines) {
          try {
            // Parse CSV line
            const columns = parseCSVLine(line);
            
            if (columns.length >= 10) {
              // Use column map to get values, defaulting to empty values if column not found
              const name = columns[columnMap.get('name') || 1] || '';
              const senderMatch = parseCSVValue(columns[columnMap.get('sendermatch') || 2] || '');
              const subjectMatch = parseCSVValue(columns[columnMap.get('subjectmatch') || 3] || '');
              const additionalSearchQuery = columns[columnMap.get('additionalsearchquery') || 4] || '';
              const merchantNameRegex = columns[columnMap.get('merchantnameregex') || 5] || '';
              const amountRegex = parseCSVValue(columns[columnMap.get('amountregex') || 6] || '');
              const dateRegex = columns[columnMap.get('dateregex') || 7] || '';
              const categoryMatch = columns[columnMap.get('categorymatch') || 8] || '';
              const enabledCol = columnMap.get('enabled') || 9;
              const enabled = columns.length > enabledCol ? columns[enabledCol] === 'true' : true;
              const merchantCondition = parseCSVValue(columns[columnMap.get('merchantcondition') || 10] || '');
              const paymentBank = columns[columnMap.get('paymentbank') || 11] || '';
              const skipCondition = parseCSVValue(columns[columnMap.get('skipcondition') || 12] || '');
              const noExtractCondition = parseCSVValue(columns[columnMap.get('noextractcondition') || 13] || '');
              const priorityCol = columnMap.get('priority') || 14;
              const priority = columns.length > priorityCol ? parseInt(columns[priorityCol]) || 0 : 0;
              const extractMerchantFromSubjectCol = columnMap.get('extractmerchantfromsubject') || 15;
              const extractMerchantFromSubject = columns.length > extractMerchantFromSubjectCol ? 
                columns[extractMerchantFromSubjectCol] === 'true' : false;
              
              // Get merchant common patterns if present in the CSV
              const merchantCommonPatternsCol = columnMap.get('merchantcommonpatterns');
              const merchantCommonPatterns = merchantCommonPatternsCol !== undefined && columns.length > merchantCommonPatternsCol ? 
                parseCSVValue(columns[merchantCommonPatternsCol] || '') : [];
              
              console.log(`Creating parser rule: ${name}`);
              
              // Create new rule object
              await addParserRule({
                name,
                senderMatch,
                subjectMatch,
                additionalSearchQuery,
                merchantNameRegex,
                amountRegex,
                dateRegex,
                categoryMatch,
                enabled,
                merchantCondition,
                paymentBank,
                skipCondition,
                noExtractCondition,
                priority,
                extractMerchantFromSubject,
                merchantCommonPatterns: Array.isArray(merchantCommonPatterns) ? 
                  merchantCommonPatterns as string[] : 
                  merchantCommonPatterns ? [merchantCommonPatterns as string] : []
              });
              
              importedCount++;
            } else {
              console.warn('Skipping invalid CSV line, not enough columns:', columns.length);
            }
          } catch (lineError) {
            console.error('Error importing line:', line, lineError);
          }
        }
        
        console.log(`Successfully imported ${importedCount} parser rules`);
        resolve(importedCount);
      } catch (error) {
        console.error('Error importing parser rules from CSV:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('File reader error:', error);
      reject(new Error('Error reading file'));
    };
    
    console.log('Starting to read CSV file as text');
    reader.readAsText(file);
  });
}

// Helper function to properly parse CSV lines with quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (i + 1 < line.length && line[i + 1] === '"') {
        // Double quotes within quoted string - add a single quote
        currentValue += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // Add the last field
  result.push(currentValue);
  
  return result;
}
