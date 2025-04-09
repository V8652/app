// Gmail authentication and API access
import { GmailCredentials } from '@/types';
import { toast } from '@/hooks/use-toast';
import { getPreferences, savePreferences } from '@/lib/db';
import { ensureDefaultParserRules } from './apply-parser-rules';
import { Browser } from '@capacitor/browser';
import { isNativeApp } from '@/hooks/use-mobile';

// Auth configuration 
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

// OAuth client IDs for different platforms
const WEB_CLIENT_ID = '551474206295-o3o1tuht1a82mm5runb9ghll1h062jk7.apps.googleusercontent.com';
const MOBILE_CLIENT_ID = '551474206295-7uc8ftghdvup5nee3slqe94tqp059oaf.apps.googleusercontent.com';
const DEFAULT_API_KEY = 'AIzaSyBkO-oz5VzH7Md4jmSDjcgNRbW1AwiN_DE';

// Platform detection with improved accuracy
const isNativePlatform = isNativeApp();
console.log('Gmail Auth - Platform detection result:', isNativePlatform);

// Function to get the correct client ID based on platform
const getClientId = (): string => {
  const clientId = isNativePlatform ? MOBILE_CLIENT_ID : WEB_CLIENT_ID;
  console.log('Using client ID:', clientId, 'for platform:', isNativePlatform ? 'native' : 'web');
  return clientId;
};

// Store token client reference and initialization states
let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInited = false;
let gisInited = false;
let apiInitPromise: Promise<void> | null = null;

// Code verifier for PKCE
let codeVerifier: string | null = null;

// Helper function to load script asynchronously
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = (e) => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
};

// Check network status asynchronously
const getNetworkStatus = async (): Promise<boolean> => {
  // Use navigator.onLine as a reliable check
  return navigator.onLine;
};

// Store credentials in IndexedDB
export const storeCredentials = async (credentials: GmailCredentials): Promise<void> => {
  try {
    console.log('Storing Gmail credentials with expiry:', credentials.expiryDate);
    
    // Ensure expiry date is properly set
    if (!credentials.expiryDate || credentials.expiryDate <= Date.now()) {
      // If expiry is missing or invalid, set it to 1 hour from now
      credentials.expiryDate = Date.now() + (3600 * 1000);
      console.log('Setting default expiry time to 1 hour from now:', credentials.expiryDate);
    }
    
    const prefs = await getPreferences();
    prefs.gmailCredentials = credentials;
    await savePreferences(prefs);
    console.log('Gmail credentials stored successfully');
  } catch (error) {
    console.error('Error storing Gmail credentials:', error);
    throw error;
  }
};

// Clear credentials from IndexedDB
export const clearCredentials = async (): Promise<void> => {
  try {
    const prefs = await getPreferences();
    prefs.gmailCredentials = null;
    await savePreferences(prefs);
    console.log('Gmail credentials cleared');
  } catch (error) {
    console.error('Error clearing Gmail credentials:', error);
    throw error;
  }
};

// Check if the user is authorized
export const isAuthorized = async (): Promise<boolean> => {
  try {
    const prefs = await getPreferences();
    const credentials = prefs.gmailCredentials;
    
    console.log('Checking authorization status, credentials found:', !!credentials);
    
    if (!credentials) {
      return false;
    }
    
    // Check if token is expired
    const isExpired = credentials.expiryDate && Date.now() >= credentials.expiryDate;
    
    if (isExpired) {
      console.log('Token has expired, needs refresh');
      return false;
    }
    
    // Double-check we have an access token
    if (!credentials.accessToken) {
      console.log('Access token is missing');
      return false;
    }
    
    console.log('Authorization check passed');
    return true;
  } catch (error) {
    console.error('Error checking authorization status:', error);
    return false;
  }
};

// Generate a random string for PKCE code verifier
const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (dec) => ('0' + dec.toString(16)).substring(-2)).join('');
};

// Create a code challenge from verifier using S256 method
const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Set token in GAPI client - Helper function to handle the token setting
const setGapiToken = (accessToken: string, expiresIn: number): void => {
  if (window.gapi?.client) {
    console.log('Setting GAPI token with expiry in', expiresIn, 'seconds');
    // Since we can't use setToken directly, we need to set the token using the global gapi object
    // This is a workaround for the TypeScript definition issue
    (window.gapi.client as any).setToken({
      access_token: accessToken,
      expires_in: expiresIn
    });
  } else {
    console.error('GAPI client not initialized, cannot set token');
  }
};

