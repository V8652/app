import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarRange, CalendarIcon, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

type PresetRange = 'custom' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'lastYear' | 'all';

const DateRangeSelector = ({ value, onChange, className }: DateRangeSelectorProps) => {
  const [date, setDate] = useState<DateRange>({
    from: value.from,
    to: value.to,
  });
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetRange>('custom');
  
  const now = new Date();
  
  useEffect(() => {
    // Detect if current range matches any preset
    detectPreset();
  }, [value]);
  
  const detectPreset = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check each preset
    if (
      format(value.from, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('today');
      return;
    }
    
    if (
      format(value.from, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('yesterday');
      return;
    }
    
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
    
    if (
      format(value.from, 'yyyy-MM-dd') === format(thisWeekStart, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(thisWeekEnd, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('thisWeek');
      return;
    }
    
    const lastWeekStart = startOfWeek(new Date(thisWeekStart.getTime() - 86400000), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(new Date(thisWeekStart.getTime() - 86400000), { weekStartsOn: 1 });
    
    if (
      format(value.from, 'yyyy-MM-dd') === format(lastWeekStart, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(lastWeekEnd, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('lastWeek');
      return;
    }
    
    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = endOfMonth(today);
    
    if (
      format(value.from, 'yyyy-MM-dd') === format(thisMonthStart, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(thisMonthEnd, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('thisMonth');
      return;
    }
    
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));
    
    if (
      format(value.from, 'yyyy-MM-dd') === format(lastMonthStart, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(lastMonthEnd, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('lastMonth');
      return;
    }
    
    const thisYearStart = startOfYear(today);
    const thisYearEnd = endOfYear(today);
    
    if (
      format(value.from, 'yyyy-MM-dd') === format(thisYearStart, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(thisYearEnd, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('thisYear');
      return;
    }
    
    const lastYearStart = startOfYear(subYears(today, 1));
    const lastYearEnd = endOfYear(subYears(today, 1));
    
    if (
      format(value.from, 'yyyy-MM-dd') === format(lastYearStart, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(lastYearEnd, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('lastYear');
      return;
    }
    
    // If no preset matches
    setSelectedPreset('custom');
  };
  
  const handlePresetChange = (preset: PresetRange) => {
    setSelectedPreset(preset);
    let newRange: DateRange;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (preset) {
      case 'today':
        newRange = { from: today, to: today };
        break;
        
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        newRange = { from: yesterday, to: yesterday };
        break;
        
      case 'thisWeek':
        newRange = {
          from: startOfWeek(today, { weekStartsOn: 1 }),
          to: endOfWeek(today, { weekStartsOn: 1 }),
        };
        break;
        
      case 'lastWeek':
        const lastWeekStart = startOfWeek(new Date(today.getTime() - 7 * 86400000), { weekStartsOn: 1 });
        newRange = {
          from: lastWeekStart,
          to: endOfWeek(lastWeekStart, { weekStartsOn: 1 }),
        };
        break;
        
      case 'thisMonth':
        newRange = {
          from: startOfMonth(today),
          to: endOfMonth(today),
        };
        break;
        
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        newRange = {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
        break;
        
      case 'thisQuarter':
        const quarter = Math.floor(today.getMonth() / 3);
        const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
        const quarterEnd = new Date(today.getFullYear(), quarter * 3 + 3, 0);
        newRange = {
          from: quarterStart,
          to: quarterEnd,
        };
        break;
        
      case 'lastQuarter':
        const prevQuarter = Math.floor(subMonths(today, 3).getMonth() / 3);
        const prevQuarterStart = new Date(today.getFullYear(), prevQuarter * 3, 1);
        const prevQuarterEnd = new Date(today.getFullYear(), prevQuarter * 3 + 3, 0);
        newRange = {
          from: prevQuarterStart,
          to: prevQuarterEnd,
        };
        break;
        
      case 'thisYear':
        newRange = {
          from: startOfYear(today),
          to: endOfYear(today),
        };
        break;
        
      case 'lastYear':
        const lastYear = subYears(today, 1);
        newRange = {
          from: startOfYear(lastYear),
          to: endOfYear(lastYear),
        };
        break;
        
      case 'all':
        // Go back 10 years as a reasonable "all time" default
        newRange = {
          from: new Date(today.getFullYear() - 10, 0, 1),
          to: today,
        };
        break;
        
      case 'custom':
      default:
        // Keep current selection for custom
        newRange = { ...value };
    }
    
    setDate(newRange);
    onChange(newRange);
  };
  
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    
    setSelectedPreset('custom');
    
    const newRange = { ...date };
    
    if (!date.from || date.to) {
      // Start a new range
      newRange.from = selectedDate;
      newRange.to = selectedDate;
    } else if (selectedDate < date.from) {
      // Selected date is before current start
      newRange.from = selectedDate;
      newRange.to = date.from;
    } else {
      // Selected date is after current start
      newRange.to = selectedDate;
    }
    
    setDate(newRange);
  };
  
  const handleCalendarClose = () => {
    if (date.from && date.to) {
      onChange(date);
    }
    setIsCalendarOpen(false);
  };

  return (
    <div className={cn("flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2", className)}>
      <Select value={selectedPreset} onValueChange={(value) => handlePresetChange(value as PresetRange)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="custom">Custom Range</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="thisWeek">This Week</SelectItem>
          <SelectItem value="lastWeek">Last Week</SelectItem>
          <SelectItem value="thisMonth">This Month</SelectItem>
          <SelectItem value="lastMonth">Last Month</SelectItem>
          <SelectItem value="thisQuarter">This Quarter</SelectItem>
          <SelectItem value="lastQuarter">Last Quarter</SelectItem>
          <SelectItem value="thisYear">This Year</SelectItem>
          <SelectItem value="lastYear">Last Year</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>
      
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal sm:w-[300px]"
            )}
          >
            <CalendarRange className="mr-2 h-4 w-4" />
            {date.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Select date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 flex justify-between border-b">
            <div className="text-sm font-medium">
              {date.from && format(date.from, "MMMM yyyy")}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-sm px-2"
                onClick={() => {
                  onChange(date);
                  setIsCalendarOpen(false);
                }}
              >
                <Check className="h-4 w-4 mr-1" />
                Apply
              </Button>
            </div>
          </div>
          <Calendar
            mode="range"
            selected={date}
            onSelect={(range) => {
              if (range?.from) {
                setDate({ from: range.from, to: range.to || range.from });
                setSelectedPreset('custom');
              }
            }}
            numberOfMonths={2}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangeSelector;
