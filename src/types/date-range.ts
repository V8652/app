
export interface DateRange {
  from: Date;
  to: Date;
}

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

// Adding some useful preset functions for date ranges
export const getDefaultDateRange = (): DateRange => {
  return {
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  };
};

export const getLastMonthDateRange = (): DateRange => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
  
  return {
    from: firstDay,
    to: lastDay
  };
};

export const getThisMonthDateRange = (): DateRange => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  return {
    from: firstDay,
    to: lastDay
  };
};
