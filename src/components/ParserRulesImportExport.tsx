
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { exportParserRulesToCSV, importParserRulesFromCSV } from '@/lib/parser-rules-csv';
import { checkAndRequestStoragePermissions, pickFile } from '@/lib/import-export';
import { isAndroidDevice, isCapacitorApp } from '@/lib/export-path';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ParserRulesImportExportProps {
  onDataChanged: () => void;
}

const ParserRulesImportExport = ({ onDataChanged }: ParserRulesImportExportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const isAndroid = isAndroidDevice();
  const isCapacitor = isCapacitorApp();
  
  // Function to handle parser rules export
  const handleExportParserRules = async () => {
    try {
      setIsExporting(true);
      console.log('Starting export of parser rules...');
      
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
      
      // Export parser rules to CSV
      await exportParserRulesToCSV();
      console.log('Parser rules export completed successfully');
      
      toast({
        title: "Export Complete",
        description: "Your parser rules have been exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting parser rules:', error);
      toast({
        title: "Export Failed",
        description: `Failed to export data: ${(error as Error).message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Function to handle parser rules import
  const handleImportParserRules = async () => {
    try {
      setIsImporting(true);
      console.log('Setting up parser rules import...');
      
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
        // Import parser rules from the selected CSV file
        const count = await importParserRulesFromCSV(file);
        
        // Notify the parent component that data has changed
        onDataChanged();
        
        toast({
          title: "Import Complete",
          description: `Successfully imported ${count} parser rules.`,
        });
      } catch (error) {
        console.error('Error importing parser rules:', error);
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
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Parser Rules Management</h3>
          <p className="text-sm text-muted-foreground">
            Import and export your parser rules
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="default" 
            onClick={handleExportParserRules} 
            disabled={isExporting}
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export Parser Rules"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleImportParserRules} 
            disabled={isImporting}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? "Importing..." : "Import Parser Rules"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ParserRulesImportExport;