// Initialize the Gmail API client and set auth token if available
export const initializeGmailAPI = async (callback: () => void): Promise<void> => {
  // If initialization is already in progress, wait for it
  if (apiInitPromise) {
    await apiInitPromise;
    if (gapiInited && gisInited) {
      callback();
      return;
    }
  }
  
  // Create a new initialization promise
  apiInitPromise = (async () => {
    try {
      // Ensure default parser rules are created
      await ensureDefaultParserRules();
      
      // Check network connectivity first
      const isConnected = await getNetworkStatus();
      if (!isConnected) {
        console.error('No internet connection available');
        toast({
          title: 'No Internet Connection',
          description: 'Please check your internet connection and try again.',
          variant: 'destructive',
        });
        return;
      }
      
      // Load the GAPI client if not already loaded
      if (!window.gapi) {
        console.log('Loading GAPI script');
        try {
          await loadScript('https://apis.google.com/js/api.js');
          console.log('GAPI script loaded successfully');
        } catch (error) {
          console.error('Failed to load GAPI script:', error);
          toast({
            title: 'Connection Error',
            description: 'Failed to connect to Google services. Please check your internet connection and try again.',
            variant: 'destructive',
          });
          return;
        }
      }
      
      // Initialize GAPI client
      await new Promise<void>((resolve, reject) => {
        if (!window.gapi) {
          reject(new Error('GAPI script not loaded'));
          return;
        }
        
        // Fix the callback structure to match expected type
        // The issue is that we're providing an object with a 'callback' property
        // to a function that expects a callback function directly
        const onClientLoad = () => {
          window.gapi.client.init({
            apiKey: DEFAULT_API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
          })
          .then(async () => {
            gapiInited = true;
            console.log('GAPI client initialized successfully');
            
            // Check if we already have stored credentials and set them
            const isAuth = await isAuthorized();
            if (isAuth) {
              try {
                const prefs = await getPreferences();
                const credentials = prefs.gmailCredentials;
                
                if (credentials && credentials.accessToken) {
                  console.log('Setting stored credentials to GAPI');
                  const expiresIn = Math.floor((credentials.expiryDate - Date.now()) / 1000);
                  setGapiToken(credentials.accessToken, expiresIn);
                }
              } catch (credError) {
                console.error('Error setting stored credentials:', credError);
              }
            }
            
            resolve();
          })
          .catch((error: any) => {
            console.error('Error initializing Gmail API client:', error);
            reject(error);
          });
        };
        
        const onError = (error: any) => {
          console.error('GAPI client load error:', error);
          reject(new Error('Failed to load Google API client'));
        };
        
        const onTimeout = () => {
          reject(new Error('Timeout loading Google API client'));
        };
        
        // Properly type the gapi.load call according to the vite-env.d.ts definition
        window.gapi.load('client', onClientLoad);
      });
      
      // Load the Google Identity Services client if not already loaded
      if (!window.google?.accounts?.oauth2) {
        console.log('Loading Google Identity Services script');
        try {
          await loadScript('https://accounts.google.com/gsi/client');
          console.log('Google Identity Services script loaded successfully');
        } catch (error) {
          console.error('Failed to load Google Identity Services script:', error);
          toast({
            title: 'Connection Error',
            description: 'Failed to connect to Google authentication services. Please try again later.',
            variant: 'destructive',
          });
          return;
        }
      }
      
      // Initialize token client with proper error handling
      try {
        if (!window.google?.accounts?.oauth2) {
          throw new Error('Google Identity Services not loaded');
        }
        
        // Define the token callback function
        const tokenCallback = (resp: google.accounts.oauth2.TokenResponse) => {
          // Handle the authentication response
          console.log('Token client callback received response');
          if (resp.error !== undefined) {
            console.error('Error in token response:', resp);
            toast({
              title: 'Authentication Error',
              description: resp.error_description || 'Failed to authenticate with Google',
              variant: 'destructive',
            });
            return;
          }
        };
        
        // Initialize the token client with the appropriate client ID and callback
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: getClientId(),
          scope: SCOPES,
          callback: tokenCallback
        });
        
        gisInited = true;
        console.log('Token client initialized successfully');
      } catch (error) {
        console.error('Error initializing token client:', error);
        toast({
          title: 'Authentication Error',
          description: 'Failed to initialize Google authentication. Please try again later.',
          variant: 'destructive',
        });
        return;
      }
      
      // Call the callback if both initializations succeeded
      if (gapiInited && gisInited) {
        console.log('Both GAPI and GIS initialized successfully, calling callback');
        callback();
      } else {
        console.error('Initialization incomplete: GAPI =', gapiInited, 'GIS =', gisInited);
      }
    } catch (error) {
      console.error('Error initializing Gmail API:', error);
      toast({
        title: 'Gmail API Initialization Error',
        description: 'Could not initialize Gmail API client. Please try again.',
        variant: 'destructive',
      });
    }
  })();
  
  await apiInitPromise;
};

