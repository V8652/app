import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ExpenseCategory, IncomeCategory, TimeFrame, UserPreferences } from '@/types';
import { getPreferences, savePreferences, getUserCategories } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import DataImportExport from '@/components/DataImportExport';
import CustomCategoryManager from '@/components/CustomCategoryManager';
import { SmsParserRulesManager } from '@/components/parser';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ModeToggle } from "@/components/mode-toggle";

const formSchema = z.object({
  defaultCurrency: z.string(),
  defaultExpenseCategory: z.string().optional(),
  defaultIncomeCategory: z.string(),
  defaultTimeFrame: z.string(),
  categorizeAutomatically: z.boolean()
});
type SettingsFormValues = z.infer<typeof formSchema>;
const Settings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>([]);
  const [customIncomeCategories, setCustomIncomeCategories] = useState<string[]>([]);
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      defaultCurrency: 'INR',
      defaultExpenseCategory: 'other',
      defaultIncomeCategory: 'other',
      defaultTimeFrame: 'month',
      categorizeAutomatically: true
    }
  });
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await getPreferences();
        form.reset({
          defaultCurrency: preferences.defaultCurrency,
          defaultExpenseCategory: preferences.defaultExpenseCategory,
          defaultIncomeCategory: preferences.defaultIncomeCategory,
          defaultTimeFrame: preferences.defaultTimeFrame || 'month',
          categorizeAutomatically: preferences.categorizeAutomatically || true
        });
      } catch (error) {
        console.error('Error loading preferences:', error);
        toast({
          title: 'Error Loading Settings',
          description: 'Could not load your preferences. Using defaults.',
          variant: 'destructive'
        });
      }
    };
    loadPreferences();
  }, [form]);
  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        const userCategories = await getUserCategories();
        if (userCategories.expenseCategories) {
          setCustomExpenseCategories(userCategories.expenseCategories);
        }
        if (userCategories.incomeCategories) {
          setCustomIncomeCategories(userCategories.incomeCategories);
        }
      } catch (error) {
        console.error('Error loading custom categories:', error);
      }
    };
    loadCustomCategories();
  }, []);
  const onSubmit = async (values: SettingsFormValues) => {
    setIsLoading(true);
    try {
      const existingPreferences = await getPreferences();
      const updatedPreferences = {
        ...existingPreferences,
        defaultCurrency: values.defaultCurrency,
        defaultExpenseCategory: values.defaultExpenseCategory as ExpenseCategory,
        defaultIncomeCategory: values.defaultIncomeCategory as IncomeCategory,
        defaultTimeFrame: values.defaultTimeFrame as TimeFrame,
        categorizeAutomatically: values.categorizeAutomatically
      };
      await savePreferences(updatedPreferences);
      toast({
        title: 'Settings Saved',
        description: 'Your preferences have been updated successfully.'
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error Saving Settings',
        description: 'Could not save your preferences. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleDataChanged = () => {
    toast({
      title: 'Data Updated',
      description: 'Your transaction data has been updated.'
    });
  };
  return <Layout>
      <div className="space-y-6 p-0">
        <div className="space-y-2 mx-[16px]">
          <h2 className="text-2xl font-bold tracking-tight mx-0">Settings</h2>
          <p className="text-muted-foreground">
            Manage your application preferences and configurations.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <h3 className="font-medium">Appearance</h3>
              <p className="text-sm text-muted-foreground">
                Customize your theme preference
              </p>
            </div>
            <ModeToggle />
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-4 flex flex-wrap w-full">
              <TabsTrigger value="general" className="mb-1">General</TabsTrigger>
              <TabsTrigger value="categories" className="mb-1">Categories</TabsTrigger>
              <TabsTrigger value="data" className="mb-1">Data Management</TabsTrigger>
              <TabsTrigger value="smsparser" className="mb-1">SMS Parser</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="py-[15px]">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Configure your default preferences for the application
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-w-full overflow-hidden">
                  <ScrollArea className="w-full">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField control={form.control} name="defaultCurrency" render={({
                        field
                      }) => <FormItem>
                                <FormLabel>Default Currency</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
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
                              </FormItem>} />
                            
                        <FormField control={form.control} name="defaultExpenseCategory" render={({
                        field
                      }) => <FormItem>
                                <FormLabel>Default Expense Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">No Default Category</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                    
                                    {customExpenseCategories.map(category => <SelectItem key={category} value={category}>
                                        {category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ')}
                                      </SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  The default category for new expenses (can be left blank)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>} />
                            
                        <FormField control={form.control} name="defaultIncomeCategory" render={({
                        field
                      }) => <FormItem>
                                <FormLabel>Default Income Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="other">Other</SelectItem>
                                    
                                    {customIncomeCategories.map(category => <SelectItem key={category} value={category}>
                                        {category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ')}
                                      </SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  The default category for new income
                                </FormDescription>
                                <FormMessage />
                              </FormItem>} />
                            
                        <FormField control={form.control} name="defaultTimeFrame" render={({
                        field
                      }) => <FormItem>
                                <FormLabel>Default Time Frame</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
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
                              </FormItem>} />
                            
                        <FormField control={form.control} name="categorizeAutomatically" render={({
                        field
                      }) => <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Automatic Categorization</FormLabel>
                                  <FormDescription>
                                    Automatically categorize transactions based on merchant name
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>} />
                            
                        <div className="flex flex-wrap gap-2">
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Settings'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories">
              <div className="w-full mx-0 py-[20px]">
                <CustomCategoryManager />
              </div>
            </TabsContent>

            <TabsContent value="data">
              <div className="space-y-6 py-[12px]">
                <DataImportExport onDataChanged={handleDataChanged} />
              </div>
            </TabsContent>

            <TabsContent value="smsparser">
              <div className="space-y-6 py-[12px]">
                <SmsParserRulesManager />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>;
};
export default Settings;
