
import { Transaction, ExpenseCategory, IncomeCategory } from '@/types';
import { getTransactions, addTransaction, getUserCategories } from '@/lib/db';
import { isAndroidDevice } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { saveToExportDirectory } from '@/lib/export-path';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';

// Function to check and request storage permissions on Android
export const checkAndRequestStoragePermissions = async (): Promise<boolean> => {
  if (!isAndroidDevice()) return true;
  
  try {
    console.log('Checking storage permissions on Android...');
    
    // Updated way to access Permissions plugin
    if (Capacitor.isPluginAvailable('Permissions')) {
      console.log("Using Capacitor Permissions plugin");
      
      // Check storage permission - use the dynamic access pattern to avoid type errors
      const Permissions = (Capacitor as any).Plugins.Permissions;
      const storagePermission = await Permissions.query({ name: 'storage' });
      console.log("Storage permission status:", storagePermission.state);
      
      if (storagePermission.state !== 'granted') {
        console.log("Requesting storage permission...");
        const requestResult = await Permissions.request({ name: 'storage' });
        console.log("Storage permission request result:", requestResult);
        
        if (requestResult.state !== 'granted') {
          console.error("Storage permission denied");
          toast({
            title: "Permission Required",
            description: "Storage access is needed to import files. Please grant permission in your device settings.",
            variant: "destructive"
          });
          return false;
        }
      }
      
      // For Android 13+ also check for media permissions
      const apiLevel = parseInt((navigator.userAgent.match(/Android\s([0-9]+)/) || [])[1] || '0', 10);
      console.log("Android API level:", apiLevel);
      
      if (apiLevel >= 33) {
        try {
          console.log("Android 13+ detected, requesting media permissions");
          // Request media permissions for newer Android
          const mediaTypes = ['photos', 'videos', 'audio'];
          for (const media of mediaTypes) {
            try {
              const mediaState = await Permissions.query({ name: media as any });
              if (mediaState.state !== 'granted') {
                await Permissions.request({ name: media as any });
              }
            } catch (e) {
              console.log(`Error requesting ${media} permission:`, e);
              // Continue even if this fails
            }
          }
        } catch (e) {
          console.log("Error checking media permissions:", e);
          // Continue anyway as these are supplementary
        }
      }
      
      return true;
    } else {
      console.log("Permissions plugin not available, assuming permissions are granted");
      // If no permissions plugin, assume permissions are granted (web)
      return true;
    }
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
};

// Function to pick a file using the native file picker on Android
export const pickFile = async (mimeTypes: string[] = ['text/csv']): Promise<File | null> => {
  try {
    console.log('Starting file picker with mimeTypes:', mimeTypes);
    
    // Check if running on Android with Capacitor
    if (isAndroidDevice() && Capacitor.isNativePlatform()) {
      console.log('Using Capacitor FilePicker plugin for Android');
      
      // Request permissions first
      const hasPermission = await checkAndRequestStoragePermissions();
      if (!hasPermission) {
        console.log('Permission denied for file access');
        return null;
      }
      
      try {
        // Force a small delay to ensure UI is ready (helps on some Android devices)
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Use FilePicker plugin - with more specific error handling
        const result = await FilePicker.pickFiles({
          types: mimeTypes,
          readData: true // Important: ensure we get the file data
        });
        
        console.log('FilePicker result received:', result ? 'success' : 'null');
        
        if (result && result.files && result.files.length > 0) {
          const fileData = result.files[0];
          console.log('File selected:', fileData.name, 'Data available:', !!fileData.data);
          
          // If we have base64 data directly, use that
          if (fileData.data) {
            const byteCharacters = atob(fileData.data);
            const byteArrays = [];
            
            for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
              const slice = byteCharacters.slice(offset, offset + 1024);
              
              const byteNumbers = new Array(slice.length);
              for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
              }
              
              const byteArray = new Uint8Array(byteNumbers);
              byteArrays.push(byteArray);
            }
            
            const blob = new Blob(byteArrays, { type: fileData.mimeType || 'text/csv' });
            return new File([blob], fileData.name, { 
              type: fileData.mimeType || 'text/csv'
            });
          }
          
          // If no data but we have a path, try to fetch the file
          if (fileData.path) {
            console.log('Fetching file from path:', fileData.path);
            try {
              const response = await fetch(fileData.path);
              const blob = await response.blob();
              
              return new File(
                [blob], 
                fileData.name, 
                { type: fileData.mimeType || 'text/csv' }
              );
            } catch (fetchError) {
              console.error('Error fetching file from path:', fetchError);
              toast({
                title: "Error",
                description: "Could not access the selected file. Please try another file.",
                variant: "destructive"
              });
              return null;
            }
          }
          
          console.error('File data not available in the expected format');
          toast({
            title: "Error",
            description: "The selected file couldn't be processed. Please try another file.",
            variant: "destructive"
          });
          return null;
        }
        
        console.log('No file selected or picker was cancelled');
        return null;
      } catch (pickerError) {
        console.error('Error using FilePicker plugin:', pickerError);
        toast({
          title: "File Picker Error",
          description: "Could not open file picker. Please try again.",
          variant: "destructive"
        });
        return null;
      }
    } else {
      // For non-Android devices or web, use standard file input
      console.log('Using standard file input for web');
      
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = mimeTypes.join(',');
        
        input.onchange = (event) => {
          const file = (event.target as HTMLInputElement).files?.[0] || null;
          console.log('File selected via standard input:', file?.name);
          resolve(file);
          
          // Clean up
          input.remove();
        };
        
        // Handle cancellation
        input.oncancel = () => {
          console.log('File selection cancelled');
          resolve(null);
          input.remove();
        };
        
        // Trigger file selection
        input.click();
      });
    }
  } catch (error) {
    console.error('Error picking file:', error);
    toast({
      title: "Error",
      description: `Failed to open file picker: ${(error as Error).message}`,
      variant: "destructive"
    });
    return null;
  }
};

