
import { ExpenseParserRule } from '@/types/expense-parser';
import { initDB } from './db';
import { v4 as uuidv4 } from 'uuid';

const PARSER_RULES_STORE = 'parserRules';

// Function to get all parser rules from IndexedDB
export const getParserRules = async (): Promise<ExpenseParserRule[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PARSER_RULES_STORE], 'readonly');
    const store = transaction.objectStore(PARSER_RULES_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => {
      console.error('Get parser rules error:', event);
      reject('Failed to get parser rules');
    };
  });
};

// A type that omits the auto-generated fields from ExpenseParserRule
export type ExpenseParserRuleInput = Omit<ExpenseParserRule, 'id' | 'createdAt' | 'updatedAt'>;

// Function to add a new parser rule to IndexedDB
export const addParserRule = async (ruleInput: ExpenseParserRuleInput): Promise<ExpenseParserRule> => {
  const db = await initDB();
  const timestamp = Date.now();
  
  // Create a complete rule with required fields
  const rule: ExpenseParserRule = {
    ...ruleInput,
    id: uuidv4(),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PARSER_RULES_STORE], 'readwrite');
    const store = transaction.objectStore(PARSER_RULES_STORE);
    const request = store.add(rule);
    
    request.onsuccess = () => resolve(rule);
    request.onerror = (event) => {
      console.error('Add parser rule error:', event);
      reject('Failed to add parser rule');
    };
  });
};

// Function to update an existing parser rule in IndexedDB
export const updateParserRule = async (rule: ExpenseParserRule): Promise<ExpenseParserRule> => {
  const db = await initDB();
  
  // Ensure updatedAt is set
  const updatedRule = {
    ...rule,
    updatedAt: Date.now()
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PARSER_RULES_STORE], 'readwrite');
    const store = transaction.objectStore(PARSER_RULES_STORE);
    const request = store.put(updatedRule);
    
    request.onsuccess = () => resolve(updatedRule);
    request.onerror = (event) => {
      console.error('Update parser rule error:', event);
      reject('Failed to update parser rule');
    };
  });
};

// Function to delete a parser rule from IndexedDB
export const deleteParserRule = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PARSER_RULES_STORE], 'readwrite');
    const store = transaction.objectStore(PARSER_RULES_STORE);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error('Delete parser rule error:', event);
      reject('Failed to delete parser rule');
    };
  });
};

// Use the merchant-notes module directly for these functions
import { saveMerchantNote as saveNote, getMerchantNotes as getNotes, deleteMerchantNote as deleteNote } from './merchant-notes';

export const saveMerchantNote = async (note: any): Promise<any> => {
  return saveNote(note);
};

export const getMerchantNotes = async (): Promise<any[]> => {
  return getNotes();
};

export const deleteMerchantNote = async (id: string): Promise<void> => {
  return deleteNote(id);
};
