/**
 * Debug utility to test table creation issue
 * This helps identify where the panel count issue occurs
 */

export const debugTableCreation = async () => {
  console.log('=== DEBUG TABLE CREATION ===');
  
  // Check what's in backend API
  try {
    const { getAllCompanies } = await import('@/lib/realFileSystem');
    const companies = await getAllCompanies();
    console.log('Companies from backend:', companies.length);
    
    companies.forEach((company: any, index: number) => {
      console.log(`\nCompany ${index + 1}: ${company.name}`);
      console.log(`  ID: ${company.id}`);
      console.log(`  Total Tables: ${company.totalTables}`);
      console.log(`  Top Row Panels: ${company.topRowPanels}`);
      console.log(`  Bottom Row Panels: ${company.bottomRowPanels}`);
      console.log(`  Panels Per Table: ${company.panelsPerTable}`);
      console.log(`  Table Configs Length: ${company.tableConfigs?.length || 0}`);
      
      if (company.tableConfigs && company.tableConfigs.length > 0) {
        console.log(`  Table Configs:`, company.tableConfigs);
        company.tableConfigs.forEach((config: any) => {
          console.log(`    Table ${config.tableNumber}: ${config.topRowPanels} top + ${config.bottomRowPanels} bottom = ${config.topRowPanels + config.bottomRowPanels} total`);
        });
      } else {
        console.log(`  ❌ NO TABLE CONFIGS FOUND!`);
      }
    });
  } catch (error) {
    console.error('Error loading companies from backend:', error);
  }
  
  console.log('=== END DEBUG ===');
};

export const createTestCompany = () => {
  const testCompany = {
    id: `debug-test-${Date.now()}`,
    name: `Debug Test Company`,
    plantPowerKW: 1000,
    panelVoltage: 48,
    panelCurrent: 50,
    totalTables: 3,
    panelsPerTable: 16, // 8 + 8
    topRowPanels: 8,
    bottomRowPanels: 8,
    tableConfigs: [
      { tableNumber: 1, topRowPanels: 8, bottomRowPanels: 8 },
      { tableNumber: 2, topRowPanels: 8, bottomRowPanels: 8 },
      { tableNumber: 3, topRowPanels: 8, bottomRowPanels: 8 }
    ],
    adminEmail: 'debug@test.com',
    adminPassword: 'debug123'
  };
  
  console.log('Creating test company:', testCompany);
  return testCompany;
};