// Export transactions to CSV file
export const exportTransactionsToCSV = async (
  filename: string = 'transactions.csv'
): Promise<void> => {
  try {
    console.log(`Exporting transactions to CSV file: ${filename}`);
    
    // Get all transactions
    const transactions = await getTransactions();
    console.log(`Retrieved ${transactions.length} transactions for export`);
    
    if (transactions.length === 0) {
      console.log('No transactions to export');
      toast({
        title: "No Data",
        description: "There are no transactions to export.",
      });
      return;
    }
    
    // Convert transactions to CSV format - Include paymentMethod in headers
    const headers = ['id', 'date', 'amount', 'currency', 'merchantName', 'notes', 'category', 'type', 'paymentMethod'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(t => [
        t.id,
        t.date,
        t.amount,
        t.currency,
        `"${t.merchantName?.replace(/"/g, '""') || ''}"`,
        `"${t.notes?.replace(/"/g, '""') || ''}"`,
        t.category,
        t.type || 'expense',
        `"${t.paymentMethod?.replace(/"/g, '""') || ''}"` // Include paymentMethod in export
      ].join(','))
    ].join('\n');
    
    // Create a blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    console.log('Transactions CSV blob created, size:', blob.size);
    
    // Use saveToExportDirectory for a consistent approach across platforms
    const result = await saveToExportDirectory(filename, blob, 'text/csv');
    console.log('Save to export directory result:', result);
    
    if (result) {
      toast({
        title: "Export Complete",
        description: "Your transactions have been exported successfully.",
      });
    }
  } catch (error) {
    console.error('Error exporting transactions to CSV:', error);
    toast({
      title: "Export Failed",
      description: `Failed to export data: ${(error as Error).message || 'Unknown error'}`,
      variant: "destructive",
    });
    throw error;
  }
};

// Helper function to validate transaction type
const validateTransactionType = (type: string): 'expense' | 'income' => {
  if (type === 'expense' || type === 'income') {
    return type;
  }
  return 'expense'; // Default to expense if invalid
};

// Helper function to validate transaction category
const validateCategory = async (category: string, type: 'expense' | 'income'): Promise<ExpenseCategory | IncomeCategory> => {
  if (!category) return 'other';
  
  try {
    // Get user categories to check if the imported category exists
    const userCategories = await getUserCategories();
    const categories = type === 'expense' ? userCategories.expenseCategories || [] : userCategories.incomeCategories || [];
    
    // Check if the imported category is either a default or custom category
    if (category === 'other' || categories.includes(category)) {
      return category as ExpenseCategory | IncomeCategory;
    }
    
    // If not found, return 'other'
    return 'other';
  } catch (error) {
    console.error('Error validating category:', error);
    return 'other';
  }
};

