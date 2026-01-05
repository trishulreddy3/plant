import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'super_admin' | 'plant_admin' | 'technician' | 'management' | 'admin' | 'superadmin' | 'plantadmin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  companyName?: string;
  companyId?: string;
  name?: string;
}

export interface TableConfig {
  tableNumber: number;
  topRowPanels: number;
  bottomRowPanels: number;
}

export interface Company {
  id: string;
  name: string;
  plantPowerKW: number;
  panelVoltage: number;
  panelCurrent: number;
  totalTables: number;
  panelsPerTable: number;
  topRowPanels: number;
  bottomRowPanels: number;
  tableConfigs: TableConfig[];
  adminEmail: string;
  adminPassword: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, companyName?: string) => Promise<boolean>;
  logout: () => void;
  companies: Company[];
  addCompany: (company: Company) => void;
  updateCompany: (id: string, company: Partial<Company>) => void;
  updateTableConfig: (companyId: string, tableNumber: number, topRowPanels: number, bottomRowPanels: number) => void;
  addTable: (companyId: string, topRowPanels: number, bottomRowPanels: number) => void;
  deleteTable: (companyId: string, tableNumber: number) => void;
  deleteCompany: (companyId: string, superAdminPassword: string) => boolean;
  deleteUser: (companyName: string, userEmail: string, adminPassword: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize with Super Admin and sample data
const SUPER_ADMIN: User = {
  id: 'super-admin-1',
  email: 'admin@pm.com',
  role: 'superadmin',
  name: 'Super Admin',
  companyName: 'PM'
};

const createDefaultTableConfigs = (totalTables: number, topRowPanels: number, bottomRowPanels: number): TableConfig[] => {
  return Array.from({ length: totalTables }, (_, index) => ({
    tableNumber: index + 1,
    topRowPanels,
    bottomRowPanels
  }));
};

const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-1',
    name: 'SolarTech Solutions',
    plantPowerKW: 5000,
    panelVoltage: 48,
    panelCurrent: 104.17,
    totalTables: 50,
    panelsPerTable: 40,
    topRowPanels: 20,
    bottomRowPanels: 20,
    tableConfigs: createDefaultTableConfigs(50, 20, 20),
    adminEmail: 'admin@solartech.com',
    adminPassword: 'admin123'
  },
  {
    id: 'comp-2',
    name: 'GreenEnergy Corp',
    plantPowerKW: 3000,
    panelVoltage: 48,
    panelCurrent: 62.5,
    totalTables: 30,
    panelsPerTable: 40,
    topRowPanels: 20,
    bottomRowPanels: 20,
    tableConfigs: createDefaultTableConfigs(30, 20, 20),
    adminEmail: 'admin@greenenergy.com',
    adminPassword: 'admin123'
  }
];

