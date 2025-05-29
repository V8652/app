/**
 * Utilities for managing export path preferences
 */
import { FileOpener } from '@capacitor-community/file-opener';
import { toast } from '@/hooks/use-toast';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Key for storing the export path in localStorage
const EXPORT_PATH_KEY = 'master_export_path';

/**
 * Save the master export path to localStorage
 */
export const saveMasterExportPath = (path: string): void => {
  try {
    localStorage.setItem(EXPORT_PATH_KEY, path);
    console.log('Master export path saved:', path);
  } catch (error) {
    console.error('Error saving master export path:', error);
  }
};

/**
 * Get the saved master export path from localStorage
 */
export const getMasterExportPath = (): string | null => {
  try {
    // For Android, always return the Downloads folder path
    if (isAndroidDevice()) {
      return "/storage/emulated/0/Download";
    }
    return localStorage.getItem(EXPORT_PATH_KEY);
  } catch (error) {
    console.error('Error retrieving master export path:', error);
    return null;
  }
};

/**
 * Get the export path for saving files
 * This will return the saved path or a default path
 */
export const getExportPath = async (): Promise<string | null> => {
  const savedPath = getMasterExportPath();
  if (savedPath) {
    return savedPath;
  }
  
  // Default to Downloads folder on Android
  if (isAndroidDevice()) {
    return "/storage/emulated/0/Download";
  }
  
  return null;
};

/**
 * Clear the saved master export path
 */
export const clearMasterExportPath = (): void => {
  try {
    localStorage.removeItem(EXPORT_PATH_KEY);
    console.log('Master export path cleared');
  } catch (error) {
    console.error('Error clearing master export path:', error);
  }
};

/**
 * Check if running on Android
 */
export const isAndroidDevice = (): boolean => {
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  console.log('Checking if Android device:', isAndroid, 'User agent:', navigator.userAgent);
  return isAndroid;
};

/**
 * Determine if we're running in a Capacitor environment
 */
export const isCapacitorApp = (): boolean => {
  const isCapacitor = typeof (window as any)?.Capacitor !== 'undefined' && 
                     typeof (window as any).Capacitor.isNativePlatform === 'function' && 
                     (window as any).Capacitor.isNativePlatform();
  console.log('Checking if Capacitor app:', isCapacitor);
  return isCapacitor;
};

/**
 * Request Android permissions directly using Capacitor's Permissions API if available
 */
