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
  console.warn('getActivityLogs() is deprecated. Use backend API instead.');
  return [];
};

export const saveActivityLogs = (logs: ActivityLog[]) => {
  console.warn('saveActivityLogs() is deprecated. Use backend API instead.');
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
  const logs = getActivityLogs();
  const newLog: ActivityLog = {
    id: `log-${Date.now()}`,
    companyId,
    companyName,
    action,
    entityType,
    entityId,
    entityName,
    details,
    timestamp: new Date().toISOString(),
    adminEmail,
  };
  
  logs.unshift(newLog); // Add to beginning for latest first
  saveActivityLogs(logs);
};

export const getActivityLogsByCompany = (companyId: string): ActivityLog[] => {
  return getActivityLogs().filter(log => log.companyId === companyId);
};

export interface Table {
  id: string;
  serialNumber: string;
  companyId: string;
  panelsTop: number;
  panelsBottom: number;
  createdAt: string;
}

export interface Panel {
  id: string;
  tableId: string;
  companyId: string;
  name: string; // p1, p2, p3, etc.
  position: 'top' | 'bottom'; // Position of the panel
  maxVoltage: number; // 40V
  maxCurrent: number; // 10A
  currentVoltage: number;
  currentCurrent: number;
  powerGenerated: number; // Calculated: V * I
  status: 'good' | 'average' | 'fault';
  state?: 'good' | 'repairing' | 'fault'; // New simulation state from backend
  lastUpdated: string;
}

// Tables now handled by backend API
export const getTables = (): Table[] => {
  console.warn('getTables() is deprecated. Use backend API instead.');
  return [];
};

export const saveTables = (tables: Table[]) => {
  console.warn('saveTables() is deprecated. Use backend API instead.');
};

export const addTable = (companyId: string, panelsTop: number, panelsBottom: number, adminEmail?: string): Table => {
  const tables = getTables();
  const serialNumber = `TBL-${String(tables.length + 1).padStart(4, '0')}`;
  
  const newTable: Table = {
    id: `table-${Date.now()}`,
    serialNumber,
    companyId,
    panelsTop,
    panelsBottom,
    createdAt: new Date().toISOString(),
  };
  
  tables.push(newTable);
  saveTables(tables);
  
  // Create panels for this table
  const panels: Panel[] = [];
  
  // Create top panels
  for (let i = 1; i <= panelsTop; i++) {
    panels.push(createPanel(newTable.id, companyId, i, 'top'));
  }
  
  // Create bottom panels
  for (let i = 1; i <= panelsBottom; i++) {
    panels.push(createPanel(newTable.id, companyId, i, 'bottom'));
  }
  
  savePanels([...getPanels(), ...panels]);
  
  // Log activity for super admin monitoring
  if (adminEmail) {
    addActivityLog(
      companyId,
      '', // Company name will be filled by caller
      'create',
      'table',
      newTable.id,
      newTable.serialNumber,
      `Created table with ${panelsTop + panelsBottom} panels (${panelsTop} top, ${panelsBottom} bottom)`,
      adminEmail
    );
  }
  
  return newTable;
};

export const getTablesByCompany = (companyId: string): Table[] => {
  return getTables().filter(t => t.companyId === companyId);
};

// Panels now handled by backend API
export const getPanels = (): Panel[] => {
  console.warn('getPanels() is deprecated. Use backend API instead.');
  return [];
};

export const savePanels = (panels: Panel[]) => {
  console.warn('savePanels() is deprecated. Use backend API instead.');
};

export const createPanel = (tableId: string, companyId: string, index: number, position: 'top' | 'bottom'): Panel => {
  // Generate random realistic data for demo
  const maxVoltage = 40;
  const maxCurrent = 10;
  const currentVoltage = 35 + Math.random() * 5; // 35-40V
  const currentCurrent = 8 + Math.random() * 2; // 8-10A
  const powerGenerated = currentVoltage * currentCurrent;
  
  let status: 'good' | 'average' | 'fault';
  if (powerGenerated >= 320) status = 'good';
  else if (powerGenerated >= 200) status = 'average';
  else status = 'fault';
  
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
  const panels = getPanels();
  const panelIndex = panels.findIndex(p => p.id === panelId);
  
  if (panelIndex === -1) return;
  
  const panel = panels[panelIndex];
  const currentVoltage = 35 + Math.random() * 5;
  const currentCurrent = 8 + Math.random() * 2;
  const powerGenerated = currentVoltage * currentCurrent;
  
  let status: 'good' | 'average' | 'fault';
  if (powerGenerated >= 320) status = 'good';
  else if (powerGenerated >= 200) status = 'average';
  else status = 'fault';
  
  panels[panelIndex] = {
    ...panel,
    currentVoltage: Math.round(currentVoltage * 10) / 10,
    currentCurrent: Math.round(currentCurrent * 10) / 10,
    powerGenerated: Math.round(powerGenerated * 10) / 10,
    status,
    lastUpdated: new Date().toISOString(),
  };
  
  savePanels(panels);
};

// Migrate existing panels to include position field
export const migratePanels = () => {
  const panels = getPanels();
  const needsMigration = panels.some(panel => !('position' in panel));
  
  if (needsMigration) {
    const migratedPanels = panels.map(panel => {
      if (!('position' in panel)) {
        // For existing panels, we'll assume they're top panels
        // In a real scenario, you might want to ask the admin to reconfigure
        return { ...panel, position: 'top' as const };
      }
      return panel;
    });
    savePanels(migratedPanels);
  }
};

// Initialize demo data if needed
export const initializeDemoData = () => {
  // Migrate existing panels first
  migratePanels();
  
  const panels = getPanels();
  if (panels.length === 0) {
    // Create a demo table with 20 panels for the first company if it exists
    const tables = getTables();
    if (tables.length === 0) {
      // Will be initialized when company is created
    }
  }
};