// Get proper redirect URI based on platform
export const getRedirectUri = (): string => {
  const redirectUri = isNativePlatform 
    ? 'app.lovable.moneyminder:/oauth2callback' 
    : `${window.location.origin}/auth/callback`;
  
  console.log('Using redirect URI:', redirectUri, 'for platform:', isNativePlatform ? 'native' : 'web');
  return redirectUri;
};

// Main authentication function to request authorization
export const requestAuthorization = async (onSuccess: (credentials?: any) => void): Promise<void> => {
  try {
    console.log('Starting authorization request');
    
    // Check network connectivity first
    const isConnected = await getNetworkStatus();
    if (!isConnected) {
      console.error('No internet connection available');
      toast({
        title: 'No Internet Connection',
        description: 'Please check your internet connection and try again.',
        variant: 'destructive',
      });
      return;
    }
    
    // Make sure the API is initialized first
    await initializeGmailAPI(() => {
      console.log('Gmail API initialized in requestAuthorization');
    });
    
    // Determine if we need to use the PKCE redirect flow based on platform
    const useRedirectFlow = isNativePlatform;
    console.log('Using redirect flow:', useRedirectFlow, 'based on platform detection:', isNativePlatform);
    
    if (useRedirectFlow) {
      // Use the redirect flow (for mobile and certain web cases)
      // Store the callback in localStorage to retrieve after redirect
      localStorage.setItem('authCallback', 'true');
      
      // Set up a one-time event listener for the oauth-redirect event
      const handleOAuthRedirect = (event: CustomEvent) => {
        console.log('OAuth redirect event handler triggered');
        const { code } = event.detail;
        if (code) {
          console.log('Received OAuth redirect event with code');
          // Process the authorization code
          const verifier = localStorage.getItem('codeVerifier');
          if (verifier) {
            exchangeCodeForTokens(code, verifier)
              .then(async (credentials) => {
                if (credentials) {
                  console.log('Successfully exchanged code for tokens');
                  await storeCredentials(credentials);
                  
                  // Set the token in GAPI client
                  if (window.gapi?.client && credentials.accessToken) {
                    console.log('Setting GAPI client token after token exchange');
                    const expiresIn = Math.floor((credentials.expiryDate - Date.now()) / 1000);
                    setGapiToken(credentials.accessToken, expiresIn);
                    
                    // Try to initialize Gmail API if needed
                    if (!window.gapi.client.gmail) {
                      try {
                        console.log('Loading Gmail API after token exchange');
                        await window.gapi.client.load('gmail', 'v1');
                      } catch (loadErr) {
                        console.error('Error loading Gmail API after auth:', loadErr);
                      }
                    }
                  }
                  
                  // Clear the pending auth data
                  localStorage.removeItem('pendingAuthCode');
                  localStorage.removeItem('authCallback');
                  localStorage.removeItem('codeVerifier');
                  
                  // Call the callback with credentials
                  if (onSuccess) {
                    onSuccess(credentials);
                  }
                  
                  // Show success toast
                  toast({
                    title: 'Successfully connected to Gmail',
                    description: 'Your Gmail account is now connected to ExpenseTrack',
                  });
                }
              })
              .catch(error => {
                console.error('Error exchanging code for tokens:', error);
                toast({
                  title: 'Authentication Error',
                  description: 'Failed to complete the authentication process. Please try again.',
                  variant: 'destructive',
                });
              });
          } else {
            console.error('No code verifier found in localStorage');
            toast({
              title: 'Authentication Error',
              description: 'Missing authentication data. Please try again.',
              variant: 'destructive',
            });
          }
        } else {
          console.error('No authorization code in event detail');
        }
      };
      
      // Remove any existing event listeners to prevent duplicates
      window.removeEventListener('oauth-redirect', handleOAuthRedirect as EventListener);
      
      // Add the event listener
      window.addEventListener('oauth-redirect', handleOAuthRedirect as EventListener, { once: true });
      
      // Start the auth flow
      await startGmailAuth();
    } else {
      // Use the popup flow (for web, more reliable on desktop browsers)
      if (!tokenClient) {
        console.error('Token client not initialized');
        toast({
          title: 'Authentication Error',
          description: 'Google authentication not initialized properly. Please refresh and try again.',
          variant: 'destructive',
        });
        return;
      }
      
      console.log('Using popup flow for web authentication');
      
      // Use the token client to request access (will show a popup)
      tokenClient.callback = async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
        if (tokenResponse.error !== undefined) {
          console.error('Error during authentication:', tokenResponse);
          toast({
            title: 'Authentication Error',
            description: tokenResponse.error_description || 'Failed to authenticate with Google',
            variant: 'destructive',
          });
          return;
        }
        
        console.log('Authentication successful, processing token response');
        
        // Store credentials in preferences
        const credentials: GmailCredentials = {
          accessToken: tokenResponse.access_token,
          refreshToken: '', // Not available in popup flow
          expiryDate: Date.now() + (tokenResponse.expires_in * 1000),
          clientId: getClientId(),
          apiKey: DEFAULT_API_KEY
        };
        
        await storeCredentials(credentials);
        
        // Set token in GAPI client
        if (window.gapi?.client) {
          setGapiToken(tokenResponse.access_token, tokenResponse.expires_in);
        }
        
        // Call the provided callback with credentials
        if (onSuccess) {
          onSuccess(credentials);
        }
      };
      
      // Prompt the user to authenticate
      try {
        console.log('Requesting access token with popup consent');
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (error) {
        console.error('Error requesting access token:', error);
        toast({
          title: 'Authentication Error',
          description: 'Failed to start authentication process. Please try again.',
          variant: 'destructive',
        });
      }
    }
  } catch (error) {
    console.error('Error during authorization:', error);
    toast({
      title: 'Authentication Error',
      description: 'Failed to authenticate with Google. Please try again.',
      variant: 'destructive',
    });
  }
};

