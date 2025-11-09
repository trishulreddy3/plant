/**
 * Cookie Debug Utility
 * 
 * Add this to your browser console to inspect cookies
 */

// Cookie inspection functions
window.cookieDebug = {
  // View all cookies
  getAllCookies: () => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        acc[name] = decodeURIComponent(value);
      }
      return acc;
    }, {});
    console.table(cookies);
    return cookies;
  },

  // View specific cookie
  getCookie: (name) => {
    const value = document.cookie
      .split(';')
      .find(cookie => cookie.trim().startsWith(`${name}=`))
      ?.split('=')[1];
    console.log(`${name}:`, value ? decodeURIComponent(value) : 'Not found');
    return value ? decodeURIComponent(value) : null;
  },

  // View cookie preferences from localStorage
  getPreferences: () => {
    const preferences = localStorage.getItem('cookie-preferences');
    console.log('Cookie Preferences:', preferences ? JSON.parse(preferences) : 'Not set');
    return preferences ? JSON.parse(preferences) : null;
  },

  // Check if user has given consent
  hasConsent: () => {
    const consent = localStorage.getItem('cookie-consent');
    console.log('Has Consent:', consent === 'true');
    return consent === 'true';
  },

  // View all localStorage items
  getLocalStorage: () => {
    const items = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        items[key] = localStorage.getItem(key);
      }
    }
    console.table(items);
    return items;
  },

  // Clear all non-necessary cookies
  clearNonNecessary: () => {
    const necessaryCookies = ['connect.sid', 'csrf-token', 'auth-token'];
    const allCookies = document.cookie.split(';');
    
    allCookies.forEach(cookie => {
      const name = cookie.trim().split('=')[0];
      if (name && !necessaryCookies.includes(name)) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
        console.log(`Cleared cookie: ${name}`);
      }
    });
  },

  // Set a test cookie
  setTestCookie: (name, value, days = 1) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;`;
    console.log(`Set cookie: ${name}=${value}`);
  },

  // Help
  help: () => {
    console.log(`
🍪 Cookie Debug Utility Commands:

cookieDebug.getAllCookies()     - View all cookies in a table
cookieDebug.getCookie('name')   - View specific cookie
cookieDebug.getPreferences()    - View cookie preferences
cookieDebug.hasConsent()        - Check if user gave consent
cookieDebug.getLocalStorage()   - View all localStorage items
cookieDebug.clearNonNecessary() - Clear non-essential cookies
cookieDebug.setTestCookie('name', 'value', days) - Set test cookie
cookieDebug.help()              - Show this help

Example:
cookieDebug.getAllCookies()
cookieDebug.getCookie('connect.sid')
cookieDebug.getPreferences()
    `);
  }
};

// Auto-run help on load
console.log('🍪 Cookie Debug Utility loaded! Type cookieDebug.help() for commands.');





