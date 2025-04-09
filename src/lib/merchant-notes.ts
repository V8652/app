
import { ExpenseCategory } from '@/types';
import { initDB } from './db';
import { v4 as uuidv4 } from 'uuid';

const MERCHANT_NOTES_STORE = 'merchantNotes';

export interface MerchantNote {
  id: string;
  merchantName: string;
  note: string;
  category?: ExpenseCategory;
  createdAt: number;
  updatedAt: number;
}

export const getMerchantNotes = async (): Promise<MerchantNote[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MERCHANT_NOTES_STORE], 'readonly');
    const store = transaction.objectStore(MERCHANT_NOTES_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => {
      console.error('Get merchant notes error:', event);
      reject('Failed to get merchant notes');
    };
  });
};

export const getMerchantNoteByName = async (merchantName: string): Promise<MerchantNote | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MERCHANT_NOTES_STORE], 'readonly');
    const store = transaction.objectStore(MERCHANT_NOTES_STORE);
    const index = store.index('merchantName');
    const request = index.getAll(merchantName);
    
    request.onsuccess = () => {
      if (request.result && request.result.length > 0) {
        resolve(request.result[0]);
      } else {
        resolve(null);
      }
    };
    request.onerror = (event) => {
      console.error('Get merchant note by name error:', event);
      reject('Failed to get merchant note by name');
    };
  });
};

export type MerchantNoteInput = Omit<MerchantNote, 'id' | 'createdAt' | 'updatedAt'>;

export const saveMerchantNote = async (noteInput: MerchantNoteInput): Promise<MerchantNote> => {
  const db = await initDB();
  const timestamp = Date.now();
  
  // Check if a note with this merchant name already exists
  const existingNotes = await getMerchantNotes();
  const existingNote = existingNotes.find(note => note.merchantName === noteInput.merchantName);
  
  let note: MerchantNote;
  
  if (existingNote) {
    // Update existing note
    note = {
      ...existingNote,
      ...noteInput,
      updatedAt: timestamp
    };
  } else {
    // Create new note
    note = {
      ...noteInput,
      id: uuidv4(),
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MERCHANT_NOTES_STORE], 'readwrite');
    const store = transaction.objectStore(MERCHANT_NOTES_STORE);
    const request = store.put(note);
    
    request.onsuccess = () => resolve(note);
    request.onerror = (event) => {
      console.error('Save merchant note error:', event);
      reject('Failed to save merchant note');
    };
  });
};

export const deleteMerchantNote = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MERCHANT_NOTES_STORE], 'readwrite');
    const store = transaction.objectStore(MERCHANT_NOTES_STORE);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error('Delete merchant note error:', event);
      reject('Failed to delete merchant note');
    };
  });
};

// New functions for import/export functionality
export const exportMerchantNotes = async (): Promise<string> => {
  try {
    const notes = await getMerchantNotes();
    const jsonData = JSON.stringify(notes, null, 2);
    
    // Create a Blob containing the JSON data
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    // Create a download link and trigger the download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merchant-notes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return jsonData;
  } catch (error) {
    console.error('Error exporting merchant notes:', error);
    throw new Error('Failed to export merchant notes');
  }
};

export const importMerchantNotes = async (jsonFile: File): Promise<number> => {
  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          if (!event.target || typeof event.target.result !== 'string') {
            throw new Error('Failed to read file');
          }
          
          const notesData = JSON.parse(event.target.result) as MerchantNote[];
          
          if (!Array.isArray(notesData)) {
            throw new Error('Invalid format: data is not an array');
          }
          
          let importedCount = 0;
          
          for (const noteData of notesData) {
            if (!noteData.merchantName) {
              console.warn('Skipping note without merchantName:', noteData);
              continue;
            }
            
            // Prepare note input (omitting id, createdAt, updatedAt as they will be set by saveMerchantNote)
            const noteInput: MerchantNoteInput = {
              merchantName: noteData.merchantName,
              note: noteData.note || '',
              category: noteData.category
            };
            
            await saveMerchantNote(noteInput);
            importedCount++;
          }
          
          resolve(importedCount);
        } catch (error) {
          console.error('Error processing import data:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(jsonFile);
    });
  } catch (error) {
    console.error('Error importing merchant notes:', error);
    throw new Error('Failed to import merchant notes');
  }
};

export const exportMerchantNotesToCSV = async (): Promise<string> => {
  try {
    const notes = await getMerchantNotes();
    
    // Define CSV headers
    const headers = ['Merchant Name', 'Category', 'Note', 'Created At', 'Updated At'];
    
    // Convert notes to CSV rows
    const rows = notes.map(note => [
      note.merchantName,
      note.category || '',
      note.note || '',
      new Date(note.createdAt).toISOString(),
      new Date(note.updatedAt).toISOString()
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Create a Blob containing the CSV data
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a download link and trigger the download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merchant-notes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return csvContent;
  } catch (error) {
    console.error('Error exporting merchant notes to CSV:', error);
    throw new Error('Failed to export merchant notes to CSV');
  }
};

export const importMerchantNotesFromCSV = async (csvFile: File): Promise<number> => {
  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          if (!event.target || typeof event.target.result !== 'string') {
            throw new Error('Failed to read file');
          }
          
          const csvContent = event.target.result;
          const lines = csvContent.split('\n');
          
          if (lines.length < 2) {
            throw new Error('Invalid CSV: file is empty or only contains headers');
          }
          
          // Parse headers (first line)
          const headers = lines[0].split(',').map(header => header.trim());
          
          // Find column indices
          const merchantNameIndex = headers.findIndex(h => h.toLowerCase().includes('merchant'));
          const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('category'));
          const noteIndex = headers.findIndex(h => h.toLowerCase().includes('note'));
          
          if (merchantNameIndex === -1) {
            throw new Error('Invalid CSV: missing Merchant Name column');
          }
          
          let importedCount = 0;
          
          // Process data rows (skip header)
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty lines
            
            // Parse CSV line (handling quoted values)
            const parseLine = (line: string) => {
              const values = [];
              let inQuotes = false;
              let currentValue = '';
              
              for (let char of line) {
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  values.push(currentValue);
                  currentValue = '';
                } else {
                  currentValue += char;
                }
              }
              
              values.push(currentValue); // Add the last value
              return values;
            };
            
            const values = parseLine(lines[i]);
            
            const merchantName = values[merchantNameIndex]?.replace(/^"|"$/g, '');
            if (!merchantName) {
              console.warn(`Skipping row ${i+1}: missing merchant name`);
              continue;
            }
            
            const category = categoryIndex !== -1 ? values[categoryIndex]?.replace(/^"|"$/g, '') : undefined;
            const note = noteIndex !== -1 ? values[noteIndex]?.replace(/^"|"$/g, '') : '';
            
            // Prepare note input
            const noteInput: MerchantNoteInput = {
              merchantName,
              note: note || '',
              category: category as ExpenseCategory | undefined
            };
            
            await saveMerchantNote(noteInput);
            importedCount++;
          }
          
          resolve(importedCount);
        } catch (error) {
          console.error('Error processing CSV import:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(csvFile);
    });
  } catch (error) {
    console.error('Error importing merchant notes from CSV:', error);
    throw new Error('Failed to import merchant notes from CSV');
  }
};
