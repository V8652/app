
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatCurrency as formatCurrencyFromUtil } from "./utils/formatCurrency"
import { toast } from '@/hooks/use-toast'
import { isNativeApp } from '@/hooks/use-mobile'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return formatCurrencyFromUtil(amount, currency);
}

// Enhanced function to detect if device is running Android
export function isAndroidDevice(): boolean {
  // Only check user agent if we're in a browser environment
  if (typeof navigator !== 'undefined' && typeof window !== 'undefined') {
    const isAndroid = /Android/i.test(navigator.userAgent);
    console.log('isAndroidDevice check:', isAndroid, 'user agent:', navigator.userAgent);
    return isAndroid;
  }
  return false;
}

// Check if we're in a Capacitor native environment - using the imported isNativeApp function
export function isCapacitorNative(): boolean {
  const isCapacitor = isNativeApp();
  console.log('isCapacitorNative check:', isCapacitor);
  return isCapacitor;
}

// Request storage permissions for Android
export async function requestStoragePermissions(): Promise<boolean> {
  if (!isAndroidDevice()) return true;
  
  try {
    console.log("Requesting Android storage permissions...");
    
    const Permissions = window?.Capacitor?.Plugins?.Permissions;
    if (!Permissions) {
      console.log("Permissions API not available");
      return true; // Assume granted for web
    }
    
    // Storage permission is the primary one we need
    const storageState = await Permissions.query({ name: 'storage' });
    console.log("Storage permission initial state:", storageState);
    
    if (storageState.state !== 'granted') {
      console.log("Requesting storage permission");
      const requestResult = await Permissions.request({ name: 'storage' });
      console.log("Storage permission request result:", requestResult);
      
      if (requestResult.state !== 'granted') {
        console.error("Storage permission denied");
        return false;
      }
    }
    
    // For Android 13+ (API 33+), we also need media permissions
    const apiLevel = parseInt((navigator.userAgent.match(/Android\s([0-9]+)/) || [])[1] || '0', 10);
    console.log("Android API level detected:", apiLevel);
    
    if (apiLevel >= 33) {
      console.log("Android 13+ detected, requesting media permissions");
      
      const mediaPermissions = ['photos', 'videos', 'audio'];
      for (const perm of mediaPermissions) {
        try {
          const permState = await Permissions.query({ name: perm as any });
          if (permState.state !== 'granted') {
            await Permissions.request({ name: perm as any });
          }
        } catch (e) {
          console.log(`Error handling ${perm} permission:`, e);
          // Continue anyway as these are supplementary
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error requesting permissions:", error);
    return false;
  }
}

// Enhanced function for Android file download with improved error handling
export async function triggerDownload(url: string, filename: string): Promise<{ success: boolean, path?: string }> {
  console.log(`Triggering download for ${filename}, is Android:`, isAndroidDevice());
  
  // For Android, first check permissions
  if (isAndroidDevice()) {
    const hasPermissions = await requestStoragePermissions();
    if (!hasPermissions) {
      toast({
        title: "Permission Denied",
        description: "Storage permission is required to save files.",
        variant: "destructive"
      });
      return { success: false };
    }
  }
  
  // For Android, use the Capacitor FilePicker API if available
  if (isAndroidDevice() && window?.Capacitor?.Plugins?.FilePicker) {
    try {
      console.log('Using Capacitor FilePicker for download');
      const FilePicker = window.Capacitor.Plugins.FilePicker;
      
      // Fetch the content from URL
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Convert blob to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!reader.result) {
            reject(new Error('Failed to read blob'));
            return;
          }
          const result = reader.result as string;
          // Remove data URL prefix if present
          const base64 = result.includes('base64,') 
            ? result.split('base64,')[1] 
            : result;
          resolve(base64);
        };
        reader.onerror = () => {
          reject(new Error('Failed to read blob'));
        };
        reader.readAsDataURL(blob);
      });
      
      // Use the FilePicker plugin correctly - the method is saveFile not just save
      console.log('Calling FilePicker.saveFile with correct method name...');
      const result = await FilePicker.saveFile({
        data: base64Data,
        filename: filename,
        mimeType: blob.type || 'application/octet-stream'
      });
      
      console.log('FilePicker save result:', result);
      
      toast({
        title: "File Saved",
        description: `File has been saved to your device`,
      });
      
      return { success: true };
    } catch (capacitorError) {
      console.error('Capacitor FilePicker approach failed:', capacitorError);
      
      // Fallback to standard download for web
      if (!isCapacitorNative()) {
        console.log('Falling back to standard web download approach');
        try {
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          toast({
            title: "Download Started",
            description: `Downloading ${filename} to your device`,
          });
          
          return { success: true };
        } catch (fallbackError) {
          console.error('Standard download fallback also failed:', fallbackError);
          toast({
            title: "Export Failed",
            description: `Could not export file: ${fallbackError.message || 'Unknown error'}`,
            variant: "destructive"
          });
          throw fallbackError;
        }
      }
      
      toast({
        title: "Export Failed",
        description: `${capacitorError.message || 'Error saving file on Android'}`,
        variant: "destructive"
      });
      throw capacitorError;
    }
  }
  
  // Try standard HTML5 download as fallback
  try {
    console.log('Using standard download approach');
    
    // Create a link element for standard download
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    
    // Add to document body to ensure it triggers properly
    document.body.appendChild(link);
    
    // Ensure the user sees a toast notification
    toast({
      title: "Downloading File",
      description: `Saving ${filename} to your device`,
    });
    
    // Click to trigger download
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    return { success: true };
  } catch (standardError) {
    console.error('Standard download approach failed:', standardError);
    
    toast({
      title: "Download Failed",
      description: "Could not download the file. Please try again.",
      variant: "destructive"
    });
    
    throw standardError;
  }
}
