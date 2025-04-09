
import { useState, useMemo } from 'react';
import { Expense, Income, ExpenseCategory, IncomeCategory } from '@/types';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDownUp, Calendar, CreditCard, Search, 
  DollarSign, Store, Tag, Filter
} from 'lucide-react';
import { motion } from 'framer-motion';

interface TransactionViewsProps {
  expenses: Expense[];
  incomes: Income[];
}

const TransactionViews = ({ expenses, incomes }: TransactionViewsProps) => {
  const [viewType, setViewType] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'merchantName'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'expenses' | 'incomes'>('expenses');

  // Get unique payment methods
  const paymentMethods = useMemo(() => {
    const methodsSet = new Set<string>();
    [...expenses, ...incomes].forEach(transaction => {
      if (transaction.paymentMethod) {
        methodsSet.add(transaction.paymentMethod);
      }
    });
    return Array.from(methodsSet);
  }, [expenses, incomes]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    const transactions = activeTab === 'expenses' ? expenses : incomes;
    
    return transactions
      .filter(transaction => {
        // Search term filter
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === '' || 
          transaction.merchantName.toLowerCase().includes(searchLower) ||
          (transaction.notes && transaction.notes.toLowerCase().includes(searchLower)) ||
          transaction.category.toLowerCase().includes(searchLower);
          
        // Category filter
        const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
        
        // Payment method filter
        const matchesPaymentMethod = paymentMethodFilter === 'all' || 
          transaction.paymentMethod === paymentMethodFilter;
          
        return matchesSearch && matchesCategory && matchesPaymentMethod;
      })
      .sort((a, b) => {
        if (sortField === 'date') {
          return sortDirection === 'asc' 
            ? new Date(a.date).getTime() - new Date(b.date).getTime()
            : new Date(b.date).getTime() - new Date(a.date).getTime();
        } else if (sortField === 'amount') {
          return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
        } else {
          return sortDirection === 'asc' 
            ? a.merchantName.localeCompare(b.merchantName)
            : b.merchantName.localeCompare(a.merchantName);
        }
      });
  }, [
    activeTab, expenses, incomes, searchTerm, categoryFilter, 
    paymentMethodFilter, sortField, sortDirection
  ]);

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    const categoryColors: Record<string, string> = {
      // Expense categories
      groceries: 'bg-green-100 text-green-800',
      utilities: 'bg-blue-100 text-blue-800',
      entertainment: 'bg-purple-100 text-purple-800',
      transportation: 'bg-yellow-100 text-yellow-800',
      dining: 'bg-red-100 text-red-800',
      shopping: 'bg-indigo-100 text-indigo-800',
      health: 'bg-pink-100 text-pink-800',
      travel: 'bg-cyan-100 text-cyan-800',
      housing: 'bg-emerald-100 text-emerald-800',
      education: 'bg-orange-100 text-orange-800',
      subscriptions: 'bg-violet-100 text-violet-800',
      // Income categories
      salary: 'bg-green-100 text-green-800',
      freelance: 'bg-blue-100 text-blue-800',
      investment: 'bg-purple-100 text-purple-800',
      gift: 'bg-pink-100 text-pink-800',
      refund: 'bg-amber-100 text-amber-800',
      other: 'bg-gray-100 text-gray-800'
    };
    
    return categoryColors[category] || 'bg-gray-100 text-gray-800';
  };

  // Toggle sort direction or change sort field
  const handleSort = (field: 'date' | 'amount' | 'merchantName') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to descending when changing fields
    }
  };

  // Render category options based on active tab
  const renderCategoryOptions = () => {
    const categories = activeTab === 'expenses' 
      ? Object.keys(expenses.reduce((acc, expense) => {
          acc[expense.category] = true;
          return acc;
        }, {} as Record<string, boolean>))
      : Object.keys(incomes.reduce((acc, income) => {
          acc[income.category] = true;
          return acc;
        }, {} as Record<string, boolean>));

    return (
      <>
        <SelectItem value="all">All Categories</SelectItem>
        {categories.map(category => (
          <SelectItem key={category} value={category}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </SelectItem>
        ))}
      </>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>Transactions</CardTitle>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={viewType === 'table' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setViewType('table')}
            >
              Table View
            </Button>
            <Button 
              variant={viewType === 'cards' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setViewType('cards')}
            >
              Card View
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'expenses' | 'incomes')}>
          <TabsList className="mb-4">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="incomes">Income</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="w-full sm:w-auto">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Tag className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {renderCategoryOptions()}
                  </SelectContent>
                </Select>
              </div>
              
              {paymentMethods.length > 0 && (
                <div className="w-full sm:w-auto">
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <CreditCard className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      {paymentMethods.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          
          <TabsContent value="expenses" className="m-0">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No expenses found matching your criteria
              </div>
            ) : viewType === 'table' ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          Date
                          {sortField === 'date' && (
                            <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('merchantName')}>
                        <div className="flex items-center">
                          <Store className="mr-2 h-4 w-4" />
                          Merchant
                          {sortField === 'merchantName' && (
                            <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('amount')}>
                        <div className="flex items-center">
                          <DollarSign className="mr-2 h-4 w-4" />
                          Amount
                          {sortField === 'amount' && (
                            <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Payment Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{format(new Date(transaction.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium">{transaction.merchantName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getCategoryColor(transaction.category)}>
                            {transaction.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-red-600">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </TableCell>
                        <TableCell>{transaction.paymentMethod || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTransactions.map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 * (index % 6) }}
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-col space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="font-medium">{transaction.merchantName}</div>
                            <Badge variant="outline" className={getCategoryColor(transaction.category)}>
                              {transaction.category}
                            </Badge>
                          </div>
                          
                          <div className="text-xl font-bold text-red-600">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </div>
                          
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Calendar className="mr-1 h-3 w-3" />
                              {format(new Date(transaction.date), 'MMM d, yyyy')}
                            </div>
                            {transaction.paymentMethod && (
                              <div className="flex items-center">
                                <CreditCard className="mr-1 h-3 w-3" />
                                {transaction.paymentMethod}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="incomes" className="m-0">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No income found matching your criteria
              </div>
            ) : viewType === 'table' ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          Date
                          {sortField === 'date' && (
                            <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('merchantName')}>
                        <div className="flex items-center">
                          <Store className="mr-2 h-4 w-4" />
                          Source
                          {sortField === 'merchantName' && (
                            <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('amount')}>
                        <div className="flex items-center">
                          <DollarSign className="mr-2 h-4 w-4" />
                          Amount
                          {sortField === 'amount' && (
                            <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{format(new Date(transaction.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium">{transaction.merchantName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getCategoryColor(transaction.category)}>
                            {transaction.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTransactions.map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 * (index % 6) }}
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-col space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="font-medium">{transaction.merchantName}</div>
                            <Badge variant="outline" className={getCategoryColor(transaction.category)}>
                              {transaction.category}
                            </Badge>
                          </div>
                          
                          <div className="text-xl font-bold text-green-600">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </div>
                          
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Calendar className="mr-1 h-3 w-3" />
                              {format(new Date(transaction.date), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TransactionViews;
