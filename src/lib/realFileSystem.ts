// Real file system operations using backend API
// This creates actual physical folders and files on the system

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // Check for custom API URL from environment variable (highest priority)
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log('🔧 Using VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    console.log('🔧 Using development URL: localhost:5000');
    return 'http://localhost:5000/api';
  }
  
  // For production, use the production API URL
  console.log('🔧 Using production URL: plant-9uk7.onrender.com');
  return 'https://plant-9uk7.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔧 API Base URL:', API_BASE_URL);

// Debug logging
console.log('🔧 API Configuration:', {
  isDev: import.meta.env.DEV,
  viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  resolvedApiBaseUrl: API_BASE_URL
});

// Circuit breaker to prevent infinite retries
const failedRequests = new Set<string>();
const MAX_FAILED_ATTEMPTS = 3; // Increased back to 3
const GLOBAL_FAILURE_THRESHOLD = 10; // Increased threshold
const REQUEST_TIMEOUT = 15000; // 15 seconds timeout
const RETRY_DELAY = 5000; // 5 seconds delay before retry

// Helper function to reset circuit breaker (for debugging)
export const resetCircuitBreaker = () => {
  failedRequests.clear();
  console.log('🔄 Circuit breaker reset');
};

// Helper function to check circuit breaker status
export const getCircuitBreakerStatus = () => {
  return {
    failedEndpoints: Array.from(failedRequests),
    totalFailures: failedRequests.size,
    isGlobalBreakerActive: failedRequests.size >= GLOBAL_FAILURE_THRESHOLD
  };
};

// Enhanced API call function with better timeout handling
const shouldSkipRequest = (endpoint: string): boolean => {
  // Skip if this specific endpoint has failed
  if (failedRequests.has(endpoint)) {
    return true;
  }
  
  // Skip if too many total failures (global circuit breaker)
  if (failedRequests.size >= GLOBAL_FAILURE_THRESHOLD) {
    console.warn(`🚫 Global circuit breaker activated. Total failures: ${failedRequests.size}`);
    return true;
  }
  
  return false;
};

// Helper function to mark request as failed
const markRequestFailed = (endpoint: string): void => {
  failedRequests.add(endpoint);
  console.warn(`🚫 Marking endpoint as failed: ${endpoint}. Total failed: ${failedRequests.size}`);
  
  // If we hit the global threshold, log a warning
  if (failedRequests.size >= GLOBAL_FAILURE_THRESHOLD) {
    console.error(`🚨 GLOBAL CIRCUIT BREAKER ACTIVATED! Too many failed requests (${failedRequests.size}). Stopping all API calls.`);
  }
};

// Helper function to mark request as successful
const markRequestSuccess = (endpoint: string): void => {
  failedRequests.delete(endpoint);
  console.log(`✅ Marking endpoint as successful: ${endpoint}. Remaining failures: ${failedRequests.size}`);
};

export interface CompanyFolder {
  id: string;
  name: string;
  folderPath: string;
  createdAt: string;
  plantPowerKW: number;
  voltagePerPanel: number;
  currentPerPanel: number;
  totalTables: number;
}

export interface AdminCredentials {
  email: string;
  password: string;
  name: string;
  createdAt: string;
}

export interface UserCredentials {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'technician';
  createdAt: string;
  createdBy: string;
}

export interface PlantDetails {
  companyId: string;
  companyName: string;
  voltagePerPanel: number;
  currentPerPanel: number;
  powerPerPanel: number;
  plantPowerKW: number;
  tables: PlantTable[];
  createdAt: string;
  lastUpdated: string;
}

export interface PlantTable {
  id: string;
  serialNumber: string;
  panelsTop: number;
  panelsBottom: number;
  createdAt: string;
  topPanels: {
    voltage: number[];
    current: number[];
    power: number[];
  };
  bottomPanels: {
    voltage: number[];
    current: number[];
    power: number[];
  };
}

