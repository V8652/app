import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { 
  Search,
  ArrowUpDown,
  SlidersHorizontal,
  Filter,
  FileDown,
  Trash2,
  MoreHorizontal,
  Pencil
} from 'lucide-react';
import { getExpenses, getIncomes, deleteTransaction } from '@/lib/db';
import { Expense, Income, Transaction } from '@/types';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import DateRangeSelector from './DateRangeSelector';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { exportTransactionsToCSV } from '@/lib/import-export';
import ExpenseEditForm from './ExpenseEditForm';

type CustomTransaction = (Expense | Income) & { type: 'expense' | 'income' };

interface TransactionListViewProps {
  onTransactionDelete?: () => void;
}

const TransactionListView = ({ onTransactionDelete }: TransactionListViewProps) => {
  const [transactions, setTransactions] = useState<CustomTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'merchantName'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [selectedTransaction, setSelectedTransaction] = useState<CustomTransaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Expense | null>(null);

  useEffect(() => {
    loadTransactions();
  }, [dateRange]);

  const loadTransactions = async () => {
    setIsLoading(true);
    
    try {
      const [expenses, incomes] = await Promise.all([
        getExpenses(),
        getIncomes(),
      ]);
      
      const allTransactions: CustomTransaction[] = [
        ...expenses.map(expense => ({
          ...expense,
          type: 'expense' as const,
        })),
        ...incomes.map(income => ({
          ...income,
          type: 'income' as const,
        })),
      ];
      
      const startTimestamp = dateRange.from.getTime();
      const endTimestamp = dateRange.to.getTime();
      
      const filtered = allTransactions.filter(transaction => {
        const transactionDate = typeof transaction.date === 'string'
          ? new Date(transaction.date).getTime()
          : transaction.date;
        return transactionDate >= startTimestamp && transactionDate <= endTimestamp;
      });
      
      setTransactions(filtered);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: 'date' | 'amount' | 'merchantName') => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'date' ? 'desc' : 'asc');
    }
  };

  const handleDelete = (transaction: CustomTransaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };

  const handleEdit = (transaction: CustomTransaction) => {
    if (transaction.type === 'expense') {
      setTransactionToEdit(transaction as Expense);
      setIsEditDialogOpen(true);
    } else {
      toast({
        title: 'Income Editing',
        description: 'Income editing is currently not supported',
      });
    }
  };

  const handleEditComplete = () => {
    loadTransactions();
    if (onTransactionDelete) {
      onTransactionDelete();
    }
  };

  const confirmDelete = async () => {
    if (!selectedTransaction) return;
    
    try {
      await deleteTransaction(selectedTransaction.id);
      
      setTransactions(transactions.filter(t => t.id !== selectedTransaction.id));
      
      toast({
        title: 'Success',
        description: 'Transaction deleted successfully',
      });
      
      if (onTransactionDelete) {
        onTransactionDelete();
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete transaction',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedTransaction(null);
    }
  };

  const exportCurrentView = async () => {
    try {
      const expenses: Expense[] = [];
      const incomes: Income[] = [];
      
      filteredAndSortedTransactions.forEach(transaction => {
        if (transaction.type === 'expense') {
          const { type, ...expense } = transaction;
          expenses.push(expense as Expense);
        } else {
          const { type, ...income } = transaction;
          incomes.push(income as Income);
        }
      });
      
      const fromStr = format(dateRange.from, 'yyyy-MM-dd');
      const toStr = format(dateRange.to, 'yyyy-MM-dd');
      
      await exportTransactionsToCSV(`transactions_${fromStr}_to_${toStr}`);
      
      toast({
        title: 'Export Complete',
        description: 'Transactions exported successfully',
      });
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export transactions',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const filteredTransactions = transactions.filter(transaction => {
    const searchLower = searchTerm.toLowerCase();
    return (
      transaction.merchantName?.toLowerCase().includes(searchLower) ||
      transaction.category?.toLowerCase().includes(searchLower) ||
      transaction.notes?.toLowerCase().includes(searchLower) ||
      transaction.paymentMethod?.toLowerCase().includes(searchLower) ||
      transaction.amount.toString().includes(searchTerm)
    );
  });

  const filteredAndSortedTransactions = [...filteredTransactions].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'date') {
      const dateA = typeof a.date === 'string' ? new Date(a.date).getTime() : a.date;
      const dateB = typeof b.date === 'string' ? new Date(b.date).getTime() : b.date;
      comparison = dateA - dateB;
    } else if (sortField === 'amount') {
      comparison = a.amount - b.amount;
    } else if (sortField === 'merchantName') {
      comparison = (a.merchantName || '').localeCompare(b.merchantName || '');
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const expenseTotal = filteredAndSortedTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const incomeTotal = filteredAndSortedTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = incomeTotal - expenseTotal;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction List</CardTitle>
        <CardDescription>
          View and manage all your transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-center justify-between">
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
            className="max-w-xl"
          />
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={exportCurrentView}
            >
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {showFilters && (
          <div className="pt-2 pb-4 space-y-4 md:flex md:space-y-0 md:space-x-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className="bg-card">
            Transactions: {filteredAndSortedTransactions.length}
          </Badge>
          <Badge variant="outline" className="bg-card">
            Expenses: {formatCurrency(expenseTotal)}
          </Badge>
          <Badge variant="outline" className="bg-card">
            Income: {formatCurrency(incomeTotal)}
          </Badge>
          <Badge 
            variant={balance >= 0 ? "outline" : "destructive"}
            className={balance >= 0 ? "bg-card" : ""}
          >
            Balance: {formatCurrency(balance)}
          </Badge>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">Loading transactions...</div>
        ) : filteredAndSortedTransactions.length === 0 ? (
          <div className="text-center py-8 border rounded-md">
            <p className="text-muted-foreground">No transactions found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm ? 'Try adjusting your search' : 'Try selecting a different date range'}
            </p>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="w-[100px] cursor-pointer"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center">
                        Date
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('merchantName')}
                    >
                      <div className="flex items-center">
                        Merchant
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center justify-end">
                        Amount
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTransactions.map((transaction) => (
                    <TableRow key={`${transaction.type}-${transaction.id}`}>
                      <TableCell className="font-medium">
                        {format(new Date(transaction.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {transaction.notes && (
                            <span className="text-base mb-1">{transaction.notes}</span>
                          )}
                          <span className="text-sm text-muted-foreground">{transaction.merchantName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={transaction.type === 'income' ? 'bg-green-500/10' : ''}
                        >
                          {transaction.category || 'Uncategorized'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.paymentMethod || '-'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : ''
                      }`}>
                        {transaction.type === 'income' ? '+' : ''}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(transaction)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(transaction)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this transaction? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {transactionToEdit && (
          <ExpenseEditForm
            expense={transactionToEdit}
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            onSave={handleEditComplete}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionListView;
