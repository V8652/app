
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { v4 as uuidv4 } from 'uuid';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Income, IncomeCategory } from '@/types';
import { getPreferences } from '@/lib/db';

// Define form schema with zod
const formSchema = z.object({
  merchantName: z.string().min(1, "Source name is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.string().min(1, "Currency is required"),
  date: z.date(),
  category: z.string().min(1, "Category is required"),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

type IncomeFormValues = z.infer<typeof formSchema>;

interface IncomeFormProps {
  onSubmit: (income: Income) => void;
  onCancel?: () => void;
  initialData?: Income;
}

const INCOME_CATEGORIES: { value: IncomeCategory; label: string }[] = [
  { value: 'salary', label: 'Salary' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'investment', label: 'Investment' },
  { value: 'gift', label: 'Gift' },
  { value: 'refund', label: 'Refund' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = [
  'Bank Transfer',
  'PayPal',
  'Cash',
  'Check',
  'Credit Card',
  'Debit Card',
  'Other',
];

const IncomeForm = ({ onSubmit, onCancel, initialData }: IncomeFormProps) => {
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [defaultCategory, setDefaultCategory] = useState<IncomeCategory>('other');

  useEffect(() => {
    // Load user preferences
    const loadPreferences = async () => {
      try {
        const preferences = await getPreferences();
        setDefaultCurrency(preferences.defaultCurrency);
        setDefaultCategory(preferences.defaultIncomeCategory);
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };
    
    loadPreferences();
  }, []);

  // Parse date safely
  const parseInitialDate = () => {
    if (!initialData?.date) return new Date();
    
    // Handle both string and number date formats
    return typeof initialData.date === 'string' 
      ? new Date(initialData.date) 
      : new Date(initialData.date);
  };

  // Initialize form with default values or initialData
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      merchantName: initialData.merchantName,
      amount: initialData.amount,
      currency: initialData.currency,
      date: parseInitialDate(),
      category: initialData.category,
      paymentMethod: initialData.paymentMethod || '',
      notes: initialData.notes || '',
    } : {
      merchantName: '',
      amount: 0,
      currency: defaultCurrency,
      date: new Date(),
      category: defaultCategory,
      paymentMethod: '',
      notes: '',
    },
  });

  // Update form defaults when preferences load
  useEffect(() => {
    if (!initialData) {
      form.setValue('currency', defaultCurrency);
      form.setValue('category', defaultCategory);
    }
  }, [defaultCurrency, defaultCategory, initialData, form]);

  const handleSubmit = (values: IncomeFormValues) => {
    const income: Income = {
      id: initialData?.id || uuidv4(),
      merchantName: values.merchantName,
      amount: values.amount,
      currency: values.currency,
      date: values.date.toISOString(),
      category: values.category as IncomeCategory,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
      isManualEntry: true,
      type: 'income',
    };
    
    onSubmit(income);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="merchantName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Employer, Freelance Client" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                        "pl-3 text-left font-normal",
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
                  {INCOME_CATEGORIES.map((category) => (
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

        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Add additional details here..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit">Save Income</Button>
        </div>
      </form>
    </Form>
  );
};

export default IncomeForm;
