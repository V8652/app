import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SmsService } from '@/lib/sms-service';
import { Transaction } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Loader2, Calendar, Smartphone, AlertCircle, Clock } from 'lucide-react';
import { DateRange } from '@/types/date-range';
import DateRangeSelector from '@/components/DateRangeSelector';
import { getSmsParserRules } from '@/lib/sms-parser-rules';
import { SmsParserRule } from '@/types/sms-parser';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, subHours, isWithinInterval } from 'date-fns';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';

interface SmsScanViewProps {
  onScanComplete: (newTransactions: Transaction[]) => void;
  onScanError: (errorMessage: string) => void;
}

const SmsScanView: React.FC<SmsScanViewProps> = ({
  onScanComplete,
  onScanError
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanResults, setScanResults] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<SmsParserRule[]>([]);
  const [rulesLoaded, setRulesLoaded] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const navigate = useNavigate();
  
  // Memoize loadRules to prevent unnecessary re-renders
  const loadRules = useCallback(async () => {
    try {
      setRulesLoaded(false);
      const loadedRules = await getSmsParserRules();
      setRules(loadedRules);
      setRulesLoaded(true);
    } catch (error) {
      console.error('Error loading SMS parser rules:', error);
      onScanError('Failed to load SMS parser rules');
      setRulesLoaded(true);
    }
  }, [onScanError]);

  // Subscribe to database events for real-time updates
  useEffect(() => {
    loadRules();

    // Subscribe to relevant database events
    const unsubscribeRules = dbEvents.subscribe(DatabaseEvent.SMS_RULES_REFRESH, loadRules);
    const unsubscribeTransactions = dbEvents.subscribe(DatabaseEvent.TRANSACTION_ADDED, () => {
      // Refresh scan results when new transactions are added
      if (hasScanned) {
        handleScanSms();
      }
    });

    return () => {
      unsubscribeRules();
      unsubscribeTransactions();
    };
  }, [loadRules, hasScanned]);

  const handleScanSms = async () => {
    try {
      setIsScanning(true);
      setHasScanned(false);
      setScanResults([]);

      // Check if we have any enabled rules
      const enabledRules = rules.filter(rule => rule.enabled);
      if (enabledRules.length === 0) {
        toast({
          title: "No Enabled Rules",
          description: "Please enable at least one SMS parser rule",
          variant: "destructive"
        });
        setIsScanning(false);
        return;
      }

      // Scan SMS messages with date range
      const transactions = await SmsService.scanSms(dateRange.from, dateRange.to);
      
      // Filter transactions from the last 24 hours
      const last24Hours = subHours(new Date(), 24);
      const recentTransactions = transactions.filter(transaction => 
        isWithinInterval(new Date(transaction.date), {
          start: last24Hours,
          end: new Date()
        })
      );
      
      // Update state in a single batch to prevent multiple re-renders
      setScanResults(recentTransactions);
      setHasScanned(true);
      
      if (recentTransactions.length > 0) {
        onScanComplete(recentTransactions);
        // Emit event to notify other components
        dbEvents.emit(DatabaseEvent.TRANSACTION_LIST_REFRESH);
      }
    } catch (error) {
      console.error('Error scanning SMS:', error);
      onScanError('Failed to scan SMS messages');
    } finally {
      setIsScanning(false);
    }
  };
  
  const handleViewRules = () => {
    navigate('/settings?tab=smsparser');
  };
  
  const formatDateForDisplay = (date: Date) => {
    return format(date, 'dd/MM/yyyy');
  };

  // Memoize the date range change handler
  const handleDateRangeChange = useCallback((newRange: DateRange) => {
    setDateRange(newRange);
    // Reset scan results when date range changes
    if (hasScanned) {
      setHasScanned(false);
      setScanResults([]);
    }
  }, [hasScanned]);
  
  return (
    <Card className="w-full">
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          SMS Transaction Scanner
        </CardTitle>
        <CardDescription>
          Scan your SMS messages to automatically extract transactions
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3 p-4 pt-0">
        {!rulesLoaded ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rules.length === 0 ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No SMS parser rules found. Please create at least one rule to scan SMS messages.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="rounded-lg border p-3">
              <div className="mb-3">
                <h4 className="text-sm font-medium mb-1">Select Date Range</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Choose the timeframe for scanning SMS messages
                </p>
                
                <DateRangeSelector 
                  value={dateRange} 
                  onChange={handleDateRangeChange} 
                  className="w-full" 
                />
              </div>
              
              {/* Current date range display */}
              <div className="mt-3 rounded-md bg-muted p-2.5">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-500/10 p-1.5">
                    <Calendar className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">Selected Range</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDateForDisplay(dateRange.from)} to {formatDateForDisplay(dateRange.to)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      SMS messages within this date range will be scanned for transactions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {hasScanned && (
              <div className={`rounded-md p-3 ${scanResults.length > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-500/10 p-1.5">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium ${scanResults.length > 0 ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
                      Recent Scan Results
                    </h4>
                    <p className={`text-xs ${scanResults.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {scanResults.length > 0 
                        ? `Found ${scanResults.length} transactions in the last 24 hours.` 
                        : 'No recent expenses found in the last 24 hours.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between p-4 pt-0">
        <Button variant="outline" onClick={handleViewRules} disabled={isScanning} size="sm">
          View Parser Rules
        </Button>
        <Button 
          onClick={handleScanSms} 
          disabled={isScanning || rules.length === 0} 
          className="bg-blue-500 hover:bg-blue-600" 
          size="sm"
        >
          {isScanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : 'Scan SMS Messages'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SmsScanView;
