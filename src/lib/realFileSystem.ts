// this file handles all the network calls to our backend server.
// it's where we fetch company data, update panels, manage staff etc.

// figure out where our API server is actually sitting
export const getApiBaseUrl = () => {
  // if we set a specific URL in .env, use that first
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Use relative path for both dev and prod
  // In dev, Vite proxy forwards /api/* to the backend
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// to stop the app from spamming the server when it's down
const failedRequests = new Set<string>();
const GLOBAL_FAILURE_THRESHOLD = 10;
const REQUEST_TIMEOUT = 15000;

export const resetCircuitBreaker = () => {
  failedRequests.clear();
};

const markRequestFailed = (endpoint: string): void => {
  failedRequests.add(endpoint);
};

const markRequestSuccess = (endpoint: string): void => {
  failedRequests.delete(endpoint);
};

// --- types ---

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
  role: 'admin' | 'technician' | 'management';
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
  live_data: any[]; // Changed from tables to live_data (Flat structure)
  tables?: any[]; // Shim for legacy components
  lastUpdated: string;
}

export interface PlantTable {
  id: string;
  serialNumber: string;
  // Flat schema fields
  node: string;
  time: string;
  temperature: number;
  lightIntensity: number;
  current: number;
  panelVoltages: number[];
  panelsCount: number;
  // Legacy fields removed from strict type but handled as any if needed in migration


}

export interface ResolvedTicket {
  id: string;
  trackId: string;
  fault: string;
  reason: string;
  category: 'BAD' | 'MODERATE';
  powerLoss: number;
  resolvedAt: string;
  resolvedBy: string;
}

// helper for fetching data with a timeout
async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const headers: HeadersInit = {};
    // Preserve any custom headers passed in options
    if (options.headers) {
      Object.assign(headers, options.headers);
    }
    if (options.body) headers['Content-Type'] = 'application/json';

    // Add JWT Token
    const token = localStorage.getItem('auth_token');
    if (token) {
      // @ts-ignore
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('[apiCall] No auth_token found in localStorage!');
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      markRequestFailed(endpoint);
      const errorData = await response.json().catch(() => ({}));

      // Handle Force Logout / Session Invalidation from backend
      // Handle Force Logout / Session Invalidation from backend
      if (response.status === 401) {
        const msg = errorData.error || 'something went wrong try to login again';
        console.warn(`[Auth] 401 Unauthorized: ${msg}`);

        // Remove stale data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('currentUser');

        // PREVENT LOOP: Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          console.log('[Auth] Redirecting to login...');
          window.location.href = `/login?error=${encodeURIComponent(msg)}`;
        }
      }

      const error = new Error(errorData.error || `API failed: ${response.status}`);
      // @ts-ignore
      error.status = response.status;
      // @ts-ignore
      error.data = errorData;
      throw error;
    }

    const data = await response.json();
    markRequestSuccess(endpoint);
    return data;
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      console.warn('Network issue:', error?.message);
    }
    throw error;
  }
}

export const getStaffEntries = async (companyId: string) => {
  return apiCall(`/companies/${companyId}/entries`);
};

// --- API Methods ---

// Super Admin: Get all blocked company admins
export const getBlockedAdmins = async (): Promise<any[]> => {
  try {
    return await apiCall('/superadmin/blocked-admins');
  } catch (error) {
    console.error('Error fetching blocked admins:', error);
    return [];
  }
};

export const getAllCompanies = async (): Promise<CompanyFolder[]> => {
  const data = await apiCall('/companies');
  // Map SQL backend fields to Frontend interface
  return data.map((c: any) => ({
    ...c,
    id: c.companyId || c.id,
    name: c.companyName || c.name,
    plantPowerKW: c.plantPowerKW,
    voltagePerPanel: c.voltagePerPanel,
    currentPerPanel: c.currentPerPanel,
    totalTables: c.totalTables || 0
  }));
};

