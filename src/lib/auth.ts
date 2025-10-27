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

// Super Admin credentials (hardcoded for demo)
const SUPER_ADMIN = {
  email: 'super_admin@microsyslogic.com',
  password: 'super_admin_password',
  role: 'super_admin' as UserRole,
  companyName: 'microsyslogic',
};

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

// Check backend credentials
const checkBackendCredentials = async (email: string, password: string, companyName?: string, selectedRole?: 'admin' | 'technician' | 'management'): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    // Import the backend functions
    const { getAllCompanies, getAdminCredentials, getUsers } = await import('./realFileSystem');
    
    // Get all companies from backend
    const backendCompanies = await getAllCompanies();
    
    // Filter companies by name if provided
    const companiesToCheck = companyName 
      ? backendCompanies.filter(company => 
          company.name.toLowerCase() === companyName.toLowerCase()
        )
      : backendCompanies;
    
    // If company name was provided but no matching company found
    if (companyName && companiesToCheck.length === 0) {
      return { success: false, error: 'Company not found' };
    }
    
    // Check each company for matching credentials
    for (const company of companiesToCheck) {
      try {
        // If role is selected, check only that role
        if (selectedRole === 'admin') {
          // Check admin credentials
          const adminCreds = await getAdminCredentials(company.id);
          if (adminCreds && adminCreds.email === email && adminCreds.password === password) {
            const user: User = {
              id: `admin-${company.id}`,
              email: adminCreds.email,
              role: 'plant_admin',
              companyName: company.name,
              companyId: company.id,
              createdAt: adminCreds.createdAt,
            };
            return { success: true, user };
          }
        } else if (selectedRole === 'technician') {
          // Check technician credentials
          const technicians = await getUsers(company.id);
          const foundUser = technicians.find(t => t.email === email && t.password === password);
          if (foundUser) {
            const user: User = {
              id: foundUser.id,
              email: foundUser.email,
              role: 'technician',
              companyName: company.name,
              companyId: company.id,
              createdAt: foundUser.createdAt,
            };
            return { success: true, user };
          }
        } else if (selectedRole === 'management') {
          // Check management credentials
          const technicians = await getUsers(company.id);
          const foundUser = technicians.find(t => t.email === email && t.password === password && t.role === 'management');
          if (foundUser) {
            const user: User = {
              id: foundUser.id,
              email: foundUser.email,
              role: 'management',
              companyName: company.name,
              companyId: company.id,
              createdAt: foundUser.createdAt,
            };
            return { success: true, user };
          }
        } else {
          // No role selected, check both
          // Check admin credentials first
          const adminCreds = await getAdminCredentials(company.id);
          if (adminCreds && adminCreds.email === email && adminCreds.password === password) {
            const user: User = {
              id: `admin-${company.id}`,
              email: adminCreds.email,
              role: 'plant_admin',
              companyName: company.name,
              companyId: company.id,
              createdAt: adminCreds.createdAt,
            };
            return { success: true, user };
          }
          
          // Check technician/management credentials
          const technicians = await getUsers(company.id);
          const foundUser = technicians.find(t => t.email === email && t.password === password);
          if (foundUser) {
            // Use the actual role from the found user (technician or management)
            const userRole = foundUser.role === 'management' ? 'management' : 'technician';
            const user: User = {
              id: foundUser.id,
              email: foundUser.email,
              role: userRole,
              companyName: company.name,
              companyId: company.id,
              createdAt: foundUser.createdAt,
            };
            return { success: true, user };
          }
        }
      } catch (error) {
        // Continue checking other companies if one fails
        console.warn(`Error checking company ${company.id}:`, error);
      }
    }
    
    return { success: false, error: selectedRole ? `Invalid ${selectedRole} credentials` : 'Invalid credentials' };
  } catch (error) {
    console.error('Backend credential check failed:', error);
    return { success: false, error: 'Backend authentication failed' };
  }
};

export const login = async (email: string, password: string, companyName?: string, selectedRole?: 'admin' | 'technician' | 'management'): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    // Check Super Admin (hardcoded)
    if (email === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
      // For super admin, company name should be 'microsyslogic' (case insensitive)
      if (companyName && companyName.toLowerCase() !== SUPER_ADMIN.companyName.toLowerCase()) {
        return { success: false, error: 'Invalid company name for super admin' };
      }
      
      const user: User = {
        id: 'super-admin-1',
        email: SUPER_ADMIN.email,
        role: 'super_admin',
        companyName: SUPER_ADMIN.companyName,
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(user);
      return { success: true, user };
    }

    // Check backend credentials first
    const backendResult = await checkBackendCredentials(email, password, companyName, selectedRole);
    if (backendResult.success) {
      setCurrentUser(backendResult.user);
      return { success: true, user: backendResult.user };
    }

    // Skip localStorage fallback - only use backend authentication
    return { success: false, error: selectedRole ? `Invalid ${selectedRole} credentials` : 'Invalid credentials' };
  } catch (error) {
    console.error('❌ Login error:', error);
    return { success: false, error: 'Login failed. Please try again.' };
  }
};

export const logout = () => {
  clearAllStoredData();
  currentUser = null;
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
