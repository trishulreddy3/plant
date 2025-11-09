/**
 * Cookie Management Utility
 * 
 * Handles cookie consent, preferences, and compliance with GDPR/CCPA
 */

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface CookieInfo {
  name: string;
  purpose: string;
  category: keyof CookiePreferences;
  expires: string;
  domain?: string;
}

// Cookie information for transparency
export const COOKIE_INFO: CookieInfo[] = [
  // Necessary Cookies
  {
    name: 'connect.sid',
    purpose: 'Session management and authentication',
    category: 'necessary',
    expires: 'Session'
  },
  {
    name: 'csrf-token',
    purpose: 'CSRF protection and security',
    category: 'necessary',
    expires: 'Session'
  },
  {
    name: 'auth-token',
    purpose: 'JWT authentication token',
    category: 'necessary',
    expires: '24 hours'
  },
  
  // Functional Cookies
  {
    name: 'user-preferences',
    purpose: 'Store user interface preferences',
    category: 'functional',
    expires: '1 year'
  },
  {
    name: 'language',
    purpose: 'Remember user language preference',
    category: 'functional',
    expires: '1 year'
  },
  {
    name: 'theme',
    purpose: 'Remember user theme preference',
    category: 'functional',
    expires: '1 year'
  },
  
  // Analytics Cookies
  {
    name: '_ga',
    purpose: 'Google Analytics - distinguish users',
    category: 'analytics',
    expires: '2 years'
  },
  {
    name: '_ga_*',
    purpose: 'Google Analytics - session state',
    category: 'analytics',
    expires: '2 years'
  },
  {
    name: '_gid',
    purpose: 'Google Analytics - distinguish users',
    category: 'analytics',
    expires: '24 hours'
  },
  
  // Marketing Cookies
  {
    name: '_fbp',
    purpose: 'Facebook Pixel - track conversions',
    category: 'marketing',
    expires: '3 months'
  },
  {
    name: '_gcl_au',
    purpose: 'Google Ads - conversion tracking',
    category: 'marketing',
    expires: '3 months'
  }
];

// Default preferences
const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false
};

// Storage keys
const CONSENT_KEY = 'cookie-consent';
const PREFERENCES_KEY = 'cookie-preferences';

/**
 * Get stored cookie preferences
 */
export const getCookiePreferences = (): CookiePreferences => {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error reading cookie preferences:', error);
  }
  return DEFAULT_PREFERENCES;
};

/**
 * Save cookie preferences
 */
export const saveCookiePreferences = (preferences: CookiePreferences): void => {
  try {
    // Check if localStorage is available
    if (typeof window === 'undefined' || !window.localStorage) {
      console.error('localStorage not available');
      return;
    }
    
    console.log('💾 Saving cookie preferences:', preferences);
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    localStorage.setItem(CONSENT_KEY, 'true');
    console.log('✅ Cookie consent saved to localStorage');
    
    // Verify the save worked
    const savedConsent = localStorage.getItem(CONSENT_KEY);
    const savedPrefs = localStorage.getItem(PREFERENCES_KEY);
    console.log('🔍 Verification - Consent:', savedConsent, 'Preferences:', savedPrefs);
    
    // Apply preferences immediately
    applyCookiePreferences(preferences);
  } catch (error) {
    console.error('Error saving cookie preferences:', error);
  }
};

/**
 * Check if user has given consent
 */
export const hasConsent = (): boolean => {
  try {
    // Check if localStorage is available
    if (typeof window === 'undefined' || !window.localStorage) {
      console.log('🔍 localStorage not available');
      return false;
    }
    
    const consent = localStorage.getItem(CONSENT_KEY);
    console.log('🔍 Checking consent:', consent, 'key:', CONSENT_KEY);
    
    // Also check if preferences exist as a backup
    const preferences = localStorage.getItem(PREFERENCES_KEY);
    console.log('🔍 Checking preferences:', preferences);
    
    return consent === 'true';
  } catch (error) {
    console.error('Error checking consent:', error);
    return false;
  }
};

/**
 * Apply cookie preferences
 */
