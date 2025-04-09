import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Expense, Income, Transaction } from '@/types';
import { deleteTransaction } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, ArrowDownCircle, ArrowUpCircle, Filter, Search, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableScrollArea } from '@/components/ui/table';

interface TransactionListViewUpdatedProps {
  transactions: Transaction[];
  onTransactionDelete: () => void;
  onTransactionClick: (transaction: Transaction) => void;
  periodLabel?: string;
}

const TransactionListViewUpdated = ({ 
  transactions, 
  onTransactionDelete, 
  onTransactionClick,
  periodLabel = "Current Month" 
}: TransactionListViewUpdatedProps) => {
  // State variables
  const [activeTab, setActiveTab] = useState<'all' | 'expense' | 'income'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [merchantFilter, setMerchantFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Handle delete confirmation
  const confirmDelete = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteConfirmOpen(true);
  };

  // Handle actual delete action
  const handleDelete = async () => {
    if (!transactionToDelete) return;
    
    try {
      await deleteTransaction(transactionToDelete.id, transactionToDelete.type);
      toast({
        title: 'Transaction deleted',
        description: 'Transaction has been successfully removed.'
      });
      onTransactionDelete();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete transaction. Please try again.',
        variant: 'destructive'
      });
    }
    
    setDeleteConfirmOpen(false);
    setTransactionToDelete(null);
  };

  // Filter transactions based on active tab
  const filteredTransactions = transactions.filter(transaction => {
    if (activeTab === 'all') return true;
    return transaction.type === activeTab;
  });

  // Apply search query filter
  const searchedTransactions = filteredTransactions.filter(transaction => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      transaction.merchantName?.toLowerCase().includes(searchTerm) ||
      transaction.description?.toLowerCase().includes(searchTerm) ||
      transaction.notes?.toLowerCase().includes(searchTerm) ||
      transaction.category.toLowerCase().includes(searchTerm) ||
      transaction.amount.toString().includes(searchTerm)
    );
  });

  // Apply category and merchant filters
  const categoryFilteredTransactions = searchedTransactions.filter(transaction => {
    if (!categoryFilter) return true;
    return transaction.category === categoryFilter;
  });

  const merchantFilteredTransactions = categoryFilteredTransactions.filter(transaction => {
    if (!merchantFilter) return true;
    return transaction.merchantName?.toLowerCase().includes(merchantFilter.toLowerCase());
  });

  // Sort transactions
  const sortedTransactions = [...merchantFilteredTransactions].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === 'amount') {
      comparison = a.amount - b.amount;
    } else if (sortBy === 'name') {
      comparison = (a.merchantName || '').localeCompare(b.merchantName || '');
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions - {periodLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="mb-4" onValueChange={(value) => setActiveTab(value as 'all' | 'expense' | 'income')}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="expense">Expenses</TabsTrigger>
            <TabsTrigger value="income">Incomes</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Input
              type="search"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category Filter:</label>
              <Input
                type="text"
                placeholder="Filter by category..."
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Merchant Filter:</label>
              <Input
                type="text"
                placeholder="Filter by merchant..."
                value={merchantFilter}
                onChange={(e) => setMerchantFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sort By:</label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'name')}
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="name">Merchant</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sort Direction:</label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        )}

        {sortedTransactions.length === 0 ? (
          <div className="flex items-center justify-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span>No transactions found.</span>
          </div>
        ) : (
          <div className="w-full rounded-md border">
            <TableScrollArea>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTransactions.map(transaction => (
                    <TableRow key={transaction.id} className="cursor-pointer" onClick={() => onTransactionClick(transaction)}>
                      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {transaction.type === 'expense' ? (
                          <div className="flex items-center">
                            <ArrowDownCircle className="text-red-500 h-4 w-4 mr-2" />
                            <span>Expense</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <ArrowUpCircle className="text-green-500 h-4 w-4 mr-2" />
                            <span>Income</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{transaction.merchantName || 'N/A'}</TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell className={transaction.type === 'expense' ? 'text-red-500' : 'text-green-500'}>
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(transaction);
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableScrollArea>
          </div>
        )}

        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this transaction? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TransactionListViewUpdated;
