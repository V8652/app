
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, Upload, FileJson, FileSpreadsheet, 
  FileUp, FileDown, Loader2 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import {
  exportMerchantNotes,
  exportMerchantNotesToCSV,
  importMerchantNotes,
  importMerchantNotesFromCSV
} from '@/lib/merchant-notes';

interface MerchantNotesImportExportProps {
  onDataChanged: () => void;
}

const MerchantNotesImportExport = ({ onDataChanged }: MerchantNotesImportExportProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsImporting(true);
    try {
      const file = files[0];
      const importedCount = await importMerchantNotes(file);
      toast({
        title: 'Import Successful',
        description: `Imported ${importedCount} merchant notes`,
      });
      onDataChanged();
    } catch (error) {
      console.error('Error importing merchant notes:', error);
      toast({
        title: 'Import Failed',
        description: 'Failed to import merchant notes',
        variant: 'destructive',
      });
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
      const importedCount = await importMerchantNotesFromCSV(file);
      toast({
        title: 'Import Successful',
        description: `Imported ${importedCount} merchant notes from CSV`,
      });
      onDataChanged();
    } catch (error) {
      console.error('Error importing merchant notes from CSV:', error);
      toast({
        title: 'Import Failed',
        description: 'Failed to import merchant notes from CSV',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      await exportMerchantNotes();
      toast({
        title: 'Export Successful',
        description: 'Merchant notes exported as JSON',
      });
    } catch (error) {
      console.error('Error exporting merchant notes:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export merchant notes',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await exportMerchantNotesToCSV();
      toast({
        title: 'Export Successful',
        description: 'Merchant notes exported as CSV',
      });
    } catch (error) {
      console.error('Error exporting merchant notes to CSV:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export merchant notes to CSV',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Merchant Notes Data</CardTitle>
        <CardDescription>
          Import and export your merchant notes data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center">
            <Upload className="mr-2 h-5 w-5" />
            Import Merchant Notes
          </h3>
          <p className="text-sm text-muted-foreground">
            Import merchant notes from JSON or CSV files
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label htmlFor="import-json" className="flex items-center text-sm font-medium">
                <FileJson className="mr-2 h-4 w-4" />
                Import from JSON
              </label>
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
              <label htmlFor="import-csv" className="flex items-center text-sm font-medium">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import from CSV
              </label>
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
            Export Merchant Notes
          </h3>
          <p className="text-sm text-muted-foreground">
            Export your merchant notes for backup or to use in other applications
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

export default MerchantNotesImportExport;
