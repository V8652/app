
import { useState, useEffect } from 'react';
import { Expense, ExpenseCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { getUserCategories } from '@/lib/db';
import { getPreviousTransactionData } from '@/lib/transaction-enricher';

// Default categories for the form - Now only contains 'other'
const DEFAULT_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'other', label: 'Other' }
];

// Currency options with INR as first option
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

// Form schema with validation
const formSchema = z.object({
  merchantName: z.string().min(1, 'Merchant name is required'),
  amount: z.string().min(1, 'Amount is required').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    { message: 'Amount must be a positive number' }
  ),
  currency: z.string().min(1, 'Currency is required'),
  date: z.date({
    required_error: "Date is required",
  }),
  category: z.string().min(1, 'Category is required'),
  paymentMethod: z.string().optional(),
  notes: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  expense?: Expense;
  onSubmit: (expense: Expense) => void;
  onCancel: () => void;
}

const ExpenseForm = ({ expense, onSubmit, onCancel }: ExpenseFormProps) => {
  const [categories, setCategories] = useState<{ value: string; label: string }[]>(DEFAULT_CATEGORIES);

  // Load custom categories
  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        const userCategories = await getUserCategories();
        
        if (userCategories.expenseCategories && userCategories.expenseCategories.length > 0) {
          const customCategories = userCategories.expenseCategories.map(cat => ({
            value: cat,
            label: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ')
          }));
          
          setCategories([...DEFAULT_CATEGORIES, ...customCategories]);
        }
      } catch (error) {
        console.error('Error loading custom categories:', error);
      }
    };
    
    loadCustomCategories();
  }, []);

  // Initialize form with existing expense data or defaults
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: expense ? {
      merchantName: expense.merchantName,
      // Ensure amount is always positive for the form
      amount: Math.abs(expense.amount).toString(),
      currency: expense.currency,
      date: new Date(expense.date),
      category: expense.category,
      paymentMethod: expense.paymentMethod || '',
      notes: expense.notes || ''
    } : {
      merchantName: '',
      amount: '',
      currency: 'INR',
      date: new Date(),
      category: 'other',
      paymentMethod: '',
      notes: ''
    }
  });

  // Auto-populate category and notes based on merchant name
  const handleMerchantNameChange = async (merchantName: string) => {
    if (!merchantName) return;
    
    try {
      const previousData = await getPreviousTransactionData(merchantName);
      
      if (previousData) {
        // Only update category if there's data and current is default
        if (previousData.category && form.getValues('category') === 'other') {
          form.setValue('category', previousData.category);
        }
        
        // Only update notes if they're empty
        if (previousData.notes && !form.getValues('notes')) {
          form.setValue('notes', previousData.notes);
        }
      }
    } catch (error) {
      console.error('Error finding previous transaction data:', error);
    }
  };

  const handleSubmit = (values: FormValues) => {
    const formattedExpense: Expense = {
      id: expense?.id || uuidv4(),
      merchantName: values.merchantName,
      // Always store as positive amount
      amount: Math.abs(parseFloat(values.amount)),
      currency: values.currency,
      date: values.date.toISOString(),
      category: values.category as ExpenseCategory,
      paymentMethod: values.paymentMethod || undefined,
      notes: values.notes || undefined,
      type: 'expense',
      isManualEntry: true
    };
    
    onSubmit(formattedExpense);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Merchant Name */}
          <FormField
            control={form.control}
            name="merchantName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Merchant</FormLabel>
                <FormControl>
                  <Input 
                    className="input-animated" 
                    placeholder="e.g. Whole Foods" 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e);
                      handleMerchantNameChange(e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Amount & Currency */}
          <div className="flex space-x-3">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      className="input-animated" 
                      placeholder="0.00" 
                      step="0.01" 
                      min="0"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem className="w-24">
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map(currency => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Date */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Category */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Payment Method */}
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <FormControl>
                  <Input 
                    className="input-animated" 
                    placeholder="e.g. Credit Card" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  className="resize-none" 
                  placeholder="Additional details about this expense..." 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="btn-primary">
            {expense ? 'Update Expense' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ExpenseForm;
