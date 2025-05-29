
import { useState } from 'react';
import { SmsService } from '@/lib/sms-service';
import { Transaction } from '@/types';
import { isNativeApp } from './use-mobile';
import { DateRange } from '@/types/date-range';

export function useSmsScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isNative = isNativeApp();

  const scanSms = async (dateRange?: DateRange) => {
    try {
      setIsScanning(true);
      setError(null);
      
      // Pass date range to the SMS scanner
      const transactions = await SmsService.scanSms(
        dateRange?.from, 
        dateRange?.to
      );
      
      setScanResults(transactions);
      return transactions;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setError(errorMessage);
      console.error('SMS scan error:', errorMessage);
      return [];
    } finally {
      setIsScanning(false);
    }
  };

  return {
    isScanning,
    scanResults,
    error,
    scanSms,
    isAvailable: isNative
  };
}
