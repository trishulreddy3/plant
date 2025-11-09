import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const TableCreationTest = () => {
  const { companies, addCompany } = useAuth();
  const [testResult, setTestResult] = useState<string>('');

  const checkBackendData = () => {
    // Companies now loaded from backend API
    console.log('Companies from backend:', companies);
    companies.forEach((company: any, index: number) => {
      console.log(`Company ${index + 1}: ${company.name}`);
      console.log(`  - ID: ${company.id}`);
      console.log(`  - Tables: ${company.tables?.length || 0}`);
    });
  };

  const runTest = () => {
    console.log('=== TABLE CREATION TEST ===');
    
    // Test data with different values to make it obvious
    const testCompany = {
      id: `test-${Date.now()}`,
      name: `Test Company ${Date.now()}`,
      plantPowerKW: 1000,
      panelVoltage: 48,
      panelCurrent: 50,
      totalTables: 2,
      panelsPerTable: 14, // 7 + 7
      topRowPanels: 7,
      bottomRowPanels: 7,
      tableConfigs: Array.from({ length: 2 }, (_, index) => ({
        tableNumber: index + 1,
        topRowPanels: 7,
        bottomRowPanels: 7
      })),
      adminEmail: 'test@test.com',
      adminPassword: 'test123'
    };

    console.log('Creating test company:', testCompany);
    console.log('Expected: 2 tables, each with 7+7=14 panels');
    console.log('Total expected panels:', 2 * 14, '= 28 panels');
    console.log('Table configs being created:', testCompany.tableConfigs);

    addCompany(testCompany);

    // Check if company was added correctly
    setTimeout(() => {
      const addedCompany = companies.find(c => c.id === testCompany.id);
      if (addedCompany) {
        console.log('Company found in state:', addedCompany);
        console.log('Table configs:', addedCompany.tableConfigs);
        
        const result = `
Test Results:
- Company Name: ${addedCompany.name}
- Total Tables: ${addedCompany.totalTables}
- Top Row Panels: ${addedCompany.topRowPanels}
- Bottom Row Panels: ${addedCompany.bottomRowPanels}
- Table Configs Length: ${addedCompany.tableConfigs?.length || 0}
- Table Configs: ${JSON.stringify(addedCompany.tableConfigs, null, 2)}
        `;
        
        setTestResult(result);
      } else {
        setTestResult('ERROR: Company not found after adding!');
      }
    }, 100);
  };

  return (
    <Card className="p-6 m-4">
      <h3 className="text-lg font-bold mb-4">Table Creation Debug Test</h3>
      
      <div className="flex gap-2 mb-4">
        <Button onClick={runTest}>
          Run Table Creation Test
        </Button>
        <Button onClick={checkBackendData} variant="outline">
          Check Backend Data
        </Button>
      </div>
      
      {testResult && (
        <div className="bg-gray-100 p-4 rounded">
          <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
        </div>
      )}
      
      <div className="mt-4">
        <h4 className="font-semibold mb-2">Current Companies:</h4>
        {companies.map(company => (
          <div key={company.id} className="mb-2 p-2 bg-blue-50 rounded">
            <p><strong>{company.name}</strong></p>
            <p>Tables: {company.totalTables}, Top: {company.topRowPanels}, Bottom: {company.bottomRowPanels}</p>
            <p>Configs: {company.tableConfigs?.length || 0} items</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TableCreationTest;
