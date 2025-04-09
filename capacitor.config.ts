
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.moneyminder',
  appName: 'MoneyMinder',
  webDir: 'dist',
  server: {
    url: 'https://55d2b289-7a37-4eff-9a57-8acd224a70a7.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#FFFFFF",
    // Android-specific UI adjustments
    navigationBarColor: "#FFFFFF",
    navigationBarLight: true,
    // Add explicit setting for Android permissions
    useLegacyStorage: true,
    // Add the Network Security Config
    overrideNetworkSecurityConfig: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    Network: {
      enabled: true
    },
    FileOpener: {
      enabled: true
    },
    Permissions: {
      enabled: true,
      permissionRequestOrder: ["storage"]
    },
    Filesystem: {
      enabled: true,
      // Add Android permission options
      androidPermissions: [
        "READ_EXTERNAL_STORAGE", 
        "WRITE_EXTERNAL_STORAGE",
        "MANAGE_EXTERNAL_STORAGE"
      ]
    },
    FilePicker: {
      enabled: true
    }
  },
  // Use the exact package name as configured in Google API Console
  appUrlScheme: 'app.lovable.moneyminder',
  ios: {
    contentInset: 'always'
  }
};

export default config;
