
import { toast } from '@/hooks/use-toast';

/**
 * Placeholder functions for export and import operations
 * These replace the actual functionality which has been removed
 */
export async function checkAndRequestStoragePermissions(): Promise<boolean> {
  // Always return true since we've removed file access functionality
  return true;
}

export async function pickFile(acceptTypes: string[]): Promise<File | null> {
  toast({
    title: "Feature Unavailable",
    description: "File import functionality has been removed from this application.",
    variant: "destructive"
  });
  return null;
}

export async function exportSmsParserRulesToCSV(): Promise<string> {
  toast({
    title: "Feature Unavailable",
    description: "SMS parser rules export functionality has been removed from this application.",
    variant: "destructive"
  });
  return "Export functionality removed";
}

export async function importSmsParserRulesFromCSV(file: File): Promise<any[]> {
  toast({
    title: "Feature Unavailable",
    description: "SMS parser rules import functionality has been removed from this application.",
    variant: "destructive"
  });
  return [];
}

export async function exportTransactionsToCSV(filename: string): Promise<void> {
  toast({
    title: "Feature Unavailable", 
    description: "Transaction export functionality has been removed from this application.",
    variant: "destructive"
  });
}

export async function importTransactionsFromCSV(file: File): Promise<void> {
  toast({
    title: "Feature Unavailable",
    description: "Transaction import functionality has been removed from this application.",
    variant: "destructive"
  });
}
