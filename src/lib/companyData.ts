// Company-specific data management for realistic solar power plant simulation

export interface CompanyData {
  id: string;
  name: string;
  voltagePerPanel: number; // Voltage per panel (e.g., 20V)
  currentPerPanel: number; // Current per panel (e.g., 10A)
  powerPerPanel: number; // Calculated power per panel (V * I)
  plantPowerKW: number; // Total plant power in kW
  createdAt: string;
  tables: CompanyTable[];
  users: CompanyUser[];
  adminDetails: CompanyAdmin;
}

export interface CompanyTable {
  id: string;
  serialNumber: string;
  panelsTop: number;
  panelsBottom: number;
  createdAt: string;
  // Realistic power data arrays
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

export interface CompanyUser {
  id: string;
  email: string;
  role: 'admin' | 'technician';
  createdAt: string;
  createdBy: string; // Admin email who created this user
}

export interface CompanyAdmin {
  email: string;
  name: string;
  createdAt: string;
}

// Generate realistic panel data based on company specifications
export const generatePanelData = (
  panelCount: number,
  voltagePerPanel: number,
  currentPerPanel: number
): { voltage: number[]; current: number[]; power: number[] } => {
  const voltage: number[] = [];
  const current: number[] = [];
  const power: number[] = [];

  for (let i = 0; i < panelCount; i++) {
    // Simulate realistic variations in solar panel performance
    // Voltage varies ±5% from nominal
    const voltageVariation = voltagePerPanel * (0.95 + Math.random() * 0.1);
    // Current varies ±10% from nominal (more affected by sunlight)
    const currentVariation = currentPerPanel * (0.9 + Math.random() * 0.2);
    
    const actualVoltage = Math.round(voltageVariation * 10) / 10;
    const actualCurrent = Math.round(currentVariation * 10) / 10;
    const actualPower = Math.round(actualVoltage * actualCurrent * 10) / 10;

    voltage.push(actualVoltage);
    current.push(actualCurrent);
    power.push(actualPower);
  }

  return { voltage, current, power };
};

// Get company data from localStorage
export const getCompanyData = (companyId: string): CompanyData | null => {
  console.warn('getCompanyData() is deprecated. Use backend API instead.');
  return null;
};

// Save company data to localStorage
export const saveCompanyData = (companyData: CompanyData) => {
  console.warn('saveCompanyData() is deprecated. Use backend API instead.');
};

// Create new company data structure
export const createCompanyData = (
  id: string,
  name: string,
  voltagePerPanel: number,
  currentPerPanel: number,
  adminEmail: string,
  adminName: string
): CompanyData => {
  const powerPerPanel = voltagePerPanel * currentPerPanel;
  
  const companyData: CompanyData = {
    id,
    name,
    voltagePerPanel,
    currentPerPanel,
    powerPerPanel,
    plantPowerKW: 0, // Will be calculated when tables are added
    createdAt: new Date().toISOString(),
    tables: [],
    users: [],
    adminDetails: {
      email: adminEmail,
      name: adminName,
      createdAt: new Date().toISOString(),
    },
  };

  saveCompanyData(companyData);
  return companyData;
};

// Add table to company data
export const addTableToCompany = (
  companyId: string,
  panelsTop: number,
  panelsBottom: number
): CompanyTable => {
  const companyData = getCompanyData(companyId);
  if (!companyData) {
    throw new Error('Company data not found');
  }

  const tableNumber = companyData.tables.length + 1;
  const serialNumber = `TBL-${String(tableNumber).padStart(4, '0')}`;

  // Generate realistic panel data
  const topPanelData = generatePanelData(panelsTop, companyData.voltagePerPanel, companyData.currentPerPanel);
  const bottomPanelData = generatePanelData(panelsBottom, companyData.voltagePerPanel, companyData.currentPerPanel);

  const newTable: CompanyTable = {
    id: `table-${Date.now()}`,
    serialNumber,
    panelsTop,
    panelsBottom,
    createdAt: new Date().toISOString(),
    topPanels: topPanelData,
    bottomPanels: bottomPanelData,
  };

  companyData.tables.push(newTable);
  
  // Update total plant power
  const totalPanels = companyData.tables.reduce((sum, table) => 
    sum + table.panelsTop + table.panelsBottom, 0
  );
  companyData.plantPowerKW = Math.round((totalPanels * companyData.powerPerPanel) / 1000 * 10) / 10;

  saveCompanyData(companyData);
  return newTable;
};

// Add user to company data
export const addUserToCompany = (
  companyId: string,
  email: string,
  role: 'admin' | 'user',
  createdBy: string
): CompanyUser => {
  const companyData = getCompanyData(companyId);
  if (!companyData) {
    throw new Error('Company data not found');
  }

  const newUser: CompanyUser = {
    id: `user-${Date.now()}`,
    email,
    role,
    createdAt: new Date().toISOString(),
    createdBy,
  };

  companyData.users.push(newUser);
  saveCompanyData(companyData);
  return newUser;
};

// Get all companies data
export const getAllCompaniesData = (): CompanyData[] => {
  const companies: CompanyData[] = [];
  
  // Company data now loaded from backend API
  console.warn('getAllCompaniesData() is deprecated. Use backend API instead.');
  
  return companies;
};

// Update panel data for realistic simulation
export const updatePanelDataRealistic = (companyId: string, tableId: string, position: 'top' | 'bottom', panelIndex: number) => {
  const companyData = getCompanyData(companyId);
  if (!companyData) return;

  const table = companyData.tables.find(t => t.id === tableId);
  if (!table) return;

  const panelData = position === 'top' ? table.topPanels : table.bottomPanels;
  
  // Simulate realistic variations (weather, time of day, etc.)
  const voltageVariation = companyData.voltagePerPanel * (0.95 + Math.random() * 0.1);
  const currentVariation = companyData.currentPerPanel * (0.9 + Math.random() * 0.2);
  
  const actualVoltage = Math.round(voltageVariation * 10) / 10;
  const actualCurrent = Math.round(currentVariation * 10) / 10;
  const actualPower = Math.round(actualVoltage * actualCurrent * 10) / 10;

  panelData.voltage[panelIndex] = actualVoltage;
  panelData.current[panelIndex] = actualCurrent;
  panelData.power[panelIndex] = actualPower;

  saveCompanyData(companyData);
};

// Get panel health percentage based on realistic power data
export const getPanelHealthPercentage = (
  companyData: CompanyData,
  tableId: string,
  position: 'top' | 'bottom',
  panelIndex: number
): number => {
  const table = companyData.tables.find(t => t.id === tableId);
  if (!table) return 0;

  const panelData = position === 'top' ? table.topPanels : table.bottomPanels;
  const actualPower = panelData.power[panelIndex];
  const expectedPower = companyData.powerPerPanel;
  
  return Math.round((actualPower / expectedPower) * 100);
};

// Get panel status based on health percentage
export const getPanelStatus = (healthPercentage: number): 'good' | 'average' | 'fault' => {
  if (healthPercentage >= 100) return 'good';
  if (healthPercentage >= 50) return 'average';
  return 'fault';
};

