
import { openDB } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { initDB } from './db';
import { toast } from '@/hooks/use-toast';
import { saveToExportDirectory } from './export-path';

const DB_NAME = 'money-minder-db';
const MERCHANT_NOTES_STORE = 'merchantNotes';

// Define the MerchantNote interface
export interface MerchantNote {
  id: string;
  merchantName: string;
  category: string;
  notes: string;  // Note that this is 'notes', not 'note'
  dateAdded: string;
  lastUpdated: string;
}

// Get all merchant notes
export async function getMerchantNotes(): Promise<MerchantNote[]> {
  try {
    const db = await initDB();
    return await db.getAll(MERCHANT_NOTES_STORE);
  } catch (error) {
    console.error('Error getting merchant notes:', error);
    return [];
  }
}

// Get merchant note by merchant name
export async function getMerchantNoteByName(merchantName: string): Promise<MerchantNote | undefined> {
  try {
    const db = await initDB();
    const tx = db.transaction(MERCHANT_NOTES_STORE, 'readonly');
    const store = tx.objectStore(MERCHANT_NOTES_STORE);
    const index = store.index('merchantName');
    return await index.get(merchantName);
  } catch (error) {
    console.error('Error getting merchant note by name:', error);
    return undefined;
  }
}

// Input type for merchant notes
export type MerchantNoteInput = {
  merchantName: string;
  category?: string;
  notes?: string;
};

// Add new merchant note
export async function addMerchantNote(merchantNote: MerchantNoteInput): Promise<MerchantNote> {
  try {
    const db = await initDB();
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const newNote: MerchantNote = {
      id,
      merchantName: merchantNote.merchantName,
      category: merchantNote.category || '',
      notes: merchantNote.notes || '',
      dateAdded: now,
      lastUpdated: now
    };
    
    await db.add(MERCHANT_NOTES_STORE, newNote);
    return newNote;
  } catch (error) {
    console.error('Error adding merchant note:', error);
    throw error;
  }
}

// Update existing merchant note
export async function updateMerchantNote(merchantNote: MerchantNote): Promise<MerchantNote> {
  try {
    const db = await initDB();
    const now = new Date().toISOString();
    
    // Update the lastUpdated timestamp
    const updatedNote = {
      ...merchantNote,
      lastUpdated: now
    };
    
    await db.put(MERCHANT_NOTES_STORE, updatedNote);
    return updatedNote;
  } catch (error) {
    console.error('Error updating merchant note:', error);
    throw error;
  }
}

// Delete merchant note
export async function deleteMerchantNote(id: string): Promise<void> {
  try {
    const db = await initDB();
    await db.delete(MERCHANT_NOTES_STORE, id);
  } catch (error) {
    console.error('Error deleting merchant note:', error);
    throw error;
  }
}

// Export merchant notes to JSON
export function exportMerchantNotesToJSON(): Promise<string> {
  return getMerchantNotes()
    .then(notes => {
      return JSON.stringify(notes, null, 2);
    });
}

// Import merchant notes from JSON
export async function importMerchantNotesFromJSON(jsonData: string): Promise<number> {
  try {
    const notes = JSON.parse(jsonData) as MerchantNote[];
    const db = await initDB();
    
    let importedCount = 0;
    for (const note of notes) {
      try {
        await db.put(MERCHANT_NOTES_STORE, note);
        importedCount++;
      } catch (error) {
        console.error(`Error importing note for ${note.merchantName}:`, error);
      }
    }
    
    return importedCount;
  } catch (error) {
    console.error('Error importing merchant notes:', error);
    throw error;
  }
}

// Export merchant notes (same as exportMerchantNotesToJSON but with different name for backward compatibility)
export const exportMerchantNotes = exportMerchantNotesToJSON;

// Import merchant notes (alias for importMerchantNotesFromJSON for backward compatibility)
export async function importMerchantNotes(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = e.target?.result as string;
        const count = await importMerchantNotesFromJSON(jsonData);
        resolve(count);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
}

// Export merchant notes to CSV
export async function exportMerchantNotesToCSV(): Promise<void> {
  try {
    console.log('Starting export of merchant notes to CSV');
    const notes = await getMerchantNotes();
    
    if (notes.length === 0) {
      console.log('No merchant notes to export');
      toast({
        title: "No Data",
        description: "There are no merchant notes to export.",
      });
      return;
    }
    
    // Create CSV header
    let csv = 'Merchant Name,Category,Notes\n';
    
    // Add each note as a row
    notes.forEach(note => {
      // Escape commas and quotes in fields
      const merchantName = `"${note.merchantName.replace(/"/g, '""')}"`;
      const category = `"${note.category.replace(/"/g, '""')}"`;
      const notes = `"${note.notes.replace(/"/g, '""')}"`;
      
      csv += `${merchantName},${category},${notes}\n`;
    });
    
    // Create date-based filename
    const date = new Date();
    const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
    const filename = `merchant_notes_${timestamp}.csv`;
    
    // Create a blob with the CSV data
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    console.log('CSV blob created, size:', blob.size);
    
    // Save the file using our export utility
    const result = await saveToExportDirectory(filename, blob, 'text/csv');
    console.log('Save to export directory result:', result);
    
    if (!result) {
      throw new Error('Failed to save file');
    }
  } catch (error) {
    console.error('Error exporting merchant notes to CSV:', error);
    toast({
      title: "Export Failed",
      description: "Failed to export merchant notes to CSV",
      variant: "destructive"
    });
    throw error;
  }
}

// Import merchant notes from CSV
export async function importMerchantNotesFromCSV(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvData = e.target?.result as string;
        const lines = csvData.split('\n');
        
        // Skip header row
        const dataLines = lines.slice(1).filter(line => line.trim() !== '');
        
        let importedCount = 0;
        for (const line of dataLines) {
          try {
            // Simple CSV parsing - this could be improved for handling quoted fields with commas
            const columns = line.split(',');
            
            if (columns.length >= 3) {
              // Remove quotes if present
              const merchantName = columns[0].replace(/^"|"$/g, '').replace(/""/g, '"');
              const category = columns[1].replace(/^"|"$/g, '').replace(/""/g, '"');
              const notes = columns[2].replace(/^"|"$/g, '').replace(/""/g, '"');
              
              await addMerchantNote({
                merchantName,
                category,
                notes
              });
              
              importedCount++;
            }
          } catch (lineError) {
            console.error('Error importing line:', line, lineError);
          }
        }
        
        resolve(importedCount);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
}

// Function for backward compatibility
export const saveMerchantNote = updateMerchantNote;
