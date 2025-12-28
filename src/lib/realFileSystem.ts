// this file handles all the network calls to our backend server.
// it's where we fetch company data, update panels, manage staff etc.

// figure out where our API server is actually sitting
export const getApiBaseUrl = () => {
  // if we set a specific URL in .env, use that first
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // in dev, try to hit the local server
  if (import.meta.env.DEV) {
    return 'http://localhost:5000/api';
  }

  // default for production (Render)
  return 'https://plant-9uk7.onrender.com/api';
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

    const headers: HeadersInit = { ...options.headers };
    if (options.body) headers['Content-Type'] = 'application/json';

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      markRequestFailed(endpoint);
      throw new Error(`API failed: ${response.status}`);
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

export const getAllCompanies = async (): Promise<CompanyFolder[]> => {
  return await apiCall('/companies');
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

export const addTableToPlant = async (companyId: string, panelsTop: number, panelsBottom: number) => {
  return await apiCall(`/companies/${companyId}/tables`, {
    method: 'POST',
    body: JSON.stringify({ panelsTop, panelsBottom }),
  });
};

export const updateTableInPlant = async (companyId: string, tableId: string, top: number, bottom: number, sn?: string) => {
  return await apiCall(`/companies/${companyId}/tables/${tableId}`, {
    method: 'PUT',
    body: JSON.stringify({ panelsTop: top, panelsBottom: bottom, serialNumber: sn }),
  });
};

export const updatePlantSettings = async (companyId: string, v: number, c: number) => {
  return await apiCall(`/companies/${companyId}/plant`, {
    method: 'PUT',
    body: JSON.stringify({ voltagePerPanel: v, currentPerPanel: c }),
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

export const getPlantDetails = async (companyId: string): Promise<PlantDetails | null> => {
  try {
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

export const deleteCompanyFolder = async (companyId: string) => {
  return await apiCall(`/companies/${companyId}`, { method: 'DELETE' });
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

export const resolvePanel = async (companyId: string, tableId: string, position: 'top' | 'bottom', index: number) => {
  return await apiCall(`/companies/${companyId}/resolve-panel`, {
    method: 'PUT',
    body: JSON.stringify({ tableId, position, index }),
  });
};

export const getNodeFaultStatus = async (companyId: string) => {
  return await apiCall(`/companies/${companyId}/node-fault-status`);
};

export const getNodeFaultHistory = async (companyId: string) => {
  return await apiCall(`/companies/${companyId}/node-fault-history`);
};

export const setPanelCurrent = async (
  companyId: string, tableId: string, position: 'top' | 'bottom',
  index: number, current: number, propagate?: boolean, voltage?: number
) => {
  return await apiCall(`/companies/${companyId}/panels/current`, {
    method: 'PUT',
    body: JSON.stringify({ tableId, position, index, current, propagateSeries: propagate, voltage })
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

export const addPanels = async (companyId: string, tableId: string, position: 'top' | 'bottom', panelCount: number): Promise<boolean> => {
  const res = await apiCall(`/companies/${companyId}/tables/${tableId}/add-panels`, {
    method: 'POST',
    body: JSON.stringify({ position, panelCount }),
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
  position: 'top' | 'bottom',
  panelIndex: number
): number => {
  const table = (plantDetails.live_data || []).find(t => t.id === tableId);
  if (!table) return 0;

  const vp = plantDetails.voltagePerPanel || 20;
  const voltages = table.panelVoltages || [];

  // Calculate index in flat array
  const topCount = table.panelsTop || Math.ceil(voltages.length / 2);
  let flatIndex = panelIndex;
  if (position === 'bottom') {
    flatIndex = topCount + panelIndex;
  }

  const voltage = voltages[flatIndex] || 0;
  return Math.round((voltage / vp) * 100);
};

// helper to categorize health into status buckets
export const getPanelStatus = (healthPercentage: number): 'good' | 'average' | 'fault' => {
  if (healthPercentage >= 98) return 'good';
  if (healthPercentage >= 50) return 'average';
  return 'fault';
};