// Modified authentication approach with PKCE flow
export const startGmailAuth = async (): Promise<void> => {
  try {
    // Check network connectivity first
    const isConnected = await getNetworkStatus();
    if (!isConnected) {
      toast({
        title: 'No Internet Connection',
        description: 'You need an internet connection to authenticate with Gmail.',
        variant: 'destructive',
      });
      return;
    }
    
    // Generate PKCE code verifier and challenge
    codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Store the code verifier for later use
    localStorage.setItem('codeVerifier', codeVerifier);
    
    const redirectUri = getRedirectUri();
    const clientId = getClientId();
    console.log('Using redirect auth flow with URI:', redirectUri);
    console.log('Using client ID:', clientId);
    console.log('Platform detection: isNativePlatform =', isNativePlatform);
    
    // Show instructions
    toast({
      title: 'Redirecting to Google login',
      description: isNativePlatform 
        ? 'You will be redirected to Google login. After logging in, you will return to this app.'
        : 'You will be redirected to Google login in a new window.',
    });
    
    // IMPORTANT: Create a properly formatted oauth URL with PKCE parameters
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&code_challenge=${encodeURIComponent(codeChallenge)}` +
      `&code_challenge_method=S256` +
      `&access_type=offline` +
      `&prompt=consent`;
    
    console.log('Authorization URL:', authUrl);
    
    // Store the callback function in localStorage to retrieve after redirect
    localStorage.setItem('pendingAuthCallback', 'true');
    
    if (isNativePlatform) {
      // Use Capacitor Browser plugin for mobile platforms
      try {
        console.log('Opening auth URL with Capacitor Browser:', authUrl);
        await Browser.open({ url: authUrl });
      } catch (browserError) {
        console.error('Error opening browser:', browserError);
        toast({
          title: 'Browser Error',
          description: 'Could not open browser for authentication. Please try again.',
          variant: 'destructive',
        });
      }
    } else {
      // Use standard browser redirect for web platforms
      console.log('Using standard browser redirect for web platform');
      // Redirect the entire page for web platforms
      setTimeout(() => {
        window.location.href = authUrl;
      }, 1500); // Small delay to ensure the toast is visible
    }
  } catch (error) {
    console.error('Authorization error:', error);
    toast({
      title: 'Authorization Error',
      description: 'An error occurred during authorization. Please try again.',
      variant: 'destructive',
    });
  }
};

// Exchange authorization code for tokens
const exchangeCodeForTokens = async (code: string, verifier: string): Promise<GmailCredentials | null> => {
  try {
    const redirectUri = getRedirectUri();
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    
    const params = new URLSearchParams();
    params.append('client_id', getClientId());
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('code_verifier', verifier);
    
    console.log('Exchanging code for tokens with parameters:', {
      client_id: getClientId(),
      redirect_uri: redirectUri,
      code_verifier_length: verifier.length
    });
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error_description || errorData.error || 'Unknown error';
      console.error('Token exchange failed:', errorData);
      throw new Error(`Token exchange failed: ${errorMessage}`);
    }
    
    const data = await response.json();
    console.log('Received token response successfully');
    
    // Ensure we got the access token
    if (!data.access_token) {
      throw new Error('No access token received from Google');
    }
    
    // Calculate proper expiry time (add some buffer)
    const expiryTime = Date.now() + ((data.expires_in - 60) * 1000); // Subtract 60 seconds as buffer
    
    const credentials: GmailCredentials = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      expiryDate: expiryTime,
      clientId: getClientId(),
      apiKey: DEFAULT_API_KEY
    };
    
    console.log(`Token will expire in ${data.expires_in} seconds (at ${new Date(expiryTime).toISOString()})`);
    
    return credentials;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
};

// Check for returned auth code in URL after redirect
export const checkForAuthRedirect = (): boolean => {
  console.log('Checking for auth redirect - Current URL:', window.location.href);

  // First check for protocol handler redirection
  if (window.location.href.includes('app.lovable.moneyminder:/oauth2callback') || 
      window.location.href.includes('app.lovable.moneyminder:/oauth2redirect') ||
      window.location.href.includes('app.lovable.moneyminder:/auth')) {
    console.log('Found protocol handler redirect:', window.location.href);
    
    // Extract the authorization code from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      console.log('Found code in protocol handler redirect');
      localStorage.setItem('pendingAuthCode', code);
      window.dispatchEvent(new CustomEvent('oauth-redirect', { detail: { code } }));
      return true;
    }
  }
  
  // Check for the auth code stored by the deep link handler
  const pendingAuthCode = localStorage.getItem('pendingAuthCode');
  if (pendingAuthCode) {
    console.log('Found pending auth code from deep link, processing');
    
    // Dispatch an oauth-redirect event to handle the code
    window.dispatchEvent(new CustomEvent('oauth-redirect', { 
      detail: { code: pendingAuthCode } 
    }));
    
    return true;
  }
  
  // For web platforms that use URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  // Web redirect handling
  if (!isNativePlatform && code) {
    console.log('Found auth code in URL (web), processing login');
    
    // Retrieve the code verifier from storage
    const storedVerifier = localStorage.getItem('codeVerifier');
    if (storedVerifier) {
      // Exchange the code for tokens
      exchangeCodeForTokens(code, storedVerifier)
        .then(async (credentials) => {
          if (credentials) {
            console.log('Successfully exchanged code for tokens');
            
            await storeCredentials(credentials);
            
            // Set token in GAPI client
            if (window.gapi?.client) {
              const expiresIn = Math.floor((credentials.expiryDate - Date.now()) / 1000);
              setGapiToken(credentials.accessToken, expiresIn);
            }
            
            // Remove the query parameters from the URL to avoid leaking the code
            window.history.replaceState(null, '', window.location.pathname);
            
            // Clear the pending auth flag
            localStorage.removeItem('pendingAuthCallback');
            localStorage.removeItem('codeVerifier');
            
            // Show success toast
            toast({
              title: 'Successfully connected to Gmail',
              description: 'Your Gmail account is now connected to ExpenseTrack',
            });
            
            // Reload the page to reinitialize the app with the new credentials
            window.location.reload();
          }
        })
        .catch(error => {
          console.error('Error exchanging code for tokens:', error);
          
          // Clear the pending auth flag
          localStorage.removeItem('pendingAuthCallback');
          localStorage.removeItem('codeVerifier');
          
          // Show error toast
          toast({
            title: 'Authentication Error',
            description: 'Failed to complete the authentication process. Please try again.',
            variant: 'destructive',
          });
        });
      
      return true;
    }
  }
  
  // Debug log if no redirect was handled
  console.log('No auth redirect detected in URL or localStorage');
  return false; // No redirect was handled
};

// Function to parse email body from Gmail API response
export const parseEmailBody = (message: any): string => {
  try {
    // Extract message parts
    const parts = message.payload.parts || [];
    let body = '';
    
    // If there are no parts, check if the body is in the payload
    if (parts.length === 0 && message.payload.body && message.payload.body.data) {
      return decodeEmailData(message.payload.body.data);
    }
    
    // Recursive function to extract parts
    const extractParts = (parts: any[]): void => {
      for (const part of parts) {
        if (part.body && part.body.data) {
          body += decodeEmailData(part.body.data);
        }
        if (part.parts && part.parts.length > 0) {
          extractParts(part.parts);
        }
      }
    };
    
    extractParts(parts);
    return body;
  } catch (error) {
    console.error('Error parsing email body:', error);
    return '';
  }
};

// Helper function to decode base64 encoded email data
const decodeEmailData = (data: string): string => {
  try {
    // Replace special characters used in base64url encoding
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const decodedData = atob(base64);
    return decodedData;
  } catch (error) {
    console.error('Error decoding email data:', error);
    return '';
  }
};

// Get email details from Gmail API
export const getEmailDetails = async (messageId: string): Promise<any> => {
  try {
    if (!window.gapi?.client?.gmail) {
      // Try to load Gmail API if not loaded
      console.log('Gmail API not loaded, attempting to load it now');
      try {
        await window.gapi.client.load('gmail', 'v1');
      } catch (loadError) {
        console.error('Failed to load Gmail API:', loadError);
        throw new Error('Gmail API not properly initialized');
      }
    }
    
    // Check if we have a valid token
    const token = window.gapi.client.getToken();
    if (!token || !token.access_token) {
      console.error('No valid access token available');
      
      // Try to use stored credentials
      const prefs = await getPreferences();
      if (prefs.gmailCredentials?.accessToken) {
        console.log('Setting stored credentials to GAPI');
        const expiresIn = Math.floor((prefs.gmailCredentials.expiryDate - Date.now()) / 1000);
        setGapiToken(prefs.gmailCredentials.accessToken, expiresIn);
      } else {
        throw new Error('Authentication error: Your session has expired. Please reconnect your Gmail account.');
      }
    }
    
    // Make the API request
    const response = await window.gapi.client.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });
    
    return response.result;
  } catch (error) {
    console.error('Error getting email details:', error);
    
    // Provide more detailed error information
    const apiError = error as any;
    if (apiError?.result?.error) {
      const errorDetails = apiError.result.error;
      console.error('API error details:', errorDetails);
      
      if (errorDetails.code === 401) {
        throw new Error('Authentication error: Your session has expired. Please reconnect your Gmail account.');
      } else if (errorDetails.code === 403) {
        throw new Error('Permission denied: You don\'t have permission to access this email. Please check your Gmail permissions.');
      } else if (errorDetails.code === 404) {
        throw new Error('Email not found: The requested email could not be found.');
      } else if (errorDetails.message) {
        throw new Error(`Gmail API error: ${errorDetails.message}`);
      }
    }
    
    throw error;
  }
};

// New function to scan Gmail for expenses
export const scanGmailForExpenses = async (fromDate: string, toDate: string): Promise<any[]> => {
  try {
    console.log(`Scanning Gmail for expenses between ${fromDate} and ${toDate}`);
    
    // Convert ISO string dates to UNIX timestamps (seconds)
    const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
    
    // Check if we have a valid token
    const isAuth = await isAuthorized();
    if (!isAuth) {
      throw new Error("Not authorized to access Gmail. Please connect your account first.");
    }
    
    // Import the function from expense-parser here to avoid circular dependency
    const { listExpenseEmails, batchProcessEmails } = await import('./expense-parser');
    
    // List emails that match our parser rules
    const messages = await listExpenseEmails(500, fromTimestamp, toTimestamp);
    
    if (!messages || messages.length === 0) {
      console.log('No matching emails found for the date range');
      return [];
    }
    
    console.log(`Found ${messages.length} emails matching expense criteria`);
    
    // Extract message IDs
    const messageIds = messages.map((msg: any) => msg.id);
    
    // Process emails to extract expense data
    const expenses = await batchProcessEmails(messageIds);
    
    console.log(`Successfully extracted ${expenses.length} expenses from emails`);
    
    // Save expenses to database
    if (expenses.length > 0) {
      const { addExpense } = await import('./db');
      
      // Add each expense to the database
      for (const expense of expenses) {
        try {
          await addExpense(expense);
          console.log(`Added expense: ${expense.merchantName} - ${expense.amount}`);
        } catch (error) {
          console.error(`Error adding expense to database:`, error);
        }
      }
    }
    
    return expenses;
  } catch (error) {
    console.error('Error scanning Gmail for expenses:', error);
    throw error;
  }
};