// Demo users for testing
const seedDemoUsers = () => {
  const demoUsers = [
    {
      id: 'user-demo-1',
      name: 'John Doe',
      email: 'john.doe@solartech.com',
      password: 'user123',
      role: 'technician',
      companyName: 'SolarTech Solutions',
      createdAt: new Date().toISOString()
    },
    {
      id: 'user-demo-2',
      name: 'Jane Smith',
      email: 'jane.smith@greenenergy.com',
      password: 'user123',
      role: 'technician',
      companyName: 'GreenEnergy Corp',
      createdAt: new Date().toISOString()
    }
  ];

  // User seeding now handled by backend API
  console.log('User seeding handled by backend API');
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);

  useEffect(() => {
    // Load companies from backend API instead of localStorage
    const loadCompanies = async () => {
      try {
        const { getAllCompanies } = await import('@/lib/realFileSystem');
        const backendCompanies = await getAllCompanies();
        // Adapt backend CompanyFolder -> local Company shape
        const mapped: Company[] = backendCompanies.map((c: any) => ({
          id: c.id,
          name: c.name,
          plantPowerKW: c.plantPowerKW ?? 0,
          panelVoltage: c.voltagePerPanel ?? 0,
          panelCurrent: c.currentPerPanel ?? 0,
          totalTables: c.totalTables ?? 0,
          panelsPerTable: 0,
          topRowPanels: 0,
          bottomRowPanels: 0,
          tableConfigs: [],
          adminEmail: '',
          adminPassword: ''
        }));
        setCompanies(mapped);

        // CHECK: If user is logged in, verify their company still exists
        const currentUser = user; // Capture current user for the check
        if (currentUser && currentUser.role !== 'super_admin' && currentUser.companyId) {
          const companyExists = backendCompanies.some((c: any) => c.id === currentUser.companyId || (currentUser.companyName && c.name?.toLowerCase() === currentUser.companyName.toLowerCase()));

          if (!companyExists) {
            console.warn('[AuthContext] User company no longer exists. Logging out.');
            import('@/lib/auth').then(({ logout }) => logout());

            // Show toast via window dispatch if toast hook is not available here or use a simple alert
            // Since we are in Context, we can't easily rely on hook inside non-hook function comfortably without passing it in.
            // We'll rely on the logout redirect to login page.
            // But let's try to notify.
            const event = new CustomEvent('company-deleted-logout');
            window.dispatchEvent(event);
          }
        }

      } catch (error) {
        console.error('Error loading companies from backend:', error);
        // Fallback to initial companies
        setCompanies(INITIAL_COMPANIES);
      }
    };

    loadCompanies();

    // Poll every 10 seconds to ensure validity
    const interval = setInterval(loadCompanies, 10000);
    return () => clearInterval(interval);

  }, [user]); // Add user dependency so it re-checks when user changes or login happens

  // Companies are now managed by backend API, no localStorage needed

  const login = async (email: string, password: string, companyName?: string): Promise<boolean> => {
    // Validate input
    if (!email || !password) {
      console.log('Login failed: Missing email or password');
      return false;
    }

    console.log('Login attempt:', { email, password, companyName });

    // Check Super Admin (frontend only)
    if (email === SUPER_ADMIN.email && password === 'superadmin123') {
      // For super admin, company name should be 'pm' (lowercase)
      if (companyName && companyName.toLowerCase() !== 'pm') {
        console.log('Super admin login failed: Invalid company name');
        return false;
      }
      console.log('Super admin login successful');
      setUser(SUPER_ADMIN);
      return true;
    }

    // For plant admins and users, use backend API
    if (companyName) {
      try {
        const { getApiBaseUrl } = await import('@/lib/realFileSystem');
        const API_BASE_URL = getApiBaseUrl();
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            companyName: companyName.toLowerCase()
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('Backend login successful:', data.user);
            setUser(data.user);
            return true;
          }
        } else {
          const errorData = await response.json();
          console.log('Backend login failed:', errorData.error);
        }
      } catch (error) {
        console.error('Error calling backend login:', error);
      }
    }

    console.log('Login failed: No matching credentials found');
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const addCompany = (company: Company) => {
    console.log('AuthContext: Adding company:', company);
    console.log('AuthContext: Company tableConfigs:', company.tableConfigs);
    setCompanies(prev => {
      const newCompanies = [...prev, company];
      console.log('AuthContext: Updated companies list:', newCompanies);
      return newCompanies;
    });
  };

  const updateCompany = (id: string, updatedData: Partial<Company>) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updatedData } : c));
  };

  const updateTableConfig = (companyId: string, tableNumber: number, topRowPanels: number, bottomRowPanels: number) => {
    console.log(`Updating table config: Company ${companyId}, Table ${tableNumber}, Top: ${topRowPanels}, Bottom: ${bottomRowPanels}`);

    setCompanies(prev => prev.map(company => {
      if (company.id === companyId) {
        const updatedTableConfigs = company.tableConfigs.map(config =>
          config.tableNumber === tableNumber
            ? { ...config, topRowPanels, bottomRowPanels }
            : config
        );

        const updatedCompany = {
          ...company,
          tableConfigs: updatedTableConfigs,
          totalTables: updatedTableConfigs.length // Update total tables count
        };
        console.log(`Updated company ${company.name} table configs:`, updatedTableConfigs);
        return updatedCompany;
      }
      return company;
    }));
  };

  const addTable = (companyId: string, topRowPanels: number, bottomRowPanels: number) => {
    console.log(`Adding new table to company ${companyId} with ${topRowPanels} top + ${bottomRowPanels} bottom panels`);

    setCompanies(prev => prev.map(company => {
      if (company.id === companyId) {
        const newTableNumber = company.tableConfigs.length + 1;
        const newTableConfig = {
          tableNumber: newTableNumber,
          topRowPanels,
          bottomRowPanels
        };

        const updatedTableConfigs = [...company.tableConfigs, newTableConfig];

        const updatedCompany = {
          ...company,
          tableConfigs: updatedTableConfigs,
          totalTables: updatedTableConfigs.length
        };

        console.log(`Added table ${newTableNumber} to company ${company.name}. New table count: ${updatedTableConfigs.length}`);
        return updatedCompany;
      }
      return company;
    }));
  };

  const deleteTable = (companyId: string, tableNumber: number) => {
    console.log(`Deleting table ${tableNumber} from company ${companyId}`);

    setCompanies(prev => prev.map(company => {
      if (company.id === companyId) {
        // Remove the table config
        const updatedTableConfigs = company.tableConfigs.filter(config => config.tableNumber !== tableNumber);

        // Renumber remaining tables to be sequential
        const renumberedConfigs = updatedTableConfigs.map((config, index) => ({
          ...config,
          tableNumber: index + 1
        }));

        const updatedCompany = {
          ...company,
          tableConfigs: renumberedConfigs,
          totalTables: renumberedConfigs.length
        };

        console.log(`Deleted table ${tableNumber} from company ${company.name}. New table count: ${renumberedConfigs.length}`);
        return updatedCompany;
      }
      return company;
    }));
  };

  const deleteCompany = (companyId: string, superAdminPassword: string): boolean => {
    // Verify super admin password
    if (superAdminPassword !== 'superadmin123') {
      return false;
    }

    // Find the company to delete
    const companyToDelete = companies.find(c => c.id === companyId);
    if (!companyToDelete) {
      return false;
    }

    // Remove company from companies list
    setCompanies(prev => prev.filter(c => c.id !== companyId));

    // User deletion now handled by backend API

    console.log(`Company ${companyToDelete.name} deleted by Super Admin`);
    return true;
  };

  const deleteUser = (companyName: string, userEmail: string, adminPassword: string): boolean => {
    // Find the company and verify admin password
    const company = companies.find(c => c.name === companyName);
    if (!company || company.adminPassword !== adminPassword) {
      return false;
    }

    // User deletion now handled by backend API

    console.log(`User ${userEmail} deleted from ${companyName} by Plant Admin`);
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, companies, addCompany, updateCompany, updateTableConfig, addTable, deleteTable, deleteCompany, deleteUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
