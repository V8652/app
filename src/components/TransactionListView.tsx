
import React, { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, CardContent, CardDescription, 
  CardHeader, CardTitle 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Expense, Income } from '@/types';
import { getExpenses, getIncomes, deleteTransaction } from '@/lib/db';
import { 
  MoreHorizontal, Trash2, Search, 
  Filter, ArrowUpDown, Edit 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export interface TransactionListViewProps {
  onTransactionDelete: () => void;
  onTransactionClick: (expense: Expense | Income) => void;
}

const TransactionListView: React.FC<TransactionListViewProps> = ({ 
  onTransactionDelete,
  onTransactionClick 
}) => {
  const [transactions, setTransactions] = useState<(Expense | Income)[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'merchantName'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const [expenses, incomes] = await Promise.all([getExpenses(), getIncomes()]);
      const allTransactions = [...expenses, ...incomes];
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (transaction: Expense | Income) => {
    try {
      await deleteTransaction(transaction.id, transaction.type);
      setTransactions(transactions.filter(t => t.id !== transaction.id));
      toast({
        title: 'Success',
        description: `${transaction.type === 'expense' ? 'Expense' : 'Income'} deleted successfully`,
      });
      onTransactionDelete();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete transaction',
        variant: 'destructive',
      });
    }
  };

  const filteredTransactions = transactions
    .filter(transaction => {
      // Filter by type
      if (filterType !== 'all' && transaction.type !== filterType) {
        return false;
      }
      
      // Filter by category
      if (filterCategory !== 'all' && transaction.category !== filterCategory) {
        return false;
      }
      
      // Search by merchant name or notes
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        return (
          (transaction.merchantName?.toLowerCase().includes(searchTermLower) ?? false) ||
          (transaction.notes?.toLowerCase().includes(searchTermLower) ?? false)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by selected field
      if (sortField === 'date') {
        return sortDirection === 'desc' 
          ? new Date(b.date).getTime() - new Date(a.date).getTime() 
          : new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'amount') {
        return sortDirection === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      } else if (sortField === 'merchantName') {
        const aName = a.merchantName || '';
        const bName = b.merchantName || '';
        return sortDirection === 'desc' ? bName.localeCompare(aName) : aName.localeCompare(bName);
      }
      return 0;
    });

  // Get unique categories from transactions
  const uniqueCategories = Array.from(
    new Set(transactions.map(t => t.category))
  ).sort();

  const getTypeColor = (type: 'expense' | 'income') => {
    return type === 'expense' ? 'text-red-500' : 'text-green-500';
  };

  const handleSort = (field: 'date' | 'amount' | 'merchantName') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">All Transactions</CardTitle>
        <CardDescription>View, filter, and manage all your transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search merchant or notes..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={filterType}
              onValueChange={(value) => setFilterType(value as any)}
            >
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filterCategory}
              onValueChange={(value) => setFilterCategory(value)}
            >
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            {searchTerm || filterType !== 'all' || filterCategory !== 'all' 
              ? 'No transactions match your filters'
              : 'No transactions found'}
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                    <div className="flex items-center">
                      Date
                      {sortField === 'date' && (
                        <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('merchantName')}>
                    <div className="flex items-center">
                      Merchant
                      {sortField === 'merchantName' && (
                        <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('amount')}>
                    <div className="flex items-center">
                      Amount
                      {sortField === 'amount' && (
                        <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div>{format(parseISO(transaction.date), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(transaction.date), 'h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{transaction.merchantName}</div>
                      {transaction.notes && (
                        <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {transaction.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className={getTypeColor(transaction.type)}>
                      {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount, transaction.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onTransactionClick(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(transaction)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionListView;
