
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
      amount: expense.amount.toString(),
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

  const handleSubmit = (values: FormValues) => {
    const formattedExpense: Expense = {
      id: expense?.id || uuidv4(),
      merchantName: values.merchantName,
      amount: parseFloat(values.amount),
      currency: values.currency,
      date: values.date.toISOString(),
      category: values.category as ExpenseCategory,
      paymentMethod: values.paymentMethod || undefined,
      notes: values.notes || undefined,
      isManualEntry: true,
      type: 'expense'
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
                  <Input className="input-animated" placeholder="e.g. Whole Foods" {...field} />
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
