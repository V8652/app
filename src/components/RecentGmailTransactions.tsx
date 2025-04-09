
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Expense } from '@/types';
import { format } from 'date-fns';
import { Info, Calendar, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface RecentGmailTransactionsProps {
  expenses: Expense[];
  onTransactionClick: (expense: Expense) => void;
}

const RecentGmailTransactions = ({ expenses, onTransactionClick }: RecentGmailTransactionsProps) => {
  const [recentTransactions, setRecentTransactions] = useState<Expense[]>([]);
  const [emptyNotesTransactions, setEmptyNotesTransactions] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<'recent' | 'empty'>('recent');

  useEffect(() => {
    // Filter transactions from the last hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    // Recent transactions (within last hour)
    const recent = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate > oneHourAgo;
    });
    
    // Transactions with empty notes
    const emptyNotes = expenses.filter(expense => {
      return !expense.notes || expense.notes.trim() === '';
    });
    
    setRecentTransactions(recent);
    setEmptyNotesTransactions(emptyNotes);
  }, [expenses]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Gmail Import Results</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'recent' | 'empty')}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="recent" className="flex-1">
              Recent Transactions
              {recentTransactions.length > 0 && (
                <Badge className="ml-2 bg-green-500" variant="secondary">
                  {recentTransactions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="empty" className="flex-1">
              Empty Notes
              {emptyNotesTransactions.length > 0 && (
                <Badge className="ml-2 bg-amber-500" variant="secondary">
                  {emptyNotesTransactions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent">
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map(expense => (
                  <div 
                    key={expense.id} 
                    className="p-3 rounded-md bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => onTransactionClick(expense)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h4 className="font-medium">{expense.merchantName}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{expense.category}</p>
                      </div>
                      <p className="font-semibold text-red-500">
                        ₹{expense.amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mt-2">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{format(new Date(expense.date), 'dd MMM yyyy, h:mm a')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <Info className="h-10 w-10 text-muted-foreground mb-2" />
                <h4 className="font-medium">No Recent Transactions</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  No transactions have been found in the last hour.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="empty">
            {emptyNotesTransactions.length > 0 ? (
              <div className="space-y-3">
                {emptyNotesTransactions.map(expense => (
                  <div 
                    key={expense.id} 
                    className="p-3 rounded-md bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => onTransactionClick(expense)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h4 className="font-medium">{expense.merchantName}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{expense.category}</p>
                      </div>
                      <p className="font-semibold text-red-500">
                        ₹{expense.amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="flex items-center text-xs text-amber-500 mt-2">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      <span>Missing notes - click to edit</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <Info className="h-10 w-10 text-muted-foreground mb-2" />
                <h4 className="font-medium">No Transactions Missing Notes</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  All your transactions have notes.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RecentGmailTransactions;