// Import transactions from a CSV file
export const importTransactionsFromCSV = async (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    console.log(`Starting import from CSV file: ${file.name}`);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        if (!event.target?.result) {
          console.error('Failed to read file content');
          throw new Error('Failed to read file');
        }
        
        const csvData = event.target.result as string;
        console.log('CSV file loaded, size:', csvData.length);
        const lines = csvData.split('\n');
        console.log('Found', lines.length, 'lines in CSV');
        
        if (lines.length === 0) {
          throw new Error('CSV file is empty');
        }
        
        let headers = lines[0].split(',');
        console.log('CSV headers:', headers);
        
        // Standardize headers (case insensitive)
        headers = headers.map(h => h.trim().toLowerCase());
        
        const requiredFields = ['amount', 'date'];
        const missingFields = requiredFields.filter(
          field => !headers.some(h => h === field)
        );
        
        if (missingFields.length > 0) {
          const error = `CSV is missing required fields: ${missingFields.join(', ')}`;
          console.error(error);
          throw new Error(error);
        }
        
        let importedCount = 0;
        
        // Parse and import each row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          try {
            // Handle quoted values with commas
            const values: string[] = [];
            let inQuotes = false;
            let currentValue = '';
            
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(currentValue);
                currentValue = '';
              } else {
                currentValue += char;
              }
            }
            
            values.push(currentValue);
            
            // Map CSV values to transaction object
            const record: Record<string, string> = {};
            headers.forEach((header, index) => {
              if (index < values.length) {
                record[header] = values[index];
              }
            });
            
            // Parse transaction type and validate
            const transactionType = validateTransactionType(record.type || 'expense');
            
            // Parse category and validate - preserve original category if possible
            const categoryValue = record.category?.trim() || 'other';
            const category = await validateCategory(categoryValue, transactionType);
            
            // Create a transaction object
            const transaction: Transaction = {
              id: record.id || crypto.randomUUID(),
              date: record.date,
              amount: parseFloat(record.amount),
              currency: record.currency || 'USD',
              merchantName: record.merchantname || 'Unknown',
              notes: record.notes || '',
              category: category,
              type: transactionType,
              paymentMethod: record.paymentmethod || '' // Import paymentMethod from CSV
            };
            
            await addTransaction(transaction);
            importedCount++;
          } catch (rowError) {
            console.error(`Error processing row ${i}:`, rowError);
            // Continue processing other rows
          }
        }
        
        console.log(`Successfully imported ${importedCount} transactions from CSV`);
        
        if (importedCount === 0) {
          throw new Error('No valid transactions found in the CSV file');
        }
        
        toast({
          title: "Import Complete",
          description: `Successfully imported ${importedCount} transactions.`,
        });
        
        resolve();
      } catch (error) {
        console.error('Error importing transactions from CSV:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};

// Export transactions to JSON file
export const exportTransactions = async (
  filename: string = 'transactions.json'
): Promise<void> => {
  try {
    console.log(`Exporting transactions to JSON file: ${filename}`);
    
    // Get all transactions
    const transactions = await getTransactions();
    
    if (transactions.length === 0) {
      console.log('No transactions to export');
      toast({
        title: "No Data",
        description: "There are no transactions to export.",
      });
      return;
    }
    
    // Create a blob
    const jsonContent = JSON.stringify(transactions, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    // Use saveToExportDirectory for a consistent approach across platforms
    const result = await saveToExportDirectory(filename, blob, 'application/json');
    
    if (result) {
      toast({
        title: "Export Complete",
        description: "Your transactions have been exported successfully.",
      });
    }
  } catch (error) {
    console.error('Error exporting transactions to JSON:', error);
    toast({
      title: "Export Failed",
      description: `Failed to export data: ${(error as Error).message || 'Unknown error'}`,
      variant: "destructive",
    });
    throw error;
  }
};

// Import transactions from a JSON file
export const importTransactions = async (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        if (!event.target?.result) {
          throw new Error('Failed to read file');
        }
        
        const jsonData = JSON.parse(event.target.result as string);
        let importedCount = 0;
        
        // Validate and import each transaction
        if (Array.isArray(jsonData)) {
          for (const item of jsonData) {
            // Basic validation
            if (item.amount && (item.date || typeof item.date === 'string')) {
              // Parse transaction type safely
              const transactionType = validateTransactionType(item.type || 'expense');
              
              // Parse category safely - preserve original category if possible
              const category = await validateCategory(item.category || 'other', transactionType);
              
              // Ensure required fields are present
              const transaction: Transaction = {
                id: item.id || crypto.randomUUID(),
                date: item.date,
                amount: parseFloat(item.amount),
                currency: item.currency || 'USD', 
                category: category,
                type: transactionType,
                merchantName: item.merchantName || 'Unknown',
                notes: item.notes || '',
                paymentMethod: item.paymentMethod || ''
              };
              
              await addTransaction(transaction);
              importedCount++;
            }
          }
          console.log(`Successfully imported ${importedCount} transactions`);
          resolve();
        } else {
          throw new Error('Invalid JSON format: Expected an array of transactions');
        }
      } catch (error) {
        console.error('Error importing transactions:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};
