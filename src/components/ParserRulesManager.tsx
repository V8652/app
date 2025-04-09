import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PlusCircle, Edit, Trash2, Copy, Save, X, AlertCircle, 
  Search, Plus, Trash, Download, Upload, ToggleLeft 
} from 'lucide-react';
import { ExpenseParserRule } from '@/types/expense-parser';
import { getParserRules, addParserRule, updateParserRule, deleteParserRule, ExpenseParserRuleInput } from '@/lib/parser-rules';
import { toast } from '@/hooks/use-toast';
import { ensureDefaultParserRules } from '@/lib/apply-parser-rules';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  enabled: z.boolean().default(true),
  senderMatch: z.string().min(1, 'Sender match pattern is required'),
  subjectMatch: z.string(),
  amountRegex: z.string().min(1, 'Amount regex is required'),
  merchantCondition: z.string(),
  paymentBank: z.string(),
  skipCondition: z.string(),
  noExtractCondition: z.string(),
  dateRegex: z.string(),
  priority: z.number().int().min(0).default(1),
  additionalSearchQuery: z.string(),
  extractMerchantFromSubject: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

const ParserRulesManager = () => {
  const [rules, setRules] = useState<ExpenseParserRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<ExpenseParserRule | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<ExpenseParserRule | null>(null);
  const [merchantCommonPatterns, setMerchantCommonPatterns] = useState<string[]>([]);
  const [newCommonPattern, setNewCommonPattern] = useState('');
  const [regexTestInput, setRegexTestInput] = useState('');
  const [regexTestResults, setRegexTestResults] = useState<{type: string, pattern: string, match: string | null}[]>([]);
  const [activeTestTab, setActiveTestTab] = useState('merchant');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      enabled: true,
      senderMatch: '',
      subjectMatch: '',
      amountRegex: '\\$(\\d+(?:\\.\\d{1,2})?)',
      merchantCondition: '',
      paymentBank: '',
      skipCondition: '',
      noExtractCondition: '',
      dateRegex: '',
      priority: 1,
      additionalSearchQuery: '',
      extractMerchantFromSubject: false,
    },
  });

  useEffect(() => {
    loadRules();
  }, []);

  useEffect(() => {
    if (currentRule) {
      form.reset({
        name: currentRule.name,
        enabled: currentRule.enabled,
        senderMatch: currentRule.senderMatch,
        subjectMatch: currentRule.subjectMatch,
        amountRegex: currentRule.amountRegex,
        merchantCondition: currentRule.merchantCondition,
        paymentBank: currentRule.paymentBank,
        skipCondition: currentRule.skipCondition,
        noExtractCondition: currentRule.noExtractCondition,
        dateRegex: currentRule.dateRegex,
        priority: currentRule.priority,
        additionalSearchQuery: currentRule.additionalSearchQuery || '',
        extractMerchantFromSubject: currentRule.extractMerchantFromSubject || false,
      });
      
      setMerchantCommonPatterns(currentRule.merchantCommonPatterns || []);
    }
  }, [currentRule, form]);

  const loadRules = async () => {
    setIsLoading(true);
    try {
      await ensureDefaultParserRules();
      
      const loadedRules = await getParserRules();
      setRules(loadedRules.sort((a, b) => b.priority - a.priority));
    } catch (error) {
      console.error('Failed to load parser rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load parser rules',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRule = () => {
    setCurrentRule(null);
    form.reset({
      name: '',
      enabled: true,
      senderMatch: '',
      subjectMatch: '',
      amountRegex: '\\$(\\d+(?:\\.\\d{1,2})?)',
      merchantCondition: '',
      paymentBank: '',
      skipCondition: '',
      noExtractCondition: '',
      dateRegex: '',
      priority: 1,
      additionalSearchQuery: '',
      extractMerchantFromSubject: false,
    });
    setMerchantCommonPatterns([]);
    setNewCommonPattern('');
    setRegexTestResults([]);
    setRegexTestInput('');
    setIsDialogOpen(true);
  };

  const handleEditRule = (rule: ExpenseParserRule) => {
    setCurrentRule(rule);
    setRegexTestResults([]);
    setRegexTestInput('');
    setIsDialogOpen(true);
  };

  const handleDuplicateRule = (rule: ExpenseParserRule) => {
    const { id, createdAt, updatedAt, ...rest } = rule;
    setCurrentRule(null);
    form.reset({
      ...rest,
      name: `${rest.name} (Copy)`,
      additionalSearchQuery: rest.additionalSearchQuery || '',
      extractMerchantFromSubject: rest.extractMerchantFromSubject || false,
    });
    setMerchantCommonPatterns(rest.merchantCommonPatterns || []);
    setNewCommonPattern('');
    setRegexTestResults([]);
    setRegexTestInput('');
    setIsDialogOpen(true);
  };

  const handleDeleteRule = (rule: ExpenseParserRule) => {
    setRuleToDelete(rule);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteRule = async () => {
    if (!ruleToDelete) return;
    
    try {
      await deleteParserRule(ruleToDelete.id);
      setRules(rules.filter(r => r.id !== ruleToDelete.id));
      toast({
        title: 'Success',
        description: 'Parser rule deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete parser rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete parser rule',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setRuleToDelete(null);
    }
  };

  const toggleRuleStatus = async (rule: ExpenseParserRule) => {
    try {
      const updatedRule = {
        ...rule,
        enabled: !rule.enabled,
        updatedAt: Date.now()
      };
      
      const savedRule = await updateParserRule(updatedRule);
      
      setRules(prevRules => 
        prevRules.map(r => r.id === savedRule.id ? savedRule : r)
          .sort((a, b) => b.priority - a.priority)
      );
      
      toast({
        title: savedRule.enabled ? 'Rule Enabled' : 'Rule Disabled',
        description: `"${savedRule.name}" has been ${savedRule.enabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error('Failed to toggle rule status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update rule status',
        variant: 'destructive',
      });
    }
  };

  const exportRules = () => {
    try {
      const rulesData = JSON.stringify(rules, null, 2);
      
      const blob = new Blob([rulesData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-parser-rules-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast({
        title: 'Rules Exported',
        description: `${rules.length} rules have been exported to JSON.`
      });
    } catch (error) {
      console.error('Failed to export rules:', error);
      toast({
        title: 'Export Failed',
        description: 'Could not export rules to JSON.',
        variant: 'destructive'
      });
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const importRules = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const importedRules = JSON.parse(content) as ExpenseParserRule[];
          
          if (!Array.isArray(importedRules)) {
            throw new Error('Invalid rules format');
          }
          
          let importCount = 0;
          let updateCount = 0;
          
          for (const rule of importedRules) {
            const existingRuleIndex = rules.findIndex(r => r.id === rule.id);
            
            if (existingRuleIndex >= 0) {
              await updateParserRule(rule);
              updateCount++;
            } else {
              const { id, createdAt, updatedAt, ...ruleData } = rule;
              await addParserRule(ruleData);
              importCount++;
            }
          }
          
          await loadRules();
          
          toast({
            title: 'Rules Imported',
            description: `Imported ${importCount} new rules and updated ${updateCount} existing rules.`
          });
        } catch (error) {
          console.error('Error parsing imported rules:', error);
          toast({
            title: 'Import Failed',
            description: 'Invalid rule format in the imported file.',
            variant: 'destructive'
          });
        }
      };
      
      reader.readAsText(file);
      
      event.target.value = '';
    } catch (error) {
      console.error('Failed to import rules:', error);
      toast({
        title: 'Import Failed',
        description: 'Could not import rules from file.',
        variant: 'destructive'
      });
    }
  };

  const validateRegexPattern = (pattern: string): boolean => {
    if (!pattern.trim()) return true;
    
    try {
      new RegExp(pattern);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleAddCommonPattern = () => {
    if (newCommonPattern.trim() && !merchantCommonPatterns.includes(newCommonPattern.trim())) {
      if (validateRegexPattern(newCommonPattern.trim())) {
        setMerchantCommonPatterns([...merchantCommonPatterns, newCommonPattern.trim()]);
        setNewCommonPattern('');
      } else {
        toast({
          title: 'Invalid Regex',
          description: 'Please enter a valid regular expression pattern',
          variant: 'destructive',
        });
      }
    }
  };

  const handleRemoveCommonPattern = (pattern: string) => {
    setMerchantCommonPatterns(merchantCommonPatterns.filter(p => p !== pattern));
  };
  
  const testPatterns = () => {
    if (!regexTestInput.trim()) {
      toast({
        title: 'Test Input Required',
        description: 'Please enter text to test the patterns against',
        variant: 'destructive',
      });
      return;
    }
    
    const results: {type: string, pattern: string, match: string | null}[] = [];
    
    if (activeTestTab === 'merchant') {
      if (merchantCommonPatterns.length > 0) {
        merchantCommonPatterns.forEach(pattern => {
          try {
            const regex = new RegExp(pattern, 'i');
            const match = regexTestInput.match(regex);
            results.push({
              type: 'common',
              pattern: `Common Pattern: ${pattern}`,
              match: match && match[1] ? match[1] : null
            });
          } catch (e) {
            results.push({
              type: 'common',
              pattern: `Common Pattern: ${pattern}`,
              match: `Error: ${(e as Error).message}`
            });
          }
        });
      }
      
      const merchantCondition = form.getValues('merchantCondition');
      if (merchantCondition) {
        try {
          const regex = new RegExp(merchantCondition, 'i');
          const match = regexTestInput.match(regex);
          results.push({
            type: 'condition',
            pattern: `Merchant Condition: ${merchantCondition}`,
            match: match && match[1] ? match[1] : null
          });
        } catch (e) {
          results.push({
            type: 'condition',
            pattern: `Merchant Condition: ${merchantCondition}`,
            match: `Error: ${(e as Error).message}`
          });
        }
      }
    } else if (activeTestTab === 'amount') {
      const amountRegex = form.getValues('amountRegex');
      if (amountRegex) {
        try {
          const regex = new RegExp(amountRegex, 'i');
          const match = regexTestInput.match(regex);
          let displayMatch = match && match[1] ? match[1] : null;
          
          if (displayMatch) {
            try {
              const parsedAmount = parseFloat(displayMatch);
              if (!isNaN(parsedAmount)) {
                displayMatch = `${displayMatch} (parsed as: ${parsedAmount.toFixed(2)})`;
              }
            } catch (e) {
            }
          }
          
          results.push({
            type: 'amount',
            pattern: `Amount Regex: ${amountRegex}`,
            match: displayMatch
          });
        } catch (e) {
          results.push({
            type: 'amount',
            pattern: `Amount Regex: ${amountRegex}`,
            match: `Error: ${(e as Error).message}`
          });
        }
      }
    } else if (activeTestTab === 'other') {
      const dateRegex = form.getValues('dateRegex');
      if (dateRegex) {
        try {
          const regex = new RegExp(dateRegex, 'i');
          const match = regexTestInput.match(regex);
          let displayMatch = match && match[1] ? match[1] : null;
          
          if (displayMatch) {
            try {
              const parsedDate = new Date(displayMatch);
              if (!isNaN(parsedDate.getTime())) {
                displayMatch = `${displayMatch} (parsed as: ${parsedDate.toISOString()})`;
              }
            } catch (e) {
            }
          }
          
          results.push({
            type: 'date',
            pattern: `Date Regex: ${dateRegex}`,
            match: displayMatch
          });
        } catch (e) {
          results.push({
            type: 'date',
            pattern: `Date Regex: ${dateRegex}`,
            match: `Error: ${(e as Error).message}`
          });
        }
      }
      
      const skipCondition = form.getValues('skipCondition');
      if (skipCondition) {
        try {
          const regex = new RegExp(skipCondition, 'i');
          const match = regex.test(regexTestInput);
          results.push({
            type: 'skip',
            pattern: `Skip Condition: ${skipCondition}`,
            match: match ? 'Email would be skipped' : 'Email would be processed'
          });
        } catch (e) {
          results.push({
            type: 'skip',
            pattern: `Skip Condition: ${skipCondition}`,
            match: `Error: ${(e as Error).message}`
          });
        }
      }
      
      const noExtractCondition = form.getValues('noExtractCondition');
      if (noExtractCondition) {
        try {
          const regex = new RegExp(noExtractCondition, 'i');
          const match = regex.test(regexTestInput);
          results.push({
            type: 'noExtract',
            pattern: `No Extract Condition: ${noExtractCondition}`,
            match: match ? 'Email would be processed but no data extracted' : 'Email would be extracted normally'
          });
        } catch (e) {
          results.push({
            type: 'noExtract',
            pattern: `No Extract Condition: ${noExtractCondition}`,
            match: `Error: ${(e as Error).message}`
          });
        }
      }
    }
    
    setRegexTestResults(results);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const regexFields = [
        { name: 'Merchant Condition', value: values.merchantCondition },
        { name: 'Amount Regex', value: values.amountRegex },
        { name: 'Date Regex', value: values.dateRegex },
        { name: 'Skip Condition', value: values.skipCondition },
        { name: 'No Extract Condition', value: values.noExtractCondition }
      ];
      
      for (const field of regexFields) {
        if (field.value && !validateRegexPattern(field.value)) {
          toast({
            title: 'Invalid Regex',
            description: `${field.name} contains an invalid regular expression pattern`,
            variant: 'destructive',
          });
          return;
        }
      }
      
      for (const pattern of merchantCommonPatterns) {
        if (!validateRegexPattern(pattern)) {
          toast({
            title: 'Invalid Regex',
            description: `Common Pattern "${pattern}" is an invalid regular expression`,
            variant: 'destructive',
          });
          return;
        }
      }
      
      const ruleData: ExpenseParserRuleInput = {
        name: values.name,
        enabled: values.enabled ?? true,
        senderMatch: values.senderMatch,
        subjectMatch: values.subjectMatch ?? '',
        amountRegex: values.amountRegex,
        merchantCondition: values.merchantCondition ?? '',
        paymentBank: values.paymentBank ?? '',
        skipCondition: values.skipCondition ?? '',
        noExtractCondition: values.noExtractCondition ?? '',
        dateRegex: values.dateRegex ?? '',
        priority: values.priority ?? 1,
        additionalSearchQuery: values.additionalSearchQuery ?? '',
        merchantCommonPatterns: merchantCommonPatterns.length > 0 ? merchantCommonPatterns : undefined,
        extractMerchantFromSubject: values.extractMerchantFromSubject,
      };
      
      if (currentRule) {
        const updatedRule = await updateParserRule({
          ...currentRule,
          ...ruleData,
        });
        setRules(prevRules => 
          prevRules.map(r => r.id === updatedRule.id ? updatedRule : r)
            .sort((a, b) => b.priority - a.priority)
        );
        toast({
          title: 'Success',
          description: 'Parser rule updated successfully',
        });
      } else {
        const newRule = await addParserRule(ruleData);
        setRules(prevRules => 
          [...prevRules, newRule].sort((a, b) => b.priority - a.priority)
        );
        toast({
          title: 'Success',
          description: 'Parser rule created successfully',
        });
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save parser rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to save parser rule',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Parser Rules</CardTitle>
        <CardDescription>
          Configure rules to extract expenses from different email formats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button onClick={handleAddRule} variant="default">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
            
            <Button onClick={exportRules} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Rules
            </Button>
            
            <Button onClick={handleImportClick} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import Rules
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={importRules}
              accept=".json"
              className="hidden"
            />
          </div>
          
          <p className="text-sm text-muted-foreground">
            Rules are processed in order of priority (higher numbers first).
          </p>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 border rounded-md bg-muted/20">
            <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No parser rules found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create rules to automatically extract expenses from emails
            </p>
            <Button variant="outline" onClick={handleAddRule} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create First Rule
            </Button>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Sender Match</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => toggleRuleStatus(rule)}
                        aria-label={`Toggle ${rule.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>{rule.senderMatch}</TableCell>
                    <TableCell>{rule.priority}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditRule(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDuplicateRule(rule)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteRule(rule)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {currentRule ? `Edit Rule: ${currentRule.name}` : 'Create Parser Rule'}
              </DialogTitle>
              <DialogDescription>
                Configure how expenses are extracted from emails
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[calc(90vh-140px)] pr-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rule Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Amazon Order" {...field} />
                            </FormControl>
                            <FormDescription>
                              Descriptive name for this parser rule
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Enabled</FormLabel>
                              <FormDescription>
                                Turn this rule on or off
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Higher priority rules are processed first
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="senderMatch"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sender Match</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., amazon.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              String that must be in the sender's email address. 
                              Also used to search for relevant emails.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subjectMatch"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject Match</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Order Confirmation" {...field} />
                            </FormControl>
                            <FormDescription>
                              String that must be in the email subject.
                              Also used to search for relevant emails.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="paymentBank"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Bank</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Chase Credit" {...field} />
                            </FormControl>
                            <FormDescription>
                              Optional: Bank or payment method to assign
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="amountRegex"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount Regex</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., \$(\d+(?:\.\d{1,2})?)" {...field} />
                          </FormControl>
                          <FormDescription>
                            Regular expression to extract the amount. First capture group is used.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="extractMerchantFromSubject"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Extract Merchant from Subject Only
                            </FormLabel>
                            <FormDescription>
                              When checked, merchant extraction will use the email subject only. 
                              When unchecked, merchant extraction will use the email body only.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dateRegex"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Regex</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., (\d{2}/\d{2}/\d{4})" {...field} />
                          </FormControl>
                          <FormDescription>
                            Optional: Regular expression to extract the date. Leave empty to use email date.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="merchantCondition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Merchant Condition</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., to (.+?) on" {...field} />
                          </FormControl>
                          <FormDescription>
                            Regular expression to extract merchant name. First capture group is used.
                            Example: "to (.+?) on" will extract "Merchant" from "to Merchant on".
                            This is applied after trying Merchant Common Patterns.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-3 border p-4 rounded-md">
                      <div>
                        <Label htmlFor="merchant-common-patterns">Merchant Common Patterns (RegEx)</Label>
                        <p className="text-sm text-muted-foreground">
                          Regular expressions to extract and clean merchant names. These are tried first before Merchant Condition.
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        {merchantCommonPatterns.map((pattern, index) => (
                          <Badge key={index} className="flex items-center gap-1">
                            {pattern}
                            <button 
                              type="button" 
                              onClick={() => handleRemoveCommonPattern(pattern)}
                              className="ml-1 h-3 w-3 rounded-full bg-muted hover:bg-destructive/50 flex items-center justify-center"
                            >
                              <X className="h-2 w-2" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex gap-2">
                        <Input 
                          id="merchant-common-patterns"
                          value={newCommonPattern} 
                          onChange={(e) => setNewCommonPattern(e.target.value)}
                          placeholder="e.g., @[\w.-]+\s+([A-Za-z0-9\s]+)(?=\s+on)"
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={handleAddCommonPattern}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <FormDescription>
                        Regular expressions to extract merchant names. Capture group (1) is extracted.
                        Example: "@[\w.-]+\s+([A-Za-z0-9\s]+)(?=\s+on)" will extract "Vinay Juice Shop" from "gpay-11256862916@okbizaxis Vinay Juice Shop on"
                      </FormDescription>
                      
                      <div className="mt-4 pt-4 border-t">
                        <Label>Test RegEx Patterns</Label>
                        <div className="flex flex-col gap-2 mt-2">
                          <Input
                            placeholder="Enter text to test patterns against"
                            value={regexTestInput}
                            onChange={(e) => setRegexTestInput(e.target.value)}
                          />
                          
                          <Tabs 
                            defaultValue="merchant" 
                            value={activeTestTab}
                            onValueChange={setActiveTestTab}
                            className="w-full"
                          >
                            <TabsList className="grid grid-cols-3 mb-4">
                              <TabsTrigger value="merchant">Merchant</TabsTrigger>
                              <TabsTrigger value="amount">Amount</TabsTrigger>
                              <TabsTrigger value="other">Other</TabsTrigger>
                            </TabsList>
                          </Tabs>
                          
                          <Button 
                            type="button"
                            variant="secondary"
                            onClick={testPatterns}
                          >
                            Test Patterns
                          </Button>
                          
                          {regexTestResults.length > 0 && (
                            <div className="mt-2 p-2 bg-muted rounded-md">
                              <h4 className="font-medium mb-2">Test Results:</h4>
                              <div className="space-y-2">
                                {regexTestResults.map((result, index) => (
                                  <div key={index} className="text-sm">
                                    <div className="font-mono text-xs">{result.pattern}</div>
                                    <div className={`pl-4 ${result.match ? 'text-green-500' : 'text-red-500'}`}>
                                      {result.match ? `Matched: "${result.match}"` : 'No match'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="skipCondition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skip Condition</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., refund|canceled" {...field} />
                          </FormControl>
                          <FormDescription>
                            Optional: Skip emails containing this text (regex)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="noExtractCondition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>No Extract Condition</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., pending|processing" {...field} />
                          </FormControl>
                          <FormDescription>
                            Optional: Process email but don't extract if this text is found (regex)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="additionalSearchQuery"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Search Query</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., has:attachment newer_than:3d" {...field} />
                          </FormControl>
                          <FormDescription>
                            Optional: Additional Gmail search query parameters (advanced users only)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-600 dark:text-blue-400">
                    <p className="font-medium">Search query information:</p>
                    <p className="mt-1">
                      Your email search will use: 
                      from:({form.watch('senderMatch')}) subject:({form.watch('subjectMatch')}) {form.watch('additionalSearchQuery')}
                    </p>
                  </div>
                </form>
              </Form>
            </ScrollArea>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={form.handleSubmit(onSubmit)}>
                {currentRule ? (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Rule
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Rule
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Parser Rule</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the rule "{ruleToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteRule} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default ParserRulesManager;
