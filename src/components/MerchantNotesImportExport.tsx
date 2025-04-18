
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { exportMerchantNotesToCSV, importMerchantNotesFromCSV } from '@/lib/merchant-notes';
import { checkAndRequestStoragePermissions, pickFile } from '@/lib/import-export';

interface MerchantNotesImportExportProps {
  onDataChanged: () => void;
}

const MerchantNotesImportExport = ({ onDataChanged }: MerchantNotesImportExportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Function to handle merchant notes export
  const handleExportMerchantNotes = async () => {
    try {
      setIsExporting(true);
      
      // Request storage permissions first on Android
      const hasPermissions = await checkAndRequestStoragePermissions();
      if (!hasPermissions) {
        toast({
          title: "Permission Denied",
          description: "Storage permissions are required to export data.",
          variant: "destructive",
        });
        return;
      }
      
      // Export merchant notes to CSV
      await exportMerchantNotesToCSV();
      
      toast({
        title: "Export Complete",
        description: "Your merchant notes have been exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting merchant notes:', error);
      toast({
        title: "Export Failed",
        description: `Failed to export data: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Function to handle merchant notes import
  const handleImportMerchantNotes = async () => {
    try {
      setIsImporting(true);
      
      // Request storage permissions first on Android
      const hasPermissions = await checkAndRequestStoragePermissions();
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
      const file = await pickFile(['text/csv']);
      
      if (!file) {
        console.log('No file selected, cancelling import');
        setIsImporting(false);
        return;
      }
      
      try {
        // Import merchant notes from the selected CSV file
        const count = await importMerchantNotesFromCSV(file);
        
        // Notify the parent component that data has changed
        onDataChanged();
        
        toast({
          title: "Import Complete",
          description: `Successfully imported ${count} merchant notes.`,
        });
      } catch (error) {
        console.error('Error importing merchant notes:', error);
        toast({
          title: "Import Failed",
          description: `Failed to import data: ${(error as Error).message}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error setting up file input:', error);
      setIsImporting(false);
      
      toast({
        title: "Import Failed",
        description: `Failed to set up file picker: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Merchant Notes Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage your merchant notes data
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="default" 
            onClick={handleExportMerchantNotes} 
            disabled={isExporting}
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export Merchant Notes"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleImportMerchantNotes} 
            disabled={isImporting}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? "Importing..." : "Import Merchant Notes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MerchantNotesImportExport;
