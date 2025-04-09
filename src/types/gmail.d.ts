
// Type definitions for Google API Client Libraries
declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenResponse {
        access_token: string;
        expires_in: number;
        scope: string;
        token_type: string;
        error?: string;
        error_description?: string;
      }

      interface TokenClient {
        callback: (resp: TokenResponse) => void;
        requestAccessToken: (options?: { prompt?: string }) => void;
      }

      function initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (resp: TokenResponse) => void;
        error_callback?: (resp: { error: string; error_description: string }) => void;
      }): TokenClient;
    }
  }
}

declare interface Window {
  gapi: {
    load: (name: string, callback: { callback: () => void; onerror?: (error: any) => void; timeout?: number; ontimeout?: () => void }) => void;
    client: {
      init: (options: {
        apiKey: string;
        discoveryDocs: string[];
      }) => Promise<void>;
      getToken: () => any;
      // Adding setToken as 'any' since we'll use the workaround
      setToken?: any;
      load: (apiName: string, version: string) => Promise<void>;
      gmail: {
        users: {
          messages: {
            list: (options: {
              userId: string;
              q?: string;
              maxResults?: number;
            }) => Promise<{
              result: {
                messages?: { id: string; threadId: string }[];
                nextPageToken?: string;
              };
              status?: number;
            }>;
            get: (options: {
              userId: string;
              id: string;
              format?: string;
            }) => Promise<{
              result: any;
              status?: number;
            }>;
          };
          getProfile: (options: {
            userId: string;
          }) => Promise<{
            result: {
              emailAddress: string;
              messagesTotal?: number;
              threadsTotal?: number;
              historyId?: string;
            };
            status?: number;
          }>;
        };
      };
    };
  };
  google: {
    accounts: {
      oauth2: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (resp: google.accounts.oauth2.TokenResponse) => void;
          error_callback?: (resp: { error: string; error_description: string }) => void;
        }) => google.accounts.oauth2.TokenClient;
      };
    };
  };
}
