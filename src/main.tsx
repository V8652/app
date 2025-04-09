import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { checkForAuthRedirect } from './lib/gmail-auth'
import { toast } from '@/hooks/use-toast'
import { App as CapApp } from '@capacitor/app'
import { isNativeApp } from '@/hooks/use-mobile'

// Remove any existing viewport meta tag first to avoid duplicates
const existingViewport = document.querySelector('meta[name="viewport"]')
if (existingViewport) {
  existingViewport.remove()
}

// Add meta viewport tag for better mobile responsiveness
const metaViewport = document.createElement('meta')
metaViewport.name = 'viewport'
metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
document.head.appendChild(metaViewport)

// Check if we're in a native environment
const isNativePlatform = isNativeApp();
console.log('main.tsx - Running in native platform:', isNativePlatform);

// Network error handling for mobile apps - ONLY APPLY FOR NATIVE PLATFORMS
if (isNativePlatform) {
  window.addEventListener('online', () => {
    console.log('App is back online')
    toast({
      title: 'Connection restored',
      description: 'You are back online'
    })
  })
  
  window.addEventListener('offline', () => {
    console.log('App is offline')
    toast({
      title: 'No internet connection',
      description: 'Please check your connection and try again',
      variant: 'destructive'
    })
  })
  
  // Set up app URL open listener for mobile deep links - only for native platforms
  console.log('Setting up app URL open listener for deep links (native only)')
  CapApp.addListener('appUrlOpen', (data: { url: string }) => {
    console.log('App opened with URL:', data.url)
    
    // Check if this is an OAuth redirect
    if (data.url.includes('oauth2callback') || 
        data.url.includes('oauth2redirect') || 
        data.url.includes('auth/callback') ||
        data.url.includes('auth')) {
      console.log('Processing OAuth redirect from URL:', data.url)
      
      try {
        // Parse the URL to get the authorization code
        const url = new URL(data.url)
        console.log('Parsed URL:', url.toString())
        console.log('URL search params:', url.search)
        
        // Extract code from query parameters
        const params = new URLSearchParams(url.search)
        const code = params.get('code')
        
        if (code) {
          console.log('Found authorization code in deep link:', code.substring(0, 5) + '...')
          // Store the code in localStorage to be processed by checkForAuthRedirect
          localStorage.setItem('pendingAuthCode', code)
          
          // We'll dispatch a custom event to notify the app that we have a pending auth code
          window.dispatchEvent(new CustomEvent('oauth-redirect', { detail: { code } }))
          
          // Show toast for debugging
          toast({
            title: 'OAuth Redirect Received',
            description: 'Processing authentication response...',
          })
        } else {
          console.error('No authorization code found in deep link')
          console.log('URL structure:', data.url)
          
          // Try to parse the URL in different ways (mobile URL schemes can be tricky)
          // Extract code from any path segments if it's in a non-standard format
          const pathParts = url.pathname.split('/')
          for (const part of pathParts) {
            if (part.startsWith('code=')) {
              const pathCode = part.replace('code=', '')
              console.log('Found code in URL path part:', pathCode.substring(0, 5) + '...')
              localStorage.setItem('pendingAuthCode', pathCode)
              window.dispatchEvent(new CustomEvent('oauth-redirect', { detail: { code: pathCode } }))
              
              toast({
                title: 'OAuth Redirect Received (Path)',
                description: 'Processing authentication from path...',
              })
              return
            }
          }
          
          // Try to extract code from path components if it's in an unusual format
          const urlParts = data.url.split('?')
          if (urlParts.length > 1) {
            const queryString = urlParts[1]
            console.log('Trying alternate parsing with query string:', queryString)
            
            const altParams = new URLSearchParams(queryString)
            const altCode = altParams.get('code')
            
            if (altCode) {
              console.log('Found code using alternate parsing method:', altCode.substring(0, 5) + '...')
              localStorage.setItem('pendingAuthCode', altCode)
              window.dispatchEvent(new CustomEvent('oauth-redirect', { detail: { code: altCode } }))
              
              toast({
                title: 'OAuth Redirect Received (Alt)',
                description: 'Processing authentication with alternate method...',
              })
            } else {
              toast({
                title: 'Authentication Error',
                description: 'Could not find authorization code in redirect. Please try again.',
                variant: 'destructive'
              })
            }
          } else {
            toast({
              title: 'Authentication Error',
              description: 'Invalid redirect format. Please try again.',
              variant: 'destructive'
            })
          }
        }
      } catch (error) {
        console.error('Error parsing OAuth redirect URL:', error)
        toast({
          title: 'Authentication Error',
          description: 'Error processing authentication response. Please try again.',
          variant: 'destructive'
        })
      }
    }
  })
}

// Enhanced code to monitor and log authentication state changes during app startup
window.addEventListener('storage', (event) => {
  if (event.key === 'pendingAuthCode' && event.newValue) {
    console.log('pendingAuthCode changed in localStorage, processing redirect');
    
    // Try to dispatch the oauth-redirect event
    try {
      window.dispatchEvent(new CustomEvent('oauth-redirect', { 
        detail: { code: event.newValue } 
      }));
      console.log('Dispatched oauth-redirect event from storage listener');
    } catch (err) {
      console.error('Error dispatching oauth-redirect event:', err);
    }
  }
});

// Check for Gmail auth redirect before rendering the app
console.log('Checking for auth redirect before rendering app')
const wasRedirected = checkForAuthRedirect()

if (!wasRedirected) {
  console.log('No auth redirect detected, rendering app normally')
}

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element not found")
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
