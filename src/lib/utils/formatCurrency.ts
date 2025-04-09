
/**
 * Format a number as a currency with the specified currency code
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
}

/**
 * Get category color from the category colors map
 * If not found, return a default color
 */
export function getCategoryColor(category: string | undefined, categoryColors: Record<string, string> = {}): string {
  if (!category) return '#8E9196'; // Default gray
  return categoryColors[category] || '#8E9196';
}