export const requestAndroidPermissions = async (): Promise<boolean> => {
  try {
    if (isAndroidDevice() && isCapacitorApp()) {
      console.log('Checking Android storage permissions...');
      
      // For Android 10+ (API level 29+)
      if (parseInt((navigator.userAgent.match(/Android\s([0-9]+)/) || [])[1] || '0', 10) >= 10) {
        console.log('Android 10+ detected, using MANAGE_EXTERNAL_STORAGE permission');
        
        // Request MANAGE_EXTERNAL_STORAGE permission
        const result = await Filesystem.checkPermissions();
        if (result.publicStorage !== 'granted') {
          const requestResult = await Filesystem.requestPermissions();
          if (requestResult.publicStorage !== 'granted') {
            console.log('Storage permission denied');
            return false;
          }
        }
        return true;
      } else {
        // For Android 9 and below
        console.log('Android 9 or below detected, using legacy storage permissions');
        if ((window as any).cordova?.plugins?.permissions) {
          const permissions = [
            'android.permission.READ_EXTERNAL_STORAGE',
            'android.permission.WRITE_EXTERNAL_STORAGE'
          ];
          
          for (const permission of permissions) {
            const permResult = await new Promise<boolean>((resolve) => {
              (window as any).cordova.plugins.permissions.checkPermission(
                permission,
                (status: { hasPermission: boolean }) => {
                  console.log(`Permission ${permission} status:`, status);
                  resolve(status.hasPermission);
                },
                () => {
                  console.log(`Error checking permission ${permission}`);
                  resolve(false);
                }
              );
            });
            
            if (!permResult) {
              const granted = await new Promise<boolean>((resolve) => {
                (window as any).cordova.plugins.permissions.requestPermission(
                  permission,
                  (status: { hasPermission: boolean }) => {
                    console.log(`Permission ${permission} request result:`, status);
                    resolve(status.hasPermission);
                  },
                  () => {
                    console.log(`Error requesting permission ${permission}`);
                    resolve(false);
                  }
                );
              });
              
              if (!granted) {
                console.log(`Permission ${permission} denied`);
                return false;
              }
            }
          }
          return true;
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Error requesting Android permissions:', error);
    return false;
  }
};

/**
 * Open a file using FileOpener plugin
 */
export const openFile = async (filePath: string, mimeType: string): Promise<boolean> => {
  try {
    if (isCapacitorApp()) {
      await FileOpener.open({
        filePath,
        contentType: mimeType
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error opening file:', error);
    toast({
      title: "Error Opening File",
      description: "Could not open the file. Please try downloading it instead.",
      variant: "destructive"
    });
    return false;
  }
};

/**
 * Request and obtain directory handle for export
 * Returns a directory handle that can be used for exporting files
 */
export const requestExportDirectory = async (): Promise<any> => {
  try {
    // For Android, automatically set the Downloads directory and return it
    if (isAndroidDevice()) {
      console.log('Android detected, automatically setting Downloads directory');
      
      // Request Android permissions first (keeping this for safety)
      const hasPermissions = await requestAndroidPermissions();
      console.log('Permission check result:', hasPermissions);
      
      if (!hasPermissions) {
        console.log('Android permissions denied');
        throw new Error('Storage permissions denied');
      }
      
      // Use standard Download directory
      const downloadDir = "/storage/emulated/0/Download";
      console.log('Setting standard Download directory as export path:', downloadDir);
      saveMasterExportPath(downloadDir);
            
      toast({
        title: "Export Path Set",
        description: `Your export path has been set to the Downloads folder`
      });
            
      return { path: downloadDir };
    }
    
    // Default method using File System Access API (for non-Android platforms)
    if ('showDirectoryPicker' in window) {
      console.log('Opening directory picker using File System Access API...');
      
      try {
        // Use the File System Access API to select a directory
        // @ts-ignore - TypeScript doesn't have types for showDirectoryPicker yet
        const directoryHandle = await window.showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'downloads',
        });
        
        // Save the directory handle as a serialized string
        const path = directoryHandle.name || 'Selected Directory';
        saveMasterExportPath(path);
        
        console.log('Directory selected:', path);
        
        // Return the directory handle for immediate use
        return directoryHandle;
      } catch (error) {
        // Check if the user cancelled the directory picker
        if ((error as Error).name === 'AbortError') {
          console.log('User cancelled the directory selection');
          return null;
        }
        throw error;
      }
    } else {
      console.error('File System Access API not supported');
      throw new Error('File System Access API not supported in this browser');
    }
  } catch (error) {
    console.error('Error requesting export directory:', error);
    // Only throw if it's not a user abort
    if ((error as Error).name !== 'AbortError') {
      throw error;
    }
    return null;
  }
};

/**
 * Save a file to the export directory
 * This function ensures files are saved properly across all platforms
 */
export const saveToExportDirectory = async (
  filename: string, 
  content: Blob, 
  mimeType: string
): Promise<boolean> => {
  try {
    console.log(`Attempting to save file ${filename}`);
    
    // Handle Android differently from other platforms
    if (isAndroidDevice() && isCapacitorApp()) {
      console.log('Android Capacitor app detected, using Filesystem API');
      
      // Convert blob to base64 data
      const reader = new FileReader();
      const base64Data: string = await new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix (e.g., "data:text/csv;base64,")
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('Failed to read file data'));
        reader.readAsDataURL(content);
      });
      
      console.log('File data converted to base64, preparing to write file');
      
      try {
        // Try to save in Downloads directory first
        const result = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.External, // Use external storage for downloads
          recursive: true
        });
        
        console.log('File written successfully to External directory:', result.uri);
        
        // Open the file to show it to the user
        await FileOpener.open({
          filePath: result.uri,
          contentType: mimeType
        });
        
        toast({
          title: "Export Complete",
          description: "Your file has been saved to Downloads folder.",
        });
        
        return true;
      } catch (fileError) {
        console.error('Error writing to External directory:', fileError);
        
        // Fallback to Documents directory
        try {
          const result = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true
          });
          
          console.log('File written successfully to Documents directory:', result.uri);
          
          // Open the file to show it to the user
          await FileOpener.open({
            filePath: result.uri,
            contentType: mimeType
          });
          
          toast({
            title: "Export Complete",
            description: "Your file has been saved to Documents folder.",
          });
          
          return true;
        } catch (docError) {
          console.error('Error writing to Documents directory:', docError);
          throw docError;
        }
      }
    }
    
    // For web or non-Android platforms, use the download approach
    console.log('Non-Android platform detected, using browser download');
    
    // Create a URL for the blob
    const url = URL.createObjectURL(content);
    
    // Create and trigger download link (works reliably across platforms)
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    
    console.log('Triggering file download');
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('Download link removed, blob URL revoked');
    }, 100);
    
    toast({
      title: "Export Complete",
      description: "Your file has been exported successfully.",
    });
    
    return true;
  } catch (error) {
    console.error('Error saving file:', error);
    toast({
      title: "Save Failed",
      description: `Could not save file: ${(error as Error).message}`,
      variant: "destructive"
    });
    return false;
  }
};
