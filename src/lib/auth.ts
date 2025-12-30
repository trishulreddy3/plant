// Client-side authentication utilities
// ⚠️ WARNING: This is for demo purposes only. Use proper backend auth in production.

export type UserRole = 'super_admin' | 'plant_admin' | 'technician' | 'management' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  companyName?: string;
  companyId?: string;
  createdAt: string;
  sessionId?: number;
}

export interface Company {
  id: string;
  name: string;
  plantPowerKW: number;
  panelVoltage: number;
  panelCurrent: number;
  totalTables: number;
  adminId: string;
  createdAt: string;
}

// Super Admin credentials Removed - using backend auth


// Session-based user management with persistent storage
let currentUser: User | null = null;

// Load user from localStorage on initialization
const loadStoredUser = (): User | null => {
  try {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // Check if the stored user is still valid (not expired)
      const now = new Date().getTime();
      const storedTime = new Date(user.loginTime).getTime();
      const hoursSinceLogin = (now - storedTime) / (1000 * 60 * 60);

      // If login was more than 24 hours ago, consider it expired
      if (hoursSinceLogin > 24) {
        localStorage.removeItem('currentUser');
        return null;
      }

      return user;
    }
  } catch (error) {
    console.error('Error loading stored user:', error);
    localStorage.removeItem('currentUser');
  }
  return null;
};

// Initialize with stored user
currentUser = loadStoredUser();

export const getCurrentUser = (): User | null => {
  return currentUser;
};

export const setCurrentUser = (user: User | null) => {
  currentUser = user;

  if (user) {
    // Add login timestamp
    const userWithTimestamp = {
      ...user,
      loginTime: new Date().toISOString()
    };

    // Store user in localStorage for persistence
    localStorage.setItem('currentUser', JSON.stringify(userWithTimestamp));

    // Also set a secure cookie for additional security
    const cookieExpiry = new Date();
    cookieExpiry.setTime(cookieExpiry.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
    document.cookie = `auth_token=${user.id};expires=${cookieExpiry.toUTCString()};path=/;secure;samesite=strict`;
  } else {
    // Clear stored data on logout
    localStorage.removeItem('currentUser');
    document.cookie = 'auth_token=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
  }
};

// checkBackendCredentials removed as we now call the API directly in login()


// This will be replaced in next steps after verifying server.js
// Only replacing to avoid error, but I will do the comprehensive refactor in next steps.
// Use checkBackendCredentials logic which I will REWRITE to use the API directly.
export const login = async (email: string, password: string, companyName?: string, selectedRole?: 'admin' | 'technician' | 'management'): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    // Use the backend API directly via realFileSystem or fetch
    // I will implement a direct API call here since checkBackendCredentials is convoluted

    const { getApiBaseUrl } = await import('./realFileSystem');
    const API_BASE_URL = getApiBaseUrl();

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, companyName, role: selectedRole })
    });

    const data = await response.json();

    if (data.success && data.user) {
      // Map backend user to frontend User type if needed
      const user: User = {
        id: data.user.id || data.user.userId,
        email: data.user.email,
        role: data.user.role,
        companyName: data.user.companyName,
        companyId: data.user.companyId,
        createdAt: new Date().toISOString(),
        sessionId: data.user.sessionId
      };

      // Legacy mapping: if role is 'admin' and not super admin, map to 'plant_admin'?
      // The frontend expects 'plant_admin' in some places?
      // Let's check UserRole type: 'super_admin' | 'plant_admin' | 'technician' | 'management' | 'admin'
      // If backend returns 'admin', we might want to keep it or map it.
      // UnifiedLogin handles: super_admin, plant_admin, technician, management.
      // Server returns: 'super_admin', 'admin', 'management', 'technician'.

      if (user.role === 'admin') {
        if (user.email === 'superadmin@gmail.com' || user.companyName === 'microsyslogic') {
          user.role = 'super_admin';
        } else {
          user.role = 'plant_admin';
        }
      }

      setCurrentUser(user);
      return { success: true, user };
    }

    return { success: false, error: data.error || data.message || 'Login failed' };
  } catch (error) {
    console.error('❌ Login error:', error);
    return { success: false, error: 'Login failed. Please try again.' };
  }
};

