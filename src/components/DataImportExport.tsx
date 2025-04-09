
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { exportTransactionsToCSV, importTransactionsFromCSV, pickFile } from '@/lib/import-export';
import { checkAndRequestStoragePermissions } from '@/lib/import-export';
import { isAndroidDevice, isCapacitorApp } from '@/lib/export-path';

interface DataImportExportProps {
  onDataChanged: () => void;
}

const DataImportExport = ({ onDataChanged }: DataImportExportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const isAndroid = isAndroidDevice();
  const isCapacitor = isCapacitorApp();
  
  // Function to handle transaction data export
  const handleExportTransactions = async () => {
    try {
      setIsExporting(true);
      console.log('Starting transaction export...');
      
      // Request storage permissions first on Android
      const hasPermissions = await checkAndRequestStoragePermissions();
      console.log('Storage permissions check result:', hasPermissions);
      
      if (!hasPermissions) {
        toast({
          title: "Permission Denied",
          description: "Storage permissions are required to export data.",
          variant: "destructive",
        });
        return;
      }
      
      // Export transactions to CSV with a timestamp in the filename
      const date = new Date();
      const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      await exportTransactionsToCSV(`transactions_${timestamp}.csv`);
      console.log('Transaction export completed');
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast({
        title: "Export Failed",
        description: `Failed to export data: ${(error as Error).message || 'Unknown error'}`,
        variant: "destructive",
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
      if (isAndroid) {
        console.log('Android device detected, platform details:');
        console.log('- User Agent:', navigator.userAgent);
        console.log('- Is Capacitor App:', isCapacitor);
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
        setIsImporting(false);
        return;
      }
      
      // Use our improved file picking function
      console.log('Calling pickFile function...');
      const file = await pickFile(['text/csv']);
      console.log('pickFile function returned:', file ? `File: ${file.name}` : 'null');
      
      if (!file) {
        console.log('No file selected, cancelling import');
        setIsImporting(false);
        return;
      }
      
      console.log(`Selected file for import: ${file.name}, size: ${file.size} bytes`);
      
      try {
        // Import transactions from the selected CSV file
        await importTransactionsFromCSV(file);
        
        // Notify the parent component that data has changed
        onDataChanged();
        
        toast({
          title: "Import Complete",
          description: "Your transaction data has been imported successfully.",
        });
      } catch (error) {
        console.error('Error importing transactions:', error);
        toast({
          title: "Import Failed",
          description: `Failed to import data: ${(error as Error).message || 'Unknown error'}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error setting up file input:', error);
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
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="default" 
            onClick={handleExportTransactions} 
            disabled={isExporting}
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export Transaction Data"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleImportTransactions} 
            disabled={isImporting}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? "Importing..." : "Import Transaction Data"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataImportExport;