export const createCompanyFolder = async (
  companyId: string, companyName: string,
  v: number, c: number, p: number,
  email: string, pass: string, name: string
) => {
  return await apiCall('/companies', {
    method: 'POST',
    body: JSON.stringify({ companyId, companyName, voltagePerPanel: v, currentPerPanel: c, plantPowerKW: p, adminEmail: email, adminPassword: pass, adminName: name }),
  });
};

export const addTableToPlant = async (companyId: string, panelCount: number, nodeName?: string, voltage?: number, current?: number) => {
  return await apiCall(`/companies/${companyId}/tables`, {
    method: 'POST',
    body: JSON.stringify({ panelCount, nodeName, voltage, current }),
  });
};

export const updateTableInPlant = async (companyId: string, tableId: string, panelCount: number, sn?: string, v?: number, c?: number) => {
  return await apiCall(`/companies/${companyId}/tables/${tableId}`, {
    method: 'PUT',
    body: JSON.stringify({ panelCount, serialNumber: sn, voltagePerPanel: v, currentPerPanel: c }),
  });
};

export const updatePlantSettings = async (companyId: string, v: number, c: number, p: number) => {
  return await apiCall(`/companies/${companyId}/plant`, {
    method: 'PUT',
    body: JSON.stringify({ voltagePerPanel: v, currentPerPanel: c, plantPowerKW: p }),
  });
};

export const deleteTableFromPlant = async (companyId: string, tableId: string) => {
  return await apiCall(`/companies/${companyId}/tables/${tableId}`, { method: 'DELETE' });
};

export const addStaffEntry = async (
  companyId: string, companyName: string, name: string,
  role: 'management' | 'admin' | 'technician',
  email: string, phone: string, pass: string, creator: string
) => {
  return await apiCall(`/companies/${companyId}/entries`, {
    method: 'POST',
    body: JSON.stringify({ companyName, name, role, email, phoneNumber: phone, password: pass, createdBy: creator }),
  });
};

export const updateStaffEntry = async (
  companyId: string, entryId: string, payload: any, force: boolean = false
) => {
  return await apiCall(`/companies/${companyId}/entries/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify({ ...payload, force }),
  });
};

export const deleteStaffEntry = async (companyId: string, entryId: string, force: boolean = false) => {
  return await apiCall(`/companies/${companyId}/entries/${entryId}?force=${force}`, {
    method: 'DELETE'
  });
};

export const getPlantDetails = async (companyId: string): Promise<PlantDetails | null> => {
  try {
    if (!companyId || companyId === 'undefined') return null;
    const data = await apiCall(`/companies/${companyId}`);
    if (data && data.live_data) {
      data.tables = data.live_data;
    }
    return data;
  } catch {
    return null;
  }
};

export const getTechnicians = async (companyId: string): Promise<UserCredentials[]> => {
  return await apiCall(`/companies/${companyId}/technicians`);
};

export const getManagement = async (companyId: string): Promise<UserCredentials[]> => {
  return await apiCall(`/companies/${companyId}/management`);
};

export const getAdminCredentials = async (companyId: string): Promise<AdminCredentials> => {
  return await apiCall(`/companies/${companyId}/admin`);
};

export const deleteCompanyFolder = async (companyId: string, superAdminPassword?: string, force: boolean = false) => {
  return await apiCall(`/companies/${companyId}?force=${force}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ superAdminPassword })
  });
};

export const getCompanySessionStatus = async (companyId: string): Promise<number> => {
  const res = await apiCall(`/companies/${companyId}/session-status`);
  return res.activeSessions || 0;
};

