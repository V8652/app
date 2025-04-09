
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  Form, FormControl, FormDescription, 
  FormField, FormItem, FormLabel, FormMessage 
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
  AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LogOut, User } from 'lucide-react';

import { ExpenseCategory, IncomeCategory, TimeFrame, UserPreferences } from '@/types';
import { getPreferences, savePreferences } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { clearCredentials, isAuthorized } from '@/lib/gmail-auth';
import DataImportExport from '@/components/DataImportExport';
import ParserRulesManager from '@/components/ParserRulesManager';
import MerchantNotesManager from '@/components/MerchantNotesManager';
import { ensureDefaultParserRules } from '@/lib/apply-parser-rules';
import { addParserRule, ExpenseParserRuleInput } from '@/lib/parser-rules';

const formSchema = z.object({
  defaultCurrency: z.string(),
  defaultExpenseCategory: z.string().optional(),
  defaultIncomeCategory: z.string(),
  defaultTimeFrame: z.string(),
  categorizeAutomatically: z.boolean(),
});

type SettingsFormValues = z.infer<typeof formSchema>;

const Settings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      defaultCurrency: 'INR',
      defaultExpenseCategory: '',
      defaultIncomeCategory: 'salary',
      defaultTimeFrame: 'month',
      categorizeAutomatically: true,
    },
  });

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await getPreferences();
        form.reset({
          defaultCurrency: preferences.defaultCurrency,
          defaultExpenseCategory: preferences.defaultExpenseCategory,
          defaultIncomeCategory: preferences.defaultIncomeCategory,
          defaultTimeFrame: preferences.defaultTimeFrame,
          categorizeAutomatically: preferences.categorizeAutomatically,
        });
        
        await ensureDefaultParserRules();
        
        // Check Gmail authentication status
        const authorized = await isAuthorized();
        setIsAuthenticated(authorized);
        
        // If authenticated, try to get user info
        if (authorized && window.gapi && window.gapi.client && window.gapi.client.gmail) {
          try {
            const response = await window.gapi.client.gmail.users.getProfile({
              userId: 'me'
            });
            setLoggedInUser(response.result.emailAddress);
          } catch (error) {
            console.error('Error getting Gmail profile:', error);
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
        toast({
          title: 'Error Loading Settings',
          description: 'Could not load your preferences. Using defaults.',
          variant: 'destructive',
        });
      }
    };
    
    loadPreferences();
  }, [form]);

  const onSubmit = async (values: SettingsFormValues) => {
    setIsLoading(true);
    try {
      const existingPreferences = await getPreferences();
      
      const updatedPreferences: UserPreferences = {
        ...existingPreferences,
        defaultCurrency: values.defaultCurrency,
        defaultExpenseCategory: values.defaultExpenseCategory as ExpenseCategory,
        defaultIncomeCategory: values.defaultIncomeCategory as IncomeCategory,
        defaultTimeFrame: values.defaultTimeFrame as TimeFrame,
        categorizeAutomatically: values.categorizeAutomatically,
      };
      
      await savePreferences(updatedPreferences);
      
      toast({
        title: 'Settings Saved',
        description: 'Your preferences have been updated successfully.',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error Saving Settings',
        description: 'Could not save your preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearGmailAuth = async () => {
    try {
      await clearCredentials();
      setIsAuthenticated(false);
      setLoggedInUser(null);
      toast({
        title: 'Gmail Logout Successful',
        description: 'You have been logged out of Gmail. You can reconnect with a different account.',
      });
    } catch (error) {
      console.error('Error clearing Gmail auth:', error);
      toast({
        title: 'Error',
        description: 'Could not log out from Gmail.',
        variant: 'destructive',
      });
    }
  };

  const handleDataChanged = () => {
    toast({
      title: 'Data Updated',
      description: 'Your transaction data has been updated.',
    });
  };

  const addHdfcUpiRule = async () => {
    try {
      const ruleInput: ExpenseParserRuleInput = {
        name: "HDFC UPI Transaction",
        enabled: true,
        senderMatch: "alerts@hdfcbank.net",
        subjectMatch: "UPI txn",
        amountRegex: "Rs\\.(\\d+\\.\\d{2})",
        merchantCondition: "to (.+?) on",
        paymentBank: "HDFC Bank",
        skipCondition: "",
        noExtractCondition: "",
        dateRegex: "(\\d{2}-\\d{2}-\\d{2})",
        priority: 10,
        additionalSearchQuery: "",
      };
      
      await addParserRule(ruleInput);
      
      toast({
        title: 'HDFC UPI Parser Rule Added',
        description: 'The parser rule for HDFC Bank UPI transactions has been added.',
      });
    } catch (error) {
      console.error('Error adding HDFC UPI rule:', error);
      toast({
        title: 'Error',
        description: 'Could not add HDFC UPI parser rule.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your preferences and account settings
          </p>
        </header>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full md:w-auto" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="gmail">Gmail</TabsTrigger>
            <TabsTrigger value="parsing">Parsing</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure your default preferences for the application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="defaultCurrency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                              <SelectItem value="USD">USD - US Dollar</SelectItem>
                              <SelectItem value="EUR">EUR - Euro</SelectItem>
                              <SelectItem value="GBP">GBP - British Pound</SelectItem>
                              <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                              <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                              <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                              <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The default currency used for new transactions
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="defaultExpenseCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Expense Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Default Category</SelectItem>
                              <SelectItem value="groceries">Groceries</SelectItem>
                              <SelectItem value="utilities">Utilities</SelectItem>
                              <SelectItem value="entertainment">Entertainment</SelectItem>
                              <SelectItem value="transportation">Transportation</SelectItem>
                              <SelectItem value="dining">Dining</SelectItem>
                              <SelectItem value="shopping">Shopping</SelectItem>
                              <SelectItem value="health">Health</SelectItem>
                              <SelectItem value="travel">Travel</SelectItem>
                              <SelectItem value="housing">Housing</SelectItem>
                              <SelectItem value="education">Education</SelectItem>
                              <SelectItem value="subscriptions">Subscriptions</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The default category for new expenses (can be left blank)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="defaultIncomeCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Income Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="salary">Salary</SelectItem>
                              <SelectItem value="freelance">Freelance</SelectItem>
                              <SelectItem value="investment">Investment</SelectItem>
                              <SelectItem value="gift">Gift</SelectItem>
                              <SelectItem value="refund">Refund</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The default category for new income
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="defaultTimeFrame"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Time Frame</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select time frame" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="week">Week</SelectItem>
                              <SelectItem value="month">Month</SelectItem>
                              <SelectItem value="quarter">Quarter</SelectItem>
                              <SelectItem value="year">Year</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The default time period for reports and views
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="categorizeAutomatically"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Automatic Categorization</FormLabel>
                            <FormDescription>
                              Automatically categorize transactions based on merchant name
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
                    
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gmail" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gmail Authentication</CardTitle>
                <CardDescription>
                  Manage your Gmail connection for expense scanning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-md p-4 flex items-center justify-between bg-muted/20">
                  <div className="space-y-1 flex items-center gap-3">
                    {isAuthenticated ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-base font-medium">Connected Account</h3>
                          {loggedInUser ? (
                            <p className="text-sm text-muted-foreground" id="gmail-auth-status">
                              {loggedInUser}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground" id="gmail-auth-status">
                              You're currently logged in to Gmail
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-base font-medium">Not Connected</h3>
                          <p className="text-sm text-muted-foreground" id="gmail-auth-status">
                            Connect to Gmail to scan expenses
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div>
                    {isAuthenticated && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="gap-2">
                            <LogOut className="h-4 w-4" />
                            Logout
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Log out from Gmail?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will disconnect your Gmail account. You'll need to reconnect to scan for expenses again.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearGmailAuth}>
                              Logout
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  For Gmail integration, we use direct authentication with your Gmail account.
                  This provides a simpler and more secure way to access your expense emails.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button variant="secondary" onClick={addHdfcUpiRule}>
                    Add HDFC UPI Parser Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parsing" className="space-y-6">
            <ParserRulesManager />
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <MerchantNotesManager />
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <DataImportExport onDataChanged={handleDataChanged} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
