
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mail, Shield, Check, Loader2, Info, AlertCircle, Calendar, RefreshCw } from 'lucide-react';
import { 
  initializeGmailAPI, 
  requestAuthorization, 
  isAuthorized,
  checkForAuthRedirect
} from '@/lib/gmail-auth';
import { listExpenseEmails } from '@/lib/expense-parser';
import { applyParserRules } from '@/lib/apply-parser-rules';
import { addExpense } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { Expense, DateRange } from '@/types';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { getParserRules } from '@/lib/parser-rules';
import { format, subMonths } from 'date-fns';
import DateRangeSelector from '@/components/DateRangeSelector';
import { useIsMobile } from '@/hooks/use-mobile';

interface GmailAuthViewProps {
  onScanComplete: (expenses: Expense[]) => void;
  onScanError?: (errorMessage: string) => void;
}

const GmailAuthView = ({ onScanComplete, onScanError }: GmailAuthViewProps) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasRules, setHasRules] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 1), // 1 month ago
    to: new Date()
  });
  const isMobile = useIsMobile();
  
  // Listen for the custom oauth-redirect event
  useEffect(() => {
    const handleOAuthRedirect = (event: CustomEvent) => {
      console.log('OAuth redirect event received in GmailAuthView', event);
      
      // Clear connection flags
      setIsConnecting(false);
      
      // Update authenticated state after a short delay
      setTimeout(() => {
        setIsAuthenticated(true);
        
        // Get user profile after authentication
        if (window.gapi?.client?.gmail) {
          window.gapi.client.gmail.users.getProfile({
            userId: 'me'
          }).then(response => {
            setLoggedInUser(response.result.emailAddress);
          }).catch(error => {
            console.error('Error getting user profile:', error);
          });
        } else {
          console.log('Gmail API not loaded yet, will load it now');
          // Try to load the Gmail API
          window.gapi.client.load('gmail', 'v1').then(() => {
            window.gapi.client.gmail.users.getProfile({
              userId: 'me'
            }).then(response => {
              setLoggedInUser(response.result.emailAddress);
            }).catch(profileError => {
              console.error('Error getting user profile after loading Gmail API:', profileError);
            });
          }).catch(loadError => {
            console.error('Error loading Gmail API after redirect:', loadError);
          });
        }
      }, 500);
    };
    
    // Add the event listener
    window.addEventListener('oauth-redirect', handleOAuthRedirect as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('oauth-redirect', handleOAuthRedirect as EventListener);
    };
  }, []);
  
  // Check for auth redirect on component mount
  useEffect(() => {
    const checkRedirect = async () => {
      console.log('Checking for auth redirect in component mount effect');
      const wasRedirected = checkForAuthRedirect();
      
      if (wasRedirected) {
        console.log('User was redirected back from Google auth');
        // Clear connection flags
        setIsConnecting(false);
        
        // Update authenticated state
        setTimeout(() => {
          setIsAuthenticated(true);
        }, 500);
      }
    };
    
    checkRedirect();
  }, []);
  
  // Initialize Gmail API
  const initGmail = useCallback(async () => {
    if (authInitialized) return;
    
    try {
      setIsInitializing(true);
      console.log('Initializing Gmail API...');
      
      // Check for parser rules
      const rules = await getParserRules();
      setHasRules(rules.filter(r => r.enabled).length > 0);
      
      // Check if already authorized
      const authorized = await isAuthorized();
      console.log('Authorization status:', authorized);
      
      if (authorized) {
        setIsAuthenticated(true);
        
        // Initialize Gmail API with user info retrieval
        await initializeGmailAPI(async () => {
          console.log('Gmail API initialized successfully');
          
          try {
            if (!window.gapi?.client?.gmail) {
              console.log('Loading Gmail API during initialization');
              await window.gapi.client.load('gmail', 'v1');
            }
            
            // Verify token validity by making a simple API call
            try {
              const response = await window.gapi.client.gmail.users.getProfile({
                userId: 'me'
              });
              setLoggedInUser(response.result.emailAddress);
              console.log('Successfully verified token with Gmail API call');
            } catch (apiError: any) {
              console.error('Error verifying token:', apiError);
              
              // Check if this is an auth error
              if (apiError?.result?.error?.code === 401 || apiError?.status === 401) {
                console.error('Authentication error during initialization, clearing auth state');
                setIsAuthenticated(false);
                
                // Show toast notification
                toast({
                  title: 'Authentication Error',
                  description: 'Your session has expired. Please reconnect your Gmail account.',
                  variant: 'destructive',
                });
              }
            }
          } catch (error) {
            console.error('Error getting user profile after init:', error);
          }
        });
      } else {
        // Pre-initialize for auth
        initializeGmailAPI(() => {
          console.log('Gmail API pre-initialized for auth');
        });
      }
      
      setAuthInitialized(true);
    } catch (error) {
      console.error('Error initializing:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [authInitialized]);

  // Run initialization on mount
  useEffect(() => {
    initGmail();
  }, [initGmail]);

  // Handle authentication
  const handleAuth = async () => {
    try {
      setIsConnecting(true);
      setConnectionAttempts(prev => prev + 1);
      
      const connectMessage = isMobile ? 
        'Redirecting to Google login. You will return to the app after authentication.' : 
        'Please wait while we connect to your Gmail account...';
        
      toast({
        title: 'Connecting to Gmail',
        description: connectMessage,
      });
      
      requestAuthorization(async (credentials) => {
        console.log('Auth callback received with credentials');
        setIsAuthenticated(true);
        setIsConnecting(false);
        
        try {
          if (!window.gapi?.client?.gmail) {
            console.log('Loading Gmail API after auth callback');
            await window.gapi.client.load('gmail', 'v1');
          }
          
          // Verify token validity by making a simple API call
          try {
            const response = await window.gapi.client.gmail.users.getProfile({
              userId: 'me'
            });
            setLoggedInUser(response.result.emailAddress);
            console.log('Successfully verified token with Gmail API call after auth');
          } catch (apiError: any) {
            console.error('Error verifying token after auth:', apiError);
            
            // Show detailed error message
            if (apiError?.result?.error?.message) {
              console.error('API error message:', apiError.result.error.message);
            }
            
            // If this is an auth error, reset state
            if (apiError?.result?.error?.code === 401 || apiError?.status === 401) {
              setIsAuthenticated(false);
              toast({
                title: 'Authentication Error',
                description: 'Failed to authenticate with Gmail. Please try again.',
                variant: 'destructive',
              });
              return;
            }
          }
          
          toast({
            title: 'Successfully connected to Gmail',
            description: 'Your Gmail account is now connected to ExpenseTrack',
          });
        } catch (error) {
          console.error('Error getting user profile:', error);
          toast({
            title: 'Connection Issue',
            description: 'Connected to Gmail, but could not retrieve profile information.',
          });
        }
      });
    } catch (error) {
      console.error('Authentication error:', error);
      setIsConnecting(false);
      
      toast({
        title: 'Authentication Failed',
        description: 'Could not connect to Gmail. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Retry authentication
  const retryConnection = () => {
    setConnectionAttempts(0);
    handleAuth();
  };

  // Process a single email
  const processEmail = async (emailId: string) => {
    try {
      const response = await window.gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full',
      });
      
      const message = response.result;
      const headers = message.payload.headers;
      
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const date = new Date(parseInt(message.internalDate));
      
      let body = '';
      console.log(`Processing email: "${subject}" from ${from}`);
      console.log('Email structure:', message.payload.mimeType);
      
      const extractBody = (part: any) => {
        if (part.body && part.body.data) {
          return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
        return '';
      };
      
      if (message.payload.parts) {
        console.log(`Email has ${message.payload.parts.length} parts`);
        for (const part of message.payload.parts) {
          console.log(`Processing part with mimeType: ${part.mimeType}`);
          if (part.mimeType === 'text/plain' && part.body.data) {
            const partBody = extractBody(part);
            body += partBody;
            console.log(`Added text/plain body part, length: ${partBody.length} chars`);
          } else if (part.mimeType === 'text/html' && body === '' && part.body.data) {
            const htmlBody = extractBody(part);
            body += htmlBody;
            console.log(`Added text/html body part, length: ${htmlBody.length} chars`);
          } else if (part.parts) {
            console.log(`Part contains nested parts, exploring...`);
            for (const nestedPart of part.parts) {
              console.log(`Processing nested part with mimeType: ${nestedPart.mimeType}`);
              if (nestedPart.mimeType === 'text/plain' && nestedPart.body.data) {
                const nestedBody = extractBody(nestedPart);
                body += nestedBody;
                console.log(`Added nested text/plain body part, length: ${nestedBody.length} chars`);
              } else if (nestedPart.mimeType === 'text/html' && body === '' && nestedPart.body.data) {
                const nestedHtmlBody = extractBody(nestedPart);
                body += nestedHtmlBody;
                console.log(`Added nested text/html body part, length: ${nestedHtmlBody.length} chars`);
              }
            }
          }
        }
      } else if (message.payload.body && message.payload.body.data) {
        body = extractBody(message.payload);
        console.log(`Added simple body, length: ${body.length} chars`);
      }
      
      if (body.length < 50) {
        console.log('Warning: Email body is very short. Showing full content for debugging:');
        console.log(body);
      } else {
        console.log(`Email body extracted, length: ${body.length} chars`);
        console.log('First 100 chars of body:', body.substring(0, 100));
      }
      
      const emailData = {
        id: message.id,
        threadId: message.threadId,
        sender: from,
        subject: subject,
        body: body,
        date: date,
      };
      
      console.log('Processing email with data:', {
        id: emailData.id,
        sender: emailData.sender,
        subject: emailData.subject,
        date: emailData.date
      });
      
      const expense = await applyParserRules(emailData);
      
      if (expense) {
        console.log('Successfully extracted expense:', expense);
      } else {
        console.log('No expense could be extracted from this email');
      }
      
      return expense;
    } catch (error) {
      console.error('Error processing email:', error);
      return null;
    }
  };

  // Scan emails for expenses
  const handleScan = async () => {
    const rules = await getParserRules();
    const enabledRules = rules.filter(r => r.enabled);
    
    if (enabledRules.length === 0) {
      toast({
        title: 'No Parser Rules',
        description: 'Please create and enable at least one parser rule in Settings > Parsing before scanning.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsScanning(true);
    setProgress(0);
    
    try {
      // Convert date objects to UNIX timestamps
      const fromDateUnix = dateRange.from ? Math.floor(dateRange.from.getTime() / 1000) : undefined;
      const toDateUnix = dateRange.to ? Math.floor(dateRange.to.getTime() / 1000) : undefined;
      
      console.log(`Scanning emails from ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);
      console.log(`Unix timestamps: from=${fromDateUnix}, to=${toDateUnix}`);
      
      if (!window.gapi?.client?.gmail) {
        console.log('Loading Gmail API before scanning');
        try {
          await window.gapi.client.load('gmail', 'v1');
        } catch (loadError) {
          console.error('Failed to load Gmail API:', loadError);
          throw new Error('Failed to load Gmail API. Please try again or reconnect your account.');
        }
      }
      
      // Verify token validity
      try {
        const token = window.gapi.client.getToken();
        if (!token || !token.access_token) {
          console.error('No valid token available');
          
          // Check if we need to reset auth state
          setIsAuthenticated(false);
          
          toast({
            title: 'Authentication Error',
            description: 'Your session has expired. Please reconnect your Gmail account.',
            variant: 'destructive',
          });
          setIsScanning(false);
          return;
        }
        
        // Double-check token validity with a simple API call
        try {
          const testResponse = await window.gapi.client.gmail.users.getProfile({
            userId: 'me'
          });
          console.log('Token verified successfully:', testResponse.result.emailAddress);
        } catch (verifyError: any) {
          console.error('Token verification failed:', verifyError);
          
          if (verifyError?.result?.error?.code === 401 || verifyError?.status === 401) {
            setIsAuthenticated(false);
            
            toast({
              title: 'Authentication Error',
              description: 'Your session has expired. Please reconnect your Gmail account.',
              variant: 'destructive',
            });
            setIsScanning(false);
            return;
          }
        }
      } catch (tokenError) {
        console.error('Error checking token:', tokenError);
      }
      
      console.log('Attempting to list expense emails...');
      let emails;
      try {
        emails = await listExpenseEmails(500, fromDateUnix, toDateUnix);
      } catch (listError) {
        console.error('Error listing expense emails:', listError);
        
        // Check if this is an authentication error
        if (listError instanceof Error && 
            (listError.message.includes('Authentication error') || 
             listError.message.includes('auth') || 
             listError.message.includes('expired'))) {
          setIsAuthenticated(false);
        }
        
        throw new Error('Failed to retrieve emails. ' + (listError instanceof Error ? listError.message : ''));
      }
      
      if (!emails || emails.length === 0) {
        setIsScanning(false);
        const errorMessage = `Could not find any emails matching your parser rules in the selected date range (${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}). Try adjusting your date range or parser rules.`;
        
        toast({
          title: 'No emails found',
          description: errorMessage,
        });
        
        if (onScanError) {
          onScanError(errorMessage);
        }
        return;
      }
      
      const messageIds = emails.map(email => email.id);
      const totalEmails = messageIds.length;
      
      console.log(`Starting to process ${totalEmails} emails from ${format(dateRange.from, 'MMM d, yyyy')} to ${format(dateRange.to, 'MMM d, yyyy')}`);
      
      const results: Expense[] = [];
      let processedCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < messageIds.length; i++) {
        try {
          const messageId = messageIds[i];
          console.log(`Processing email ${i+1}/${messageIds.length}, ID: ${messageId}`);
          const expense = await processEmail(messageId);
          
          if (expense) {
            results.push(expense);
            await addExpense(expense);
            processedCount++;
          }
          
          setProgress(Math.min(100, ((i + 1) / totalEmails) * 100));
          
          if (i % 10 === 0 && i > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Error processing email at index ${i}:`, error);
          errorCount++;
          // Continue with the next email
        }
      }
      
      setIsScanning(false);
      setProgress(100);
      
      const validExpenses = results.filter(Boolean);
      if (validExpenses.length > 0) {
        toast({
          title: 'Scan Complete',
          description: `Found ${validExpenses.length} expenses in ${totalEmails} emails. ${errorCount > 0 ? `(${errorCount} emails had errors but were skipped)` : ''}`,
        });
        onScanComplete(validExpenses);
      } else {
        const errorMessage = `Scanned ${totalEmails} emails but could not find any valid expenses. ${errorCount > 0 ? `(${errorCount} emails had errors)` : ''} Check your parser rules in Settings > Parsing.`;
        
        toast({
          title: 'No Expenses Found',
          description: errorMessage,
          variant: 'default',
        });
        
        if (onScanError) {
          onScanError(errorMessage);
        }
      }
    } catch (error) {
      console.error('Scan error:', error);
      setIsScanning(false);
      setProgress(0);
      
      let errorMessage = 'An error occurred while scanning emails. Please try again.';
      
      if (error instanceof Error) {
        console.log('Error details:', error.message);
        
        if (error.message.includes('Invalid credentials') || error.message.includes('auth') || error.message.includes('token')) {
          errorMessage = 'Authentication error. Please log out and reconnect your Gmail account.';
          // Reset auth state
          setIsAuthenticated(false);
        } else if (error.message.includes('date') || error.message.includes('range')) {
          errorMessage = 'Error with date range selection. Try a different date range.';
        } else if (error.message.includes('API')) {
          errorMessage = 'Gmail API error. Please try again later or reconnect your account.';
        } else if (error.message.includes('network') || error.message.includes('Network Error')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('permission') || error.message.includes('scope')) {
          errorMessage = 'Permission error. Please reconnect your Gmail account with required permissions.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast({
        title: 'Scan Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      if (onScanError) {
        onScanError(errorMessage);
      }
    }
  };

  // Loading state
  if (isInitializing) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center min-h-[250px]">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <h3 className="text-lg font-medium">Initializing Gmail Connection</h3>
        <p className="text-muted-foreground text-center mt-2">
          Please wait while we set up the Gmail integration...
        </p>
      </Card>
    );
  }
  
  // Not authenticated view
  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-medium">Connect to Gmail</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              Connect your Gmail account to automatically extract expense information from your emails.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-sm">
              <Shield className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Secure & Private</p>
                <p className="text-muted-foreground">
                  Your data never leaves your device. All processing happens locally.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 text-sm">
              <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Read-Only Access</p>
                <p className="text-muted-foreground">
                  We only request read-only access to scan for expense information.
                </p>
              </div>
            </div>
            
            {isMobile && (
              <div className="flex items-start gap-2 text-sm">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Browser Redirect</p>
                  <p className="text-muted-foreground">
                    You'll be redirected to Google to sign in, then returned to this app.
                  </p>
                </div>
              </div>
            )}
            
            {!isMobile && (
              <div className="flex items-start gap-2 text-sm">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Direct Gmail Login</p>
                  <p className="text-muted-foreground">
                    Login directly with your Gmail account to access your expense emails.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex flex-col space-y-3">
            {isConnecting ? (
              <div className="space-y-3">
                <Button 
                  disabled
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  size="lg"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isMobile ? 'Redirecting to Google...' : 'Connecting to Gmail...'}
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  {isMobile 
                    ? 'Please complete the Google login process' 
                    : 'Please complete the login process in the popup window'}
                </p>
                <Button 
                  variant="outline" 
                  onClick={retryConnection}
                  className="mt-2 w-full flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Connection
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleAuth} 
                className="btn-primary w-full"
                size="lg"
              >
                Login with Gmail
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    );
  }
  
  // Authenticated view
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
            <Check className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Gmail Connected</h3>
            {loggedInUser && (
              <p className="text-sm text-muted-foreground">
                Logged in as {loggedInUser}
              </p>
            )}
          </div>
          <Badge variant="outline" className="ml-auto">Connected</Badge>
        </div>
        
        {!hasRules && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">No parser rules enabled</p>
              <p className="text-xs text-yellow-700 mt-1">
                You need to create and enable at least one parser rule in 
                Settings &gt; Parsing before scanning emails.
              </p>
            </div>
          </div>
        )}
        
        {!isScanning && (
          <div className="mb-4 p-4 border rounded-md">
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <Calendar className="h-4 w-4 mr-1" /> 
              Select Date Range
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="grid gap-2 flex-1">
                <DateRangeSelector 
                  value={dateRange}
                  onChange={setDateRange}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
        
        {isScanning ? (
          <div className="space-y-4">
            <div className="w-full bg-secondary rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Scanning emails for expenses ({Math.round(progress)}%)
            </p>
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Button 
              onClick={handleScan} 
              className="btn-primary w-full"
              size="lg"
              disabled={!hasRules}
            >
              Scan Emails for Expenses
            </Button>
            {!hasRules && (
              <p className="text-xs text-center text-muted-foreground">
                Go to Settings &gt; Parsing to create parser rules first
              </p>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default GmailAuthView;
