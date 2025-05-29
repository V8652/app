import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { exportTransactionsToCSV, importTransactionsFromCSV } from '@/lib/csv-handler';
import { checkAndRequestStoragePermissions, pickFile } from '@/lib/file-utils'; 
import { isAndroidDevice } from '@/lib/platform-utils';
import { motion } from 'framer-motion';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';

interface DataImportExportProps {
  onDataChanged: () => void;
}

const DataImportExport = ({ onDataChanged }: DataImportExportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportTime, setLastImportTime] = useState<Date | null>(null);
  
  // Check for last import time in localStorage
  useEffect(() => {
    const lastImport = localStorage.getItem('lastImportTime');
    if (lastImport) {
      setLastImportTime(new Date(lastImport));
    }
  }, []);
  
  // Listen for import events
  useEffect(() => {
    const handleDataImported = () => {
      const now = new Date();
      setLastImportTime(now);
      localStorage.setItem('lastImportTime', now.toISOString());
      onDataChanged();
    };
    
    const unsubscribe = dbEvents.subscribe(DatabaseEvent.DATA_IMPORTED, handleDataImported);
    return () => unsubscribe();
  }, [onDataChanged]);
  
  // Function to handle transaction data export
  const handleExportTransactions = async () => {
    try {
      setIsExporting(true);
      console.log('Starting transaction export...');
      
      // Enhanced logging for Android debugging
      const isAndroid = isAndroidDevice();
      if (isAndroid) {
        console.log('Android device detected, platform details:');
        console.log('- User Agent:', navigator.userAgent);
      }
      
      toast({
        title: "Starting Export",
        description: "Preparing transaction data for export...",
      });
      
      // Request storage permissions first on Android
      const hasPermissions = await checkAndRequestStoragePermissions();
      console.log('Storage permissions check result:', hasPermissions);
      
      if (!hasPermissions) {
        toast({
          title: "Permission Denied",
          description: "Storage permissions are required to export data. Please grant permissions in your device settings.",
          variant: "destructive",
        });
        return;
      }
      
      // Export transactions to CSV with a timestamp in the filename
      const date = new Date();
      const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const filename = `transactions_${timestamp}.csv`;
      
      await exportTransactionsToCSV(filename);
      
      // Show appropriate success message based on platform
      if (isAndroid) {
        toast({
          title: "Export Complete",
          description: "Your file has been saved. Check your Downloads folder or Files app to view it.",
          duration: 5000
        });
      } else {
        toast({
          title: "Export Complete",
          description: "Your file has been downloaded successfully.",
          duration: 3000
        });
      }
      
      console.log('Transaction export completed');
      
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast({
        title: "Export Failed",
        description: `Failed to export data: ${(error as Error).message || 'Unknown error'}. Please try again.`,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Function to handle transaction data import
  const handleImportTransactions = async () => {
    try {
      setIsImporting(true);
      console.log('Initiating transaction import...');
      
      // Enhanced logging for Android debugging
      const isAndroid = isAndroidDevice();
      
      if (isAndroid) {
        console.log('Android device detected, platform details:');
        console.log('- User Agent:', navigator.userAgent);
      }
      
      // Request storage permissions first on Android
      const hasPermissions = await checkAndRequestStoragePermissions();
      console.log('Storage permissions check result:', hasPermissions);
      
      if (!hasPermissions) {
        toast({
          title: "Permission Denied",
          description: "Storage permissions are required to import data.",
          variant: "destructive",
        });
        return;
      }
      
      // Use our improved file picking function from file-utils.ts
      console.log('Calling pickFile function...');
      const file = await pickFile(['text/csv', '.csv', 'application/vnd.ms-excel']);
      console.log('pickFile function returned:', file ? `File: ${file.name}` : 'null');
      
      if (!file) {
        console.log('No file selected, cancelling import');
        toast({
          title: "Import Cancelled",
          description: "No file was selected for import.",
          variant: "destructive"
        });
        setIsImporting(false);
        return;
      }
      
      console.log(`Selected file for import: ${file.name}, size: ${file.size} bytes`);
      
      // Show processing toast
      toast({
        title: "Processing Import",
        description: "Analyzing transaction data...",
      });
      
      try {
        // Import transactions from the selected CSV file
        const importedData = await importTransactionsFromCSV(file);
        console.log('Import successful:', importedData.length, 'transactions');
        
        // Update last import time and save to localStorage
        const now = new Date();
        setLastImportTime(now);
        localStorage.setItem('lastImportTime', now.toISOString());
        
        // Trigger data updated events
        dbEvents.emit(DatabaseEvent.DATA_IMPORTED, true);
        
        // Call the onDataChanged callback immediately after successful import
        onDataChanged();
      } catch (importError) {
        console.error('Error importing transactions:', importError);
        toast({
          title: "Import Failed",
          description: `Failed to import data: ${(importError as Error).message || 'Unknown error'}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error setting up import:', error);
      toast({
        title: "Import Failed",
        description: `Failed to set up file picker: ${(error as Error).message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Management</CardTitle>
        <CardDescription>
          Import and export your transaction data
          {lastImportTime && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground mt-1"
            >
              Last import: {lastImportTime.toLocaleString()}
            </motion.div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="default" 
            onClick={handleExportTransactions} 
            disabled={isExporting}
            className="flex-1 transition-all"
          >
            {isExporting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="mr-2"
              >
                <RefreshCw className="h-4 w-4" />
              </motion.div>
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? "Exporting..." : "Export Transaction Data"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleImportTransactions} 
            disabled={isImporting}
            className="flex-1 transition-all"
          >
            {isImporting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="mr-2"
              >
                <RefreshCw className="h-4 w-4" />
              </motion.div>
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isImporting ? "Importing..." : "Import Transaction Data"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataImportExport;
