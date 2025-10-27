// File-based data management system for company folders
// Each company gets its own folder with separate data files

export interface CompanyFolder {
  id: string;
  name: string;
  folderPath: string;
  createdAt: string;
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

// Simulate file system operations using localStorage with folder structure
const COMPANY_FOLDERS_KEY = 'company_folders';
const FILE_SYSTEM_PREFIX = 'fs_';

// Get all company folders
// Company folders now managed by backend API
export const getCompanyFolders = (): CompanyFolder[] => {
  console.warn('getCompanyFolders() is deprecated. Use backend API instead.');
  return [];
};

// Save company folders list
export const saveCompanyFolders = (folders: CompanyFolder[]) => {
  console.warn('saveCompanyFolders() is deprecated. Use backend API instead.');
};

// Create company folder structure
export const createCompanyFolder = (
  companyId: string,
  companyName: string
): CompanyFolder => {
  const folderPath = `companies/${companyId}`;
  
  const folder: CompanyFolder = {
    id: companyId,
    name: companyName,
    folderPath,
    createdAt: new Date().toISOString(),
  };

  // Add to folders list
  const folders = getCompanyFolders();
  folders.push(folder);
  saveCompanyFolders(folders);

  return folder;
};

// File operations for company data
export const writeCompanyFile = (companyId: string, fileName: string, data: unknown) => {
  // File operations now handled by backend API
  console.warn('writeFile() is deprecated. Use backend API instead.');
};

export const readCompanyFile = (companyId: string, fileName: string): unknown => {
  console.warn('readCompanyFile() is deprecated. Use backend API instead.');
  return null;
};

export const deleteCompanyFile = (companyId: string, fileName: string) => {
  console.warn('deleteCompanyFile() is deprecated. Use backend API instead.');
};

// Admin credentials file operations
export const saveAdminCredentials = (companyId: string, admin: AdminCredentials) => {
  writeCompanyFile(companyId, 'admin.json', admin);
};

export const getAdminCredentials = (companyId: string): AdminCredentials | null => {
  const data = readCompanyFile(companyId, 'admin.json');
  return data as AdminCredentials | null;
};

// Users file operations
export const saveUsers = (companyId: string, users: UserCredentials[]) => {
  writeCompanyFile(companyId, 'users.json', users);
};

export const getUsers = (companyId: string): UserCredentials[] => {
  const users = readCompanyFile(companyId, 'users.json');
  return (users as UserCredentials[]) || [];
};

export const addUser = (companyId: string, user: UserCredentials) => {
  const users = getUsers(companyId);
  users.push(user);
  saveUsers(companyId, users);
};

export const getUserByEmail = (companyId: string, email: string): UserCredentials | null => {
  const users = getUsers(companyId);
  return users.find(user => user.email === email) || null;
};

// Plant details file operations
export const savePlantDetails = (companyId: string, plantDetails: PlantDetails) => {
  writeCompanyFile(companyId, 'plant_details.json', plantDetails);
};

export const getPlantDetails = (companyId: string): PlantDetails | null => {
  const data = readCompanyFile(companyId, 'plant_details.json');
  return data as PlantDetails | null;
};

export const addTableToPlant = (companyId: string, table: PlantTable) => {
  const plantDetails = getPlantDetails(companyId);
  if (!plantDetails) return;

  plantDetails.tables.push(table);
  
  // Don't override the specified plant power - keep the original value
  // The plant power is set during company creation and represents the total capacity
  plantDetails.lastUpdated = new Date().toISOString();

  savePlantDetails(companyId, plantDetails);
};

// Generate realistic panel data
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
    const voltageVariation = voltagePerPanel * (0.95 + Math.random() * 0.1);
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

// Create new plant table
export const createPlantTable = (
  companyId: string,
  panelsTop: number,
  panelsBottom: number
): PlantTable => {
  const plantDetails = getPlantDetails(companyId);
  if (!plantDetails) {
    throw new Error('Plant details not found for company');
  }

  const tableNumber = plantDetails.tables.length + 1;
  const serialNumber = `TBL-${String(tableNumber).padStart(4, '0')}`;

  // Generate realistic panel data
  const topPanelData = generatePanelData(panelsTop, plantDetails.voltagePerPanel, plantDetails.currentPerPanel);
  const bottomPanelData = generatePanelData(panelsBottom, plantDetails.voltagePerPanel, plantDetails.currentPerPanel);

  const newTable: PlantTable = {
    id: `table-${Date.now()}`,
    serialNumber,
    panelsTop,
    panelsBottom,
    createdAt: new Date().toISOString(),
    topPanels: topPanelData,
    bottomPanels: bottomPanelData,
  };

  addTableToPlant(companyId, newTable);
  return newTable;
};

// Get all companies with their basic info
export const getAllCompanies = () => {
  const folders = getCompanyFolders();
  return folders.map(folder => {
    const plantDetails = getPlantDetails(folder.id);
    return {
      id: folder.id,
      name: folder.name,
      folderPath: folder.folderPath,
      createdAt: folder.createdAt,
      plantPowerKW: plantDetails?.plantPowerKW || 0,
      voltagePerPanel: plantDetails?.voltagePerPanel || 0,
      currentPerPanel: plantDetails?.currentPerPanel || 0,
      totalTables: plantDetails?.tables.length || 0,
    };
  });
};

// Delete entire company folder
export const deleteCompanyFolder = (companyId: string) => {
  // Remove from folders list
  const folders = getCompanyFolders();
  const updatedFolders = folders.filter(folder => folder.id !== companyId);
  saveCompanyFolders(updatedFolders);

  // Delete all company files
  const fileKeys = [
    `${FILE_SYSTEM_PREFIX}${companyId}_admin.json`,
    `${FILE_SYSTEM_PREFIX}${companyId}_users.json`,
    `${FILE_SYSTEM_PREFIX}${companyId}_plant_details.json`,
  ];

  // File cleanup now handled by backend API
  console.warn('cleanupCompanyFiles() is deprecated. Use backend API instead.');
};

// Update panel data for realistic simulation
export const updatePanelData = (
  companyId: string,
  tableId: string,
  position: 'top' | 'bottom',
  panelIndex: number
) => {
  const plantDetails = getPlantDetails(companyId);
  if (!plantDetails) return;

  const table = plantDetails.tables.find(t => t.id === tableId);
  if (!table) return;

  const panelData = position === 'top' ? table.topPanels : table.bottomPanels;
  
  // Simulate realistic variations
  const voltageVariation = plantDetails.voltagePerPanel * (0.95 + Math.random() * 0.1);
  const currentVariation = plantDetails.currentPerPanel * (0.9 + Math.random() * 0.2);
  
  const actualVoltage = Math.round(voltageVariation * 10) / 10;
  const actualCurrent = Math.round(currentVariation * 10) / 10;
  const actualPower = Math.round(actualVoltage * actualCurrent * 10) / 10;

  panelData.voltage[panelIndex] = actualVoltage;
  panelData.current[panelIndex] = actualCurrent;
  panelData.power[panelIndex] = actualPower;

  plantDetails.lastUpdated = new Date().toISOString();
  savePlantDetails(companyId, plantDetails);
};

// Get panel health percentage
export const getPanelHealthPercentage = (
  companyId: string,
  tableId: string,
  position: 'top' | 'bottom',
  panelIndex: number
): number => {
  const plantDetails = getPlantDetails(companyId);
  if (!plantDetails) return 0;

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