export const verifySuperAdminPassword = async (password: string): Promise<boolean> => {
  try {
    const res = await apiCall('/verify-super-admin-password', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    return res.success;
  } catch (e) {
    return false;
  }
};

export const createResolvedTicket = async (companyId: string, payload: any) => {
  return await apiCall(`/companies/${companyId}/tickets/resolve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const getResolvedTickets = async (companyId: string): Promise<ResolvedTicket[]> => {
  return await apiCall(`/companies/${companyId}/tickets?status=resolved`);
};

export const resolvePanel = async (companyId: string, tableId: string, position: string, index: number) => {
  return await apiCall(`/companies/${companyId}/resolve-panel`, {
    method: 'PUT',
    body: JSON.stringify({ tableId, position, index }),
  });
};

export const getNodeFaultStatus = async (companyId: string) => {
  return await apiCall(`/companies/${companyId}/node-fault-status`);
};

export const getFlatLiveData = async (companyId: string) => {
  return await apiCall(`/companies/${companyId}/live-data`);
};

export const getNodeFaultHistory = async (companyId: string) => {
  return await apiCall(`/companies/${companyId}/node-fault-history`);
};

export const setPanelCurrent = async (
  companyId: string, tableId: string, position: string,
  index: number, current: number, propagate?: boolean, voltage?: number,
  userEmail?: string, userRole?: string
) => {
  const headers: HeadersInit = {};
  if (userEmail) headers['x-user-email'] = userEmail;
  if (userRole) headers['x-user-role'] = userRole;

  return await apiCall(`/companies/${companyId}/panels/current`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ tableId, position, index, current, propagateSeries: propagate, voltage, userEmail, userRole })
  });
};

export const deletePanel = async (companyId: string, panelId: string) => {
  const tableId = panelId.split('-').slice(0, -2).join('-');
  const res = await apiCall(`/companies/${companyId}/tables/${tableId}/panels/${panelId}`, { method: 'DELETE' });
  return res.success;
};

export const refreshPanelData = async (companyId: string): Promise<boolean> => {
  const res = await apiCall(`/companies/${companyId}/refresh-panel-data`, { method: 'PUT' });
  return res.success;
};

export const addPanels = async (companyId: string, tableId: string, position: string, panelCount: number): Promise<boolean> => {
  const res = await apiCall(`/companies/${companyId}/tables/${tableId}/add-panels`, {
    method: 'POST',
    body: JSON.stringify({ position: 'default', panelCount }),
  });
  return res.success;
};

// legacy helpers
export const addUserToCompany = async (companyId: string, email: string, pass: string, role: any, creator: string) => {
  return await apiCall(`/companies/${companyId}/technicians`, {
    method: 'POST',
    body: JSON.stringify({ email, password: pass, role, createdBy: creator }),
  });
};

export const getUsers = async (companyId: string): Promise<UserCredentials[]> => {
  const data = await apiCall(`/companies/${companyId}/users`);
  const techs = Array.isArray(data?.technicians) ? data.technicians : [];
  const mgmt = Array.isArray(data?.management) ? data.management : [];
  return [...techs, ...mgmt];
};

export const checkServerStatus = async () => {
  try {
    await apiCall('/companies');
    return true;
  } catch {
    return false;
  }
};

export const updateStaffStatus = async (companyId: string, entryId: string, status: 'active' | 'blocked') => {
  return apiCall(`/companies/${companyId}/entries/${entryId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
};

// helper to get health % from the raw plant data
export const getPanelHealthPercentage = (
  plantDetails: PlantDetails,
  tableId: string,
  position?: string,
  panelIndex: number = 0
): number => {
  const table = (plantDetails.live_data || []).find(t => t.id === tableId);
  if (!table) return 0;

  const vp = plantDetails.voltagePerPanel || 20;
  const voltages = table.panelVoltages || [];

  // If position is provided (legacy), try to offset (though backend should flatten it now)
  // New backend uses flat 0..N, so if frontend passes 0..N, it works.
  // If frontend passes 'bottom' and index 0, we might need to know 'topCount' to offset.
  // But since we are removing top/bottom, let's assume raw index for now.
  // If legacy logic persists, we might look for 'panelsTop' property on table.
  const flatIndex = panelIndex;

  const voltage = voltages[flatIndex] || 0;
  return Math.round((voltage / vp) * 100);
};

// helper to categorize health into status buckets
export const getPanelStatus = (healthPercentage: number): 'good' | 'average' | 'fault' => {
  if (healthPercentage >= 98) return 'good';
  if (healthPercentage >= 50) return 'average';
  return 'fault';
};
