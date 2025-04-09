
import { DateRange } from '@/types';

export interface DateRangeOption {
  label: string;
  value: string;
  range: DateRange;
}

export interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (dateRange: DateRange) => void;
  className?: string;
}
