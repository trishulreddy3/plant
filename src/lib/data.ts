// Data management for tables and panels

// Activity logging system for super admin monitoring
export interface ActivityLog {
  id: string;
  companyId: string;
  companyName: string;
  action: 'create' | 'update' | 'delete';
  entityType: 'table' | 'panel' | 'user' | 'company';
  entityId: string;
  entityName: string;
  details: string;
  timestamp: string;
  adminEmail: string;
}

// Activity logs now handled by backend API
export const getActivityLogs = (): ActivityLog[] => {
  return [];
};

export const saveActivityLogs = (logs: ActivityLog[]) => {
};

export const addActivityLog = (
  companyId: string,
  companyName: string,
  action: 'create' | 'update' | 'delete',
  entityType: 'table' | 'panel' | 'user' | 'company',
  entityId: string,
  entityName: string,
  details: string,
  adminEmail: string
) => {
};

export const getActivityLogsByCompany = (companyId: string): ActivityLog[] => {
  return [];
};

export interface Table {
  id: string;
  serialNumber: string;
  companyId: string;
  panelCount: number;
  createdAt: string;
}

export interface Panel {
  id: string;
  tableId: string;
  companyId: string;
  name: string; // p1, p2, p3, etc.
  position: string; // Position of the panel ('Main', 'top', 'bottom')
  maxVoltage: number; // 40V
  maxCurrent: number; // 10A
  currentVoltage: number;
  currentCurrent: number;
  powerGenerated: number; // Calculated: V * I
  status: 'good' | 'moderate' | 'bad';
  state?: 'good' | 'moderate' | 'bad'; // New simulation state from backend
  faultTimestamp?: string;
  lastUpdated: string;
}

// Tables now handled by backend API
export const getTables = (): Table[] => {
  return [];
};

export const saveTables = (tables: Table[]) => {
};

export const addTable = (companyId: string, panelCount: number, adminEmail?: string): Table => {
  const tables = getTables();
  const serialNumber = `Node-${String(tables.length + 1).padStart(3, '0')}`;

  const newTable: Table = {
    id: `table-${Date.now()}`,
    serialNumber,
    companyId,
    panelCount,
    createdAt: new Date().toISOString(),
  };

  return newTable;
};

export const getTablesByCompany = (companyId: string): Table[] => {
  return getTables().filter(t => t.companyId === companyId);
};

// Panels now handled by backend API
export const getPanels = (): Panel[] => {
  return [];
};

export const savePanels = (panels: Panel[]) => {
};

export const createPanel = (tableId: string, companyId: string, index: number, position: string): Panel => {
  // Generate random realistic data for demo
  const maxVoltage = 40;
  const maxCurrent = 10;
  const currentVoltage = 35 + Math.random() * 5; // 35-40V
  const currentCurrent = 8 + Math.random() * 2; // 8-10A
  const powerGenerated = currentVoltage * currentCurrent;

  let status: 'good' | 'moderate' | 'bad';
  if (powerGenerated >= 320) status = 'good';
  else if (powerGenerated >= 200) status = 'moderate';
  else status = 'bad';

  return {
    id: `panel-${tableId}-${position}-${index}`,
    tableId,
    companyId,
    name: `P${index}`,
    position,
    maxVoltage,
    maxCurrent,
    currentVoltage: Math.round(currentVoltage * 10) / 10,
    currentCurrent: Math.round(currentCurrent * 10) / 10,
    powerGenerated: Math.round(powerGenerated * 10) / 10,
    status,
    lastUpdated: new Date().toISOString(),
  };
};

export const getPanelsByCompany = (companyId: string): Panel[] => {
  return getPanels().filter(p => p.companyId === companyId);
};

export const getPanelsByTable = (tableId: string): Panel[] => {
  return getPanels().filter(p => p.tableId === tableId);
};

export const updatePanelData = (panelId: string) => {
};

// Migrate existing panels to include position field
export const migratePanels = () => {
};

// Initialize demo data if needed
export const initializeDemoData = () => {
};