// API helper function with timeout
async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    // Temporarily disable circuit breaker for testing
    // if (shouldSkipRequest(endpoint)) {
    //   console.warn(`🚫 Skipping request to ${endpoint} due to circuit breaker`);
    //   throw new Error(`Request skipped due to circuit breaker: ${endpoint}`);
    // }

    const url = `${API_BASE_URL}${endpoint}`;
    console.log('🌐 Making API call to:', url);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT); // Use configurable timeout
    
    // Only set Content-Type for requests with a body
    const headers: HeadersInit = {
      ...options.headers,
    };
    
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);
    console.log('📡 API response status:', response.status, response.statusText);

    if (!response.ok) {
      markRequestFailed(endpoint);
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📦 API response data:', data);
    
    // Mark as successful to reset circuit breaker
    markRequestSuccess(endpoint);
    return data;
  } catch (error) {
    console.error('❌ API call error:', error);
    if (error.name === 'AbortError') {
      console.error('⏰ Request timed out');
      markRequestFailed(endpoint);
    }
    throw error;
  }
}

// Get all companies with their folder information
export const getAllCompanies = async (): Promise<CompanyFolder[]> => {
  return await apiCall('/companies');
};

// Create company folder with all necessary files
export const createCompanyFolder = async (
  companyId: string,
  companyName: string,
  voltagePerPanel: number,
  currentPerPanel: number,
  plantPowerKW: number,
  adminEmail: string,
  adminPassword: string,
  adminName: string
): Promise<{ success: boolean; message: string; companyPath: string }> => {
  return await apiCall('/companies', {
    method: 'POST',
    body: JSON.stringify({
      companyId,
      companyName,
      voltagePerPanel,
      currentPerPanel,
      plantPowerKW,
      adminEmail,
      adminPassword,
      adminName,
    }),
  });
};

// Add table to company plant details
export const addTableToPlant = async (
  companyId: string,
  panelsTop: number,
  panelsBottom: number
): Promise<{ success: boolean; message: string; table: PlantTable }> => {
  return await apiCall(`/companies/${companyId}/tables`, {
    method: 'POST',
    body: JSON.stringify({
      panelsTop,
      panelsBottom,
    }),
  });
};

// Add staff entry to company
export const addStaffEntry = async (
  companyId: string,
  companyName: string,
  name: string,
  role: 'management' | 'admin' | 'technician',
  email: string,
  phoneNumber: string,
  password: string,
  createdBy: string
): Promise<{ success: boolean; message: string; entry: any }> => {
  return await apiCall(`/companies/${companyId}/entries`, {
    method: 'POST',
    body: JSON.stringify({
      companyName,
      name,
      role,
      email,
      phoneNumber,
      password,
      createdBy,
    }),
  });
};

// Add technician to company
export const addTechnicianToCompany = async (
  companyId: string,
  email: string,
  password: string,
  role: 'admin' | 'technician',
  createdBy: string
): Promise<{ success: boolean; message: string; technician: UserCredentials }> => {
  return await apiCall(`/companies/${companyId}/technicians`, {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      role,
      createdBy,
    }),
  });
};

// Legacy function name for backward compatibility
export const addUserToCompany = async (
  companyId: string,
  email: string,
  password: string,
  role: 'admin' | 'technician',
  createdBy: string
): Promise<{ success: boolean; message: string; user: UserCredentials }> => {
  const result = await addTechnicianToCompany(companyId, email, password, role, createdBy);
  return { ...result, user: result.technician };
};

// Get plant details for a company
export const getPlantDetails = async (companyId: string): Promise<PlantDetails | null> => {
  try {
    return await apiCall(`/companies/${companyId}`);
  } catch (error) {
    console.error(`Error loading plant details for company ${companyId}:`, error);
    // Return null instead of throwing to prevent infinite loops
    return null;
  }
};

// Get technicians for a company
export const getTechnicians = async (companyId: string): Promise<UserCredentials[]> => {
  return await apiCall(`/companies/${companyId}/technicians`);
};

