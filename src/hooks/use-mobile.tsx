
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

/**
 * Reliably detects if the application is running in a Capacitor native environment.
 * This function ensures type safety with optional chaining.
 * @returns boolean True if running in a Capacitor native app, false otherwise
 */
export function isNativeApp(): boolean {
  try {
    // Add detailed logging for debugging
    const hasCapacitorObject = typeof window !== 'undefined' && window?.Capacitor !== undefined;
    const hasIsNativePlatformFunction = hasCapacitorObject && typeof window?.Capacitor?.isNativePlatform === 'function';
    const isNativePlatformResult = hasIsNativePlatformFunction && window?.Capacitor?.isNativePlatform?.();
    
    // Log detailed platform detection information
    console.log('Platform detection details:', {
      hasCapacitorObject,
      hasIsNativePlatformFunction,
      isNativePlatformResult,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'undefined'
    });
    
    return !!isNativePlatformResult;
  } catch (error) {
    console.error("Error detecting platform:", error);
    return false; // Default to false on error
  }
}
