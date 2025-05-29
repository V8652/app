import Papa from 'papaparse';
import { downloadFile } from './file-utils';
import { toast } from '@/hooks/use-toast';
import { isAndroidDevice, isCapacitorApp } from '@/lib/platform-utils';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

/**
 * Convert data to CSV and trigger download
 */
export function exportDataToCSV<T>(data: T[], filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (data.length === 0) {
        toast({
          title: "No Data to Export",
          description: "There is no data to export.",
          variant: "destructive"
        });
        reject(new Error('No data to export'));
        return;
      }
      
      // Convert data to CSV using PapaParse
      console.log(`Converting ${data.length} items to CSV format`);
      const csv = Papa.unparse(data, {
        header: true,
        skipEmptyLines: true
      });
      
      console.log(`CSV generation complete, size: ${csv.length} bytes`);
      
      // Trigger download and resolve with filename on success
      downloadFile(csv, filename, 'text/csv')
        .then(() => {
          console.log(`File download successful: ${filename}`);
          resolve(filename);
        })
        .catch(error => {
          console.error('Error during file download:', error);
          reject(error);
        });
    } catch (error) {
      console.error('Error exporting data to CSV:', error);
      reject(error);
    }
  });
}

/**
 * Parse CSV data from a file with enhanced error handling
 */
export async function parseCSVFile<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    console.log(`Parsing CSV file: ${file.name}, size: ${file.size} bytes`);
    
    // For very small files, they might be empty or corrupted
    if (file.size < 10) {
      reject(new Error('The file is too small or empty'));
      return;
    }
    
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('CSV parsing complete, error count:', results.errors.length);
        console.log('Data rows:', results.data.length);
        
        if (results.errors && results.errors.length > 0) {
          console.error('CSV parsing errors:', results.errors);
          
          // If we have some data despite errors, we might want to continue
          if (results.data && results.data.length > 0) {
            console.log(`Continuing with ${results.data.length} rows despite ${results.errors.length} errors`);
            toast({
              title: "Warning",
              description: `${results.errors.length} errors found during parsing, but some data was recovered.`,
              variant: "default"
            });
            resolve(results.data as T[]);
          } else {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
          }
        } else if (!results.data || results.data.length === 0) {
          console.error('CSV file is empty or has invalid format');
          reject(new Error('CSV file is empty or has invalid format'));
        } else {
          console.log(`Successfully parsed ${results.data.length} rows from CSV`);
          resolve(results.data as T[]);
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        reject(error);
      }
    });
  });
}

/**
 * Convert blob to base64 string safely
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64data = reader.result as string;
        // Extract just the base64 part without the data URL prefix
        const base64Content = base64data.split(',')[1];
        resolve(base64Content);
      } catch (error) {
        console.error('Error processing base64 data:', error);
        reject(error);
      }
    };
    reader.onerror = (event) => {
      console.error('FileReader error:', event);
      reject(new Error('Failed to convert blob to base64'));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Helper to check if file is likely CSV
 */
export function isLikelyCSV(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv') || 
         file.type === 'text/csv' || 
         file.type === 'application/csv' ||
         file.type === 'application/vnd.ms-excel';
}

/**
 * Force CSV file download with proper handling for all platforms
 */
export async function forceDownloadCSV(csvContent: string, filename: string): Promise<string> {
  try {
    // Android (Capacitor) handling
    if (isAndroidDevice() && isCapacitorApp()) {
      try {
        // Save plain CSV text as UTF-8 (no base64 encoding)
        // First try Documents directory
        try {
          await Filesystem.writeFile({
            path: filename,
            data: csvContent, // plain text
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
            recursive: true,
          });
          try {
            await FileOpener.open({
              filePath: filename,
              contentType: 'text/csv',
              openWithDefault: true
            });
          } catch (openError) {
            console.warn('Could not open file automatically:', openError);
          }
          toast({
            title: 'Export Complete',
            description: `File saved to Documents: ${filename}`,
            duration: 5000
          });
          return filename;
        } catch (docError) {
          console.warn('Failed to save to Documents, trying Downloads:', docError);
          // Fallback to Downloads directory
          await Filesystem.writeFile({
            path: filename,
            data: csvContent, // plain text
            directory: Directory.ExternalStorage,
            encoding: Encoding.UTF8,
            recursive: true,
          });
          toast({
            title: 'Export Complete',
            description: `File saved to Downloads: ${filename}`,
            duration: 5000
          });
          return filename;
        }
      } catch (error) {
        console.error('Error saving CSV file on Android:', error);
        throw new Error('Failed to save CSV file on Android device');
      }
    }
    
    // Web browser handling
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    return filename;
  } catch (error) {
    console.error('Error in forceDownloadCSV:', error);
    toast({
      title: 'Export Failed',
      description: 'Could not save the file. Please check permissions and try again.',
      variant: 'destructive',
      duration: 5000
    });
    throw error;
  }
}