export const logout = async () => {
  const user = getCurrentUser();

  // Clear data immediately to prevent race conditions during navigation
  clearAllStoredData();
  currentUser = null;

  if (user) {
    try {
      // Import dynamically to avoid circular dependencies
      const { getApiBaseUrl } = await import('./realFileSystem');
      const API_BASE_URL = getApiBaseUrl();

      // Send logout request to backend (fire and forget)
      fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, sessionId: user.sessionId })
      }).catch(e => console.warn('Logout backend call failed', e));

      console.log(`[LOGOUT] Session ${user?.sessionId} closed for ${user?.id}`);
    } catch (e) {
      console.warn('Logout setup failed', e);
    }
  }
};

// Check if user is already logged in (for auto-login)
export const isLoggedIn = (): boolean => {
  return currentUser !== null;
};

// Get stored credentials for auto-fill (optional)
export const getStoredCredentials = (): { email: string; password: string } | null => {
  try {
    const stored = localStorage.getItem('rememberedCredentials');
    console.log('🔐 Remember Me: Loading stored credentials:', stored ? 'Found' : 'Not found');
    if (stored) {
      const credentials = JSON.parse(stored);
      console.log('🔐 Remember Me: Loaded credentials for:', credentials.email);
      return credentials;
    }
  } catch (error) {
    console.error('Error loading stored credentials:', error);
  }
  return null;
};

// Store credentials for auto-fill (optional - user choice)
export const storeCredentials = (email: string, password: string, remember: boolean) => {
  console.log('🔐 Remember Me: Storing credentials:', { email, remember });
  if (remember) {
    try {
      localStorage.setItem('rememberedCredentials', JSON.stringify({ email, password }));
      console.log('🔐 Remember Me: Credentials stored successfully');
    } catch (error) {
      console.error('Error storing credentials:', error);
    }
  } else {
    localStorage.removeItem('rememberedCredentials');
    console.log('🔐 Remember Me: Credentials removed');
  }
};

// Clear all stored data (for logout)
export const clearAllStoredData = () => {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('rememberedCredentials');
  document.cookie = 'auth_token=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
};

// Company management
// Company management now handled by backend API
// These functions are deprecated - use realFileSystem.ts instead
export const getCompanies = (): Company[] => {
  console.warn('getCompanies() is deprecated. Use getAllCompanies() from realFileSystem.ts instead.');
  return [];
};

export const saveCompanies = (companies: Company[]) => {
  console.warn('saveCompanies() is deprecated. Companies are managed by backend API.');
};

export const addCompany = (company: Omit<Company, 'id' | 'createdAt'>): Company => {
  console.warn('addCompany() is deprecated. Use backend API instead.');
  return {
    ...company,
    id: `company-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
};

// Plant Admin management
interface PlantAdmin {
  id: string;
  email: string;
  password: string;
  companyId: string;
  createdAt: string;
}

// Plant Admin and User management now handled by backend API
// These functions are deprecated - use realFileSystem.ts instead
export const getPlantAdmins = (): PlantAdmin[] => {
  console.warn('getPlantAdmins() is deprecated. Use backend API instead.');
  return [];
};

export const savePlantAdmins = (admins: PlantAdmin[]) => {
  console.warn('savePlantAdmins() is deprecated. Use backend API instead.');
};

export const addPlantAdmin = (email: string, password: string, companyId: string): PlantAdmin => {
  console.warn('addPlantAdmin() is deprecated. Use backend API instead.');
  return {
    id: `admin-${Date.now()}`,
    email,
    password,
    companyId,
    createdAt: new Date().toISOString(),
  };
};

// User management
interface StoredUser {
  id: string;
  email: string;
  password: string;
  companyId: string;
  createdAt: string;
}

export const getUsers = (): StoredUser[] => {
  console.warn('getUsers() is deprecated. Use getUsers() from realFileSystem.ts instead.');
  return [];
};

export const saveUsers = (users: StoredUser[]) => {
  console.warn('saveUsers() is deprecated. Use backend API instead.');
};

export const addUser = (email: string, companyId: string): { user: StoredUser; password: string } => {
  console.warn('addUser() is deprecated. Use backend API instead.');
  const password = generatePassword();
  const newUser: StoredUser = {
    id: `user-${Date.now()}`,
    email,
    password,
    companyId,
    createdAt: new Date().toISOString(),
  };
  return { user: newUser, password };
};

export const deleteUser = (userId: string): boolean => {
  console.warn('deleteUser() is deprecated. Use backend API instead.');
  return false;
};

const generatePassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};
