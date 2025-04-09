
import React, { useState } from 'react';
import { Check, Calendar, Calendar as CalendarIcon, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DateRange } from '@/types';
import DateRangeSelector from '@/components/DateRangeSelector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { scanGmailForExpenses } from '@/lib/gmail-auth';
import { toast } from '@/hooks/use-toast';

interface GmailDropdownProps {
  isConnected?: boolean;
  onScanComplete?: (newExpenses: any[]) => void;
  onDateRangeChange?: (range: DateRange) => void;
  dateRange: DateRange;
}

const GmailDropdown: React.FC<GmailDropdownProps> = ({
  isConnected = true,
  onScanComplete,
  onDateRangeChange,
  dateRange
}) => {
  const [isScanningEmails, setIsScanningEmails] = useState(false);
  const [rangeOption, setRangeOption] = useState<string>('custom');

  const handleScanGmail = async () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please connect to Gmail first",
        variant: "destructive",
      });
      return;
    }

    setIsScanningEmails(true);
    try {
      const expenses = await scanGmailForExpenses(dateRange.from.toISOString(), dateRange.to.toISOString());
      toast({
        title: "Scan Complete",
        description: `Found ${expenses.length} expenses in your Gmail`,
      });
      if (onScanComplete) onScanComplete(expenses);
    } catch (error) {
      toast({
        title: "Error Scanning Gmail",
        description: "Failed to scan your Gmail for expenses",
        variant: "destructive",
      });
      console.error("Error scanning Gmail:", error);
    } finally {
      setIsScanningEmails(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/10 rounded-full"
          aria-label="Gmail Connected"
        >
          {isConnected ? (
            <Check className="h-5 w-5 text-green-500" />
          ) : (
            <Mail className="h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="bg-card text-card-foreground rounded-lg overflow-hidden">
          <div className="p-4 flex items-center space-x-4 border-b">
            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h4 className="font-medium">Gmail Connected</h4>
              <p className="text-sm text-muted-foreground">Ready to scan emails</p>
            </div>
            <div className="ml-auto">
              <span className="bg-green-500/20 text-green-600 text-xs rounded-full px-2 py-1">
                Connected
              </span>
            </div>
          </div>
          
          <div className="p-4 border-b">
            <h4 className="font-medium flex items-center mb-3">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Select Date Range
            </h4>
            <div className="space-y-2">
              <Select value={rangeOption} onValueChange={setRangeOption}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Custom Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Range</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="rounded-md border px-3 py-2 bg-muted/30 flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <Button 
              className="w-full" 
              onClick={handleScanGmail}
              disabled={isScanningEmails}
            >
              {isScanningEmails ? (
                "Scanning..."
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Scan Emails for Expenses
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default GmailDropdown;