export const applyCookiePreferences = (preferences: CookiePreferences): void => {
  // Enable/disable analytics based on preferences
  if (preferences.analytics) {
    enableAnalytics();
  } else {
    disableAnalytics();
  }
  
  // Enable/disable marketing based on preferences
  if (preferences.marketing) {
    enableMarketing();
  } else {
    disableMarketing();
  }
  
  // Functional cookies are always enabled if user consented
  if (preferences.functional) {
    enableFunctional();
  }
  
  console.log('Cookie preferences applied:', preferences);
};

/**
 * Enable analytics cookies and tracking
 */
const enableAnalytics = (): void => {
  // Google Analytics initialization
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: 'granted'
    });
  }
  
  // Set analytics cookie
  setCookie('analytics-enabled', 'true', 365);
};

/**
 * Disable analytics cookies and tracking
 */
const disableAnalytics = (): void => {
  // Google Analytics opt-out
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: 'denied'
    });
  }
  
  // Remove analytics cookies
  removeCookie('analytics-enabled');
  removeCookie('_ga');
  removeCookie('_ga_*');
  removeCookie('_gid');
};

/**
 * Enable marketing cookies and tracking
 */
const enableMarketing = (): void => {
  // Facebook Pixel initialization
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('consent', 'grant');
  }
  
  // Google Ads consent
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'update', {
      ad_storage: 'granted'
    });
  }
  
  // Set marketing cookie
  setCookie('marketing-enabled', 'true', 365);
};

/**
 * Disable marketing cookies and tracking
 */
const disableMarketing = (): void => {
  // Facebook Pixel opt-out
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('consent', 'revoke');
  }
  
  // Google Ads opt-out
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'update', {
      ad_storage: 'denied'
    });
  }
  
  // Remove marketing cookies
  removeCookie('marketing-enabled');
  removeCookie('_fbp');
  removeCookie('_gcl_au');
};

/**
 * Enable functional cookies
 */
const enableFunctional = (): void => {
  setCookie('functional-enabled', 'true', 365);
};

/**
 * Set a cookie
 */
const setCookie = (name: string, value: string, days: number): void => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax${
    process.env.NODE_ENV === 'production' ? ';Secure' : ''
  }`;
};

/**
 * Remove a cookie
 */
const removeCookie = (name: string): void => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

/**
 * Get all cookies
 */
export const getAllCookies = (): Record<string, string> => {
  const cookies: Record<string, string> = {};
  
  if (typeof document !== 'undefined') {
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
  }
  
  return cookies;
};

/**
 * Clear all non-necessary cookies
 */
export const clearNonNecessaryCookies = (): void => {
  const preferences = getCookiePreferences();
  
  if (!preferences.functional) {
    removeCookie('functional-enabled');
    removeCookie('user-preferences');
    removeCookie('language');
    removeCookie('theme');
  }
  
  if (!preferences.analytics) {
    disableAnalytics();
  }
  
  if (!preferences.marketing) {
    disableMarketing();
  }
};

/**
 * Reset all cookie preferences
 */
export const resetCookiePreferences = (): void => {
  console.log('🔄 Resetting cookie preferences');
  localStorage.removeItem(CONSENT_KEY);
  localStorage.removeItem(PREFERENCES_KEY);
  clearNonNecessaryCookies();
  console.log('✅ Cookie preferences reset');
};

/**
 * Clear cookie consent (for testing)
 */
export const clearCookieConsent = (): void => {
  console.log('🧹 Clearing cookie consent');
  localStorage.removeItem(CONSENT_KEY);
  localStorage.removeItem(PREFERENCES_KEY);
  console.log('✅ Cookie consent cleared');
};

/**
 * Get cookie consent banner visibility
 */
export const shouldShowConsentBanner = (): boolean => {
  const consent = hasConsent();
  console.log('🍪 shouldShowConsentBanner - hasConsent:', consent, 'shouldShow:', !consent);
  return !consent;
};

/**
 * Initialize cookie management
 */
export const initializeCookieManagement = (): void => {
  if (hasConsent()) {
    const preferences = getCookiePreferences();
    applyCookiePreferences(preferences);
  }
};

// Type declarations for global objects
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}