// Legacy function name for backward compatibility
export const getUsers = async (companyId: string): Promise<UserCredentials[]> => {
  return getTechnicians(companyId);
};

// Get admin credentials for a company
export const getAdminCredentials = async (companyId: string): Promise<AdminCredentials> => {
  return await apiCall(`/companies/${companyId}/admin`);
};

// Delete entire company folder
export const deleteCompanyFolder = async (companyId: string): Promise<{ success: boolean; message: string }> => {
  return await apiCall(`/companies/${companyId}`, {
    method: 'DELETE',
  });
};

// Check if backend server is running
export const checkServerStatus = async (): Promise<boolean> => {
  const maxRetries = 2; // Reduced from 3 to prevent infinite loops
  const retryDelay = 1000; // 1 second
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Checking server status (attempt ${attempt}/${maxRetries}) at:`, `${API_BASE_URL}/companies`);
      const result = await apiCall('/companies');
      console.log('✅ Server status check successful:', result);
      return true;
    } catch (error) {
      console.error(`❌ Server status check failed (attempt ${attempt}/${maxRetries}):`, error);
      
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  console.error('❌ All server status check attempts failed');
  return false;
};

// Get panel health percentage from plant details
export const getPanelHealthPercentage = (
  plantDetails: PlantDetails,
  tableId: string,
  position: 'top' | 'bottom',
  panelIndex: number
): number => {
  const table = plantDetails.tables.find(t => t.id === tableId);
  if (!table) return 0;

  const panelData = position === 'top' ? table.topPanels : table.bottomPanels;
  const actualPower = panelData.power[panelIndex];
  const expectedPower = plantDetails.powerPerPanel;
  
  return Math.round((actualPower / expectedPower) * 100);
};

// Get panel status based on health percentage
export const getPanelStatus = (healthPercentage: number): 'good' | 'average' | 'fault' => {
  if (healthPercentage >= 100) return 'good';
  if (healthPercentage >= 50) return 'average';
  return 'fault';
};

export const deletePanel = async (companyId: string, panelId: string): Promise<boolean> => {
  try {
    const API_BASE_URL = getApiBaseUrl();
    
    // Extract tableId from panelId (format: tableId-position-index)
    const tableId = panelId.split('-').slice(0, -2).join('-');
    
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/tables/${tableId}/panels/${panelId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete panel: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error deleting panel:', error);
    return false;
  }
};

export const refreshPanelData = async (companyId: string): Promise<boolean> => {
  try {
    const API_BASE_URL = getApiBaseUrl();
    
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/refresh-panel-data`, {
      method: 'PUT',
      // Don't set Content-Type for requests without body
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh panel data: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error refreshing panel data:', error);
    return false;
  }
};

// Add panels to existing table
export const addPanels = async (companyId: string, tableId: string, position: 'top' | 'bottom', panelCount: number): Promise<boolean> => {
  try {
    const response = await apiCall(`/companies/${companyId}/tables/${tableId}/add-panels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ position, panelCount }),
    });

    if (response.success) {
      console.log(`✅ Added ${panelCount} panel(s) to ${position} side of table ${tableId}`);
      return true;
    } else {
      console.error('Failed to add panels:', response.error);
      return false;
    }
  } catch (error) {
    console.error('Error adding panels:', error);
    return false;
  }
};

// Debug utilities for production troubleshooting
if (typeof window !== 'undefined') {
  // Make circuit breaker functions available in browser console
  (window as any).resetCircuitBreaker = resetCircuitBreaker;
  (window as any).getCircuitBreakerStatus = getCircuitBreakerStatus;
  (window as any).testApiConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies`);
      console.log('✅ API Connection Test:', response.status, response.statusText);
      return { success: true, status: response.status };
    } catch (error) {
      console.error('❌ API Connection Test Failed:', error);
      return { success: false, error: error.message };
    }
  };
}

