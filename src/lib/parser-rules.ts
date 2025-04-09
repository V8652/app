
import { v4 as uuidv4 } from 'uuid';
import { openDB } from 'idb';
import { initDB } from './db';
import { ExpenseParserRule } from '@/types/expense-parser';

const DB_NAME = 'money-minder-db';
const PARSER_RULES_STORE = 'parserRules';

export interface ParserRule {
  id: string;
  name: string;
  senderMatch: string | string[];
  subjectMatch: string | string[];
  additionalSearchQuery?: string;
  merchantNameRegex?: string;
  amountRegex: string | string[];
  dateRegex?: string;
  categoryMatch?: string;
  enabled: boolean;
  lastModified: string;
  
  // Additional properties needed by ExpenseParserRule
  merchantCondition?: string | string[];
  paymentBank?: string;
  skipCondition?: string | string[];
  noExtractCondition?: string | string[];
  priority?: number;
  extractMerchantFromSubject?: boolean;
  merchantCommonPatterns?: string[];
  createdAt?: number;
  updatedAt?: number;
  lastError?: string;
  successCount?: number;
}

// Helper function to normalize string or string array fields
// This prevents duplication when updating rules
const normalizeStringOrArray = (value: string | string[] | undefined): string | string[] | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  
  // If it's an empty string, return an empty array
  if (typeof value === 'string' && value.trim() === '') {
    return [];
  }
  
  // If it's already an array, filter out empty strings and return unique values
  if (Array.isArray(value)) {
    // Filter out empty strings and duplicates
    const filteredArray = [...new Set(value.filter(item => item && item.trim() !== ''))];
    return filteredArray.length > 0 ? filteredArray : [];
  }
  
  // If it's a string, return it as is
  return value;
};

// Get all parser rules
export async function getParserRules(): Promise<ParserRule[]> {
  try {
    const db = await initDB();
    return await db.getAll(PARSER_RULES_STORE);
  } catch (error) {
    console.error('Error getting parser rules:', error);
    return [];
  }
}

