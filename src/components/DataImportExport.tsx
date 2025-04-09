import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Download, Upload, FileJson, FileSpreadsheet, 
  FileUp, FileDown, Loader2 
} from 'lucide-react';
import { 
  exportTransactions, 
  exportTransactionsToCSV, 
  importTransactions,
  importTransactionsFromCSV 
} from '@/lib/import-export';

interface DataImportExportProps {
  onDataChanged: () => void;
}

const DataImportExport = ({ onDataChanged }: DataImportExportProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsImporting(true);
    try {
      const file = files[0];
      await importTransactions(file);
      onDataChanged();
    } catch (error) {
      console.error('Error importing JSON:', error);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsImporting(true);
    try {
      const file = files[0];
      await importTransactionsFromCSV(file);
      onDataChanged();
    } catch (error) {
      console.error('Error importing CSV:', error);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      await exportTransactions('transactions.json');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await exportTransactionsToCSV('transactions.csv');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import & Export Data</CardTitle>
        <CardDescription>
          Transfer your transaction data to and from the app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center">
            <Upload className="mr-2 h-5 w-5" />
            Import Data
          </h3>
          <p className="text-sm text-muted-foreground">
            Import transaction data from JSON or CSV files. This will add the imported transactions to your existing data.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="import-json" className="flex items-center">
                <FileJson className="mr-2 h-4 w-4" />
                Import from JSON
              </Label>
              <div className="flex">
                <input
                  id="import-json"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportJSON}
                />
                <Button
                  variant="outline"
                  disabled={isImporting}
                  onClick={() => document.getElementById('import-json')?.click()}
                  className="w-full"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <FileUp className="mr-2 h-4 w-4" />
                      Select JSON File
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="import-csv" className="flex items-center">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import from CSV
              </Label>
              <div className="flex">
                <input
                  id="import-csv"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportCSV}
                />
                <Button
                  variant="outline"
                  disabled={isImporting}
                  onClick={() => document.getElementById('import-csv')?.click()}
                  className="w-full"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <FileUp className="mr-2 h-4 w-4" />
                      Select CSV File
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center">
            <Download className="mr-2 h-5 w-5" />
            Export Data
          </h3>
          <p className="text-sm text-muted-foreground">
            Export your transaction data for backup or to use in other applications.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleExportJSON}
              disabled={isExporting}
              variant="outline"
              className="w-full"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export as JSON
                </>
              )}
            </Button>
            
            <Button
              onClick={handleExportCSV}
              disabled={isExporting}
              variant="outline"
              className="w-full"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export as CSV
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataImportExport;
