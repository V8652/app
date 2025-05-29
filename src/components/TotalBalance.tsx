import { useEffect, useState, useCallback, useRef } from 'react';
import { getFinancialSummary } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { dbEvents, DatabaseEvent, useMultipleDbEvents } from '@/lib/db-event';
import { ArrowUp, ArrowDown } from 'lucide-react';

const TotalBalance = () => {
  const [balance, setBalance] = useState<number>(0);
  const [previousBalance, setPreviousBalance] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const latestBalance = useRef<number>(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateBalance = useCallback(async () => {
    try {
      setIsUpdating(true);
      const summary = await getFinancialSummary();
      
      // Store current balance as previous before updating
      setPreviousBalance(latestBalance.current);
      
      // Update the latest balance reference and state
      latestBalance.current = summary.balance;
      setBalance(summary.balance);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error updating balance:', error);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const handleDatabaseChange = useCallback(() => {
    console.log('TotalBalance: Detected database change, updating balance...');
    
    // Clear any existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Set a small delay to batch multiple rapid changes
    updateTimeoutRef.current = setTimeout(() => {
      updateBalance();
      updateTimeoutRef.current = null;
    }, 50); // Reduced from 100ms to 50ms for faster updates
  }, [updateBalance]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Initial load
  useEffect(() => {
    updateBalance();
  }, [updateBalance]);

  useMultipleDbEvents([
    [DatabaseEvent.TRANSACTION_ADDED, handleDatabaseChange],
    [DatabaseEvent.TRANSACTION_UPDATED, handleDatabaseChange],
    [DatabaseEvent.TRANSACTION_DELETED, handleDatabaseChange],
    [DatabaseEvent.BALANCE_UPDATED, handleDatabaseChange],
    [DatabaseEvent.DATA_IMPORTED, handleDatabaseChange],
    [DatabaseEvent.UI_REFRESH_NEEDED, handleDatabaseChange],
    [DatabaseEvent.TRANSACTION_LIST_REFRESH, handleDatabaseChange]
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  const isBalanceIncreased = balance > previousBalance;
  const isBalanceChanged = balance !== previousBalance && previousBalance !== 0;
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`balance-${balance}-${refreshKey}`}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0.6 }}
        transition={{ duration: 0.3 }}
        className="force-refresh-animation"
      >
        <div className="bg-gradient-to-br from-card to-card/90 rounded-xl p-6 shadow-premium border-0">
          <div className="flex flex-col">
            <div className="text-sm font-medium text-muted-foreground mb-2">Total Balance</div>
            <div className="flex items-center">
              <motion.div 
                className={`text-3xl font-bold ${isBalanceChanged ? (isBalanceIncreased ? 'text-green-500' : 'text-red-500') : ''}`}
                key={balance}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {formatCurrency(balance)}
              </motion.div>

              {isUpdating && (
                <motion.div 
                  className="ml-2 h-2 w-2 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
              
              {isBalanceChanged && (
                <motion.div 
                  className={`ml-3 flex items-center text-sm font-medium ${isBalanceIncreased ? 'text-green-500' : 'text-red-500'}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {isBalanceIncreased ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                  {formatCurrency(Math.abs(balance - previousBalance))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TotalBalance;