// Add a new parser rule
export async function addParserRule(rule: Omit<ParserRule, 'id' | 'lastModified'>): Promise<ParserRule> {
  try {
    const db = await initDB();
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Normalize string array fields to prevent empty values
    const normalizedRule = {
      ...rule,
      senderMatch: normalizeStringOrArray(rule.senderMatch) || '',
      subjectMatch: normalizeStringOrArray(rule.subjectMatch) || '',
      amountRegex: normalizeStringOrArray(rule.amountRegex) || '',
      merchantCondition: normalizeStringOrArray(rule.merchantCondition),
      skipCondition: normalizeStringOrArray(rule.skipCondition),
      noExtractCondition: normalizeStringOrArray(rule.noExtractCondition),
      merchantCommonPatterns: normalizeStringOrArray(rule.merchantCommonPatterns) as string[] | undefined,
    };
    
    const newRule: ParserRule = {
      id,
      ...normalizedRule,
      lastModified: now,
      // Add additional required properties
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    await db.add(PARSER_RULES_STORE, newRule);
    return newRule;
  } catch (error) {
    console.error('Error adding parser rule:', error);
    throw error;
  }
}

// Update an existing parser rule
export async function updateParserRule(rule: ParserRule): Promise<ParserRule> {
  try {
    const db = await initDB();
    const now = new Date().toISOString();
    
    // First check if this rule exists to prevent duplication
    const existingRule = await db.get(PARSER_RULES_STORE, rule.id);
    if (!existingRule) {
      throw new Error(`Cannot update rule with ID ${rule.id}: Rule not found`);
    }
    
    // Normalize string array fields to prevent duplication and empty values
    const normalizedRule = {
      ...rule,
      senderMatch: normalizeStringOrArray(rule.senderMatch) || '',
      subjectMatch: normalizeStringOrArray(rule.subjectMatch) || '',
      amountRegex: normalizeStringOrArray(rule.amountRegex) || '',
      merchantCondition: normalizeStringOrArray(rule.merchantCondition),
      skipCondition: normalizeStringOrArray(rule.skipCondition),
      noExtractCondition: normalizeStringOrArray(rule.noExtractCondition),
      merchantCommonPatterns: normalizeStringOrArray(rule.merchantCommonPatterns) as string[] | undefined,
    };
    
    console.log('Normalized rule before update:', normalizedRule);
    
    const updatedRule = {
      ...normalizedRule,
      lastModified: now,
      updatedAt: Date.now()
    };
    
    await db.put(PARSER_RULES_STORE, updatedRule);
    return updatedRule;
  } catch (error) {
    console.error('Error updating parser rule:', error);
    throw error;
  }
}

// Delete a parser rule
export async function deleteParserRule(id: string): Promise<void> {
  try {
    const db = await initDB();
    await db.delete(PARSER_RULES_STORE, id);
  } catch (error) {
    console.error('Error deleting parser rule:', error);
    throw error;
  }
}

// Toggle rule enabled state
export async function toggleParserRuleEnabled(id: string, enabled: boolean): Promise<void> {
  try {
    const db = await initDB();
    const rule = await db.get(PARSER_RULES_STORE, id);
    
    if (rule) {
      rule.enabled = enabled;
      rule.lastModified = new Date().toISOString();
      rule.updatedAt = Date.now();
      await db.put(PARSER_RULES_STORE, rule);
    }
  } catch (error) {
    console.error('Error toggling parser rule:', error);
    throw error;
  }
}

// Helper functions to convert between types
export function convertRuleToParserRule(rule: ExpenseParserRule): ParserRule {
  return {
    id: rule.id,
    name: rule.name,
    senderMatch: normalizeStringOrArray(rule.senderMatch) || '',
    subjectMatch: normalizeStringOrArray(rule.subjectMatch) || '',
    amountRegex: normalizeStringOrArray(rule.amountRegex) || '',
    merchantCondition: normalizeStringOrArray(rule.merchantCondition),
    paymentBank: rule.paymentBank || '',
    skipCondition: normalizeStringOrArray(rule.skipCondition),
    noExtractCondition: normalizeStringOrArray(rule.noExtractCondition),
    dateRegex: rule.dateRegex || '',
    priority: rule.priority || 0,
    enabled: rule.enabled,
    lastModified: rule.lastModified || new Date().toISOString(),
    additionalSearchQuery: rule.additionalSearchQuery,
    extractMerchantFromSubject: rule.extractMerchantFromSubject,
    merchantCommonPatterns: normalizeStringOrArray(rule.merchantCommonPatterns) as string[] | undefined,
    createdAt: rule.createdAt || Date.now(),
    updatedAt: rule.updatedAt || Date.now(),
    lastError: rule.lastError,
    successCount: rule.successCount
  };
}

export function convertParserRuleToRule(rule: ParserRule): ExpenseParserRule {
  return {
    id: rule.id,
    name: rule.name,
    senderMatch: normalizeStringOrArray(rule.senderMatch) || '',
    subjectMatch: normalizeStringOrArray(rule.subjectMatch) || '',
    amountRegex: normalizeStringOrArray(rule.amountRegex) || '',
    merchantCondition: normalizeStringOrArray(rule.merchantCondition) || '',
    paymentBank: rule.paymentBank || '',
    skipCondition: normalizeStringOrArray(rule.skipCondition) || '',
    noExtractCondition: normalizeStringOrArray(rule.noExtractCondition) || '',
    dateRegex: rule.dateRegex || '',
    priority: rule.priority || 0,
    enabled: rule.enabled,
    lastModified: rule.lastModified,
    additionalSearchQuery: rule.additionalSearchQuery,
    extractMerchantFromSubject: rule.extractMerchantFromSubject,
    merchantCommonPatterns: normalizeStringOrArray(rule.merchantCommonPatterns) as string[] | undefined,
    createdAt: rule.createdAt || Date.now(),
    updatedAt: rule.updatedAt || Date.now(),
    lastError: rule.lastError,
    successCount: rule.successCount
  };
}
