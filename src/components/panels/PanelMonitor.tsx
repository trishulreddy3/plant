import React, { useState, useEffect, useMemo, useCallback } from 'react';
import SolarPanel from './SolarPanel';
import Timer from './Timer';
import { generateTestData, generateTestDataWithConfigs, setElapsedSeconds, Panel } from '../../utils/testDataGenerator';
import { useAuth } from '../../contexts/AuthContext';
import './PanelMonitor.css';

interface PanelMonitorProps {
  companyName: string;
}

interface EditablePanelMonitorProps extends PanelMonitorProps {
  isEditable?: boolean;
}

const PanelMonitor: React.FC<PanelMonitorProps> = ({ companyName }) => {
  const { companies, user, updateTableConfig, addTable, deleteTable } = useAuth();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [faultyPanels, setFaultyPanels] = useState(new Set());
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
  const [editingTable, setEditingTable] = useState<number | null>(null);
  
  // Get company data
  const company = companies.find(c => c.name === companyName);
  const totalTables = company?.totalTables || 4; // Default to 4 if not found
  
  // Debug company data
  console.log('PanelMonitor: Looking for company:', companyName);
  console.log('PanelMonitor: Available companies:', companies.map(c => c.name));
  console.log('PanelMonitor: Found company:', company);
  if (company) {
    console.log('PanelMonitor: Company totalTables:', company.totalTables);
    console.log('PanelMonitor: Company topRowPanels:', company.topRowPanels);
    console.log('PanelMonitor: Company bottomRowPanels:', company.bottomRowPanels);
    console.log('PanelMonitor: Company tableConfigs:', company.tableConfigs);
  }
  
  // Check if current user can edit (Plant Admin only, not Super Admin)
  const canEdit = user?.role === 'plantadmin' && user?.companyName === companyName;

  // Get table configuration for a specific table
  const getTableConfig = useCallback((tableNumber: number) => {
    console.log(`Getting config for table ${tableNumber}, company:`, company?.name);
    console.log(`Available tableConfigs:`, company?.tableConfigs);
    
    const config = company?.tableConfigs?.find(tc => tc.tableNumber === tableNumber);
    if (config) {
      console.log(`Table ${tableNumber} config found:`, config);
      return config;
    }
    
    // If no specific config found, use company defaults
    const topPanels = company?.topRowPanels ?? 20;
    const bottomPanels = company?.bottomRowPanels ?? 20;
    
    const fallback = { 
      tableNumber, 
      topRowPanels: topPanels, 
      bottomRowPanels: bottomPanels 
    };
    
    console.log(`Table ${tableNumber} using fallback:`, fallback);
    console.log(`Company has topRowPanels: ${company?.topRowPanels} (${typeof company?.topRowPanels}), bottomRowPanels: ${company?.bottomRowPanels} (${typeof company?.bottomRowPanels})`);
    console.log(`Using fallback values: top=${topPanels}, bottom=${bottomPanels}`);
    
    return fallback;
  }, [company?.tableConfigs, company?.topRowPanels, company?.bottomRowPanels, company?.name]);

  // Handle panel removal from specific row for a specific table
  const handleRemoveFromRow = useCallback((tableNumber: number, isTopRow: boolean) => {
    if (!canEdit || !company) return;
    
    const currentConfig = getTableConfig(tableNumber);
    const newTopRowPanels = isTopRow ? Math.max(0, currentConfig.topRowPanels - 1) : currentConfig.topRowPanels;
    const newBottomRowPanels = !isTopRow ? Math.max(0, currentConfig.bottomRowPanels - 1) : currentConfig.bottomRowPanels;
    
    updateTableConfig(company.id, tableNumber, newTopRowPanels, newBottomRowPanels);
  }, [canEdit, company, updateTableConfig, getTableConfig]);

  // Handle panel addition to specific row for a specific table
  const handleAddToRow = useCallback((tableNumber: number, isTopRow: boolean) => {
    if (!canEdit || !company) return;
    
    const currentConfig = getTableConfig(tableNumber);
    const newTopRowPanels = isTopRow ? currentConfig.topRowPanels + 1 : currentConfig.topRowPanels;
    const newBottomRowPanels = !isTopRow ? currentConfig.bottomRowPanels + 1 : currentConfig.bottomRowPanels;
    
    updateTableConfig(company.id, tableNumber, newTopRowPanels, newBottomRowPanels);
  }, [canEdit, company, updateTableConfig, getTableConfig]);

  // Handle individual panel deletion for a specific table
  const handleDeletePanel = useCallback((tableNumber: number, isTopRow: boolean, panelIndex: number) => {
    if (!canEdit || !company) return;
    
    // Always remove from the end of the respective row
    const currentConfig = getTableConfig(tableNumber);
    const newTopRowPanels = isTopRow ? Math.max(0, currentConfig.topRowPanels - 1) : currentConfig.topRowPanels;
    const newBottomRowPanels = !isTopRow ? Math.max(0, currentConfig.bottomRowPanels - 1) : currentConfig.bottomRowPanels;
    
    updateTableConfig(company.id, tableNumber, newTopRowPanels, newBottomRowPanels);
  }, [canEdit, company, updateTableConfig, getTableConfig]);

  // Toggle edit mode for a table
  const toggleEditTable = useCallback((tableNumber: number) => {
    if (!canEdit) return;
    setEditingTable(editingTable === tableNumber ? null : tableNumber);
  }, [canEdit, editingTable]);

  // Handle table deletion
  const handleDeleteTable = useCallback((tableNumber: number) => {
    if (!canEdit || !company) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete Table ${tableNumber}?\n\nThis will:\n- Remove all panels in this table\n- Renumber remaining tables\n- This action cannot be undone`
    );
    
    if (confirmDelete) {
      deleteTable(company.id, tableNumber);
      setEditingTable(null); // Exit edit mode
      console.log(`Table ${tableNumber} deleted from company ${company.name}`);
    }
  }, [canEdit, company, deleteTable]);

  // Handle adding a new table
  const handleAddTable = useCallback(() => {
    if (!canEdit || !company) return;
    
    const topPanels = prompt('Enter number of top row panels:', '20');
    const bottomPanels = prompt('Enter number of bottom row panels:', '20');
    
    if (topPanels !== null && bottomPanels !== null) {
      const topCount = parseInt(topPanels) || 0;
      const bottomCount = parseInt(bottomPanels) || 0;
      
      if (topCount >= 0 && bottomCount >= 0) {
        addTable(company.id, topCount, bottomCount);
        console.log(`Added new table with ${topCount} top + ${bottomCount} bottom panels`);
      } else {
        alert('Please enter valid panel counts (0 or greater)');
      }
    }
  }, [canEdit, company, addTable]);
  
  // Memoize expensive calculations
  const systemMetrics = useMemo(() => {
    const totalPanels = panels.length;
    const faultyCount = panels.filter(panel => panel.isFaulty).length;
    const totalPower = panels.reduce((sum, panel) => sum + panel.power, 0);
    const totalExpectedPower = panels.reduce((sum, panel) => sum + panel.expectedPower, 0);
    const totalPowerLoss = panels.reduce((sum, panel) => sum + panel.powerLoss, 0);
    const averageTemperature = panels.length > 0 ? 
      Math.round(panels.reduce((sum, panel) => sum + panel.temperature, 0) / panels.length * 10) / 10 : 0;
    const averageEfficiency = panels.length > 0 ? 
      Math.round(panels.reduce((sum, panel) => sum + panel.efficiency, 0) / panels.length * 100) / 100 : 0;
    const averageIrradiance = panels.length > 0 ? 
      Math.round(panels.reduce((sum, panel) => sum + panel.irradiance, 0) / panels.length) : 0;
    const systemEfficiency = totalExpectedPower > 0 ? 
      Math.round((totalPower / totalExpectedPower) * 100 * 100) / 100 : 0;
    
    return {
      totalPanels,
      faultyCount,
      totalPower,
      totalExpectedPower,
      totalPowerLoss,
      averageTemperature,
      averageEfficiency,
      averageIrradiance,
      systemEfficiency
    };
  }, [panels]);

  // Calculate health counts based on health percentage
  const healthCounts = useMemo(() => {
    return panels.reduce((counts, panel) => {
      if (panel.healthPercentage >= 90) {
        counts.excellent++;
      } else if (panel.healthPercentage >= 60) {
        counts.moderate++;
      } else {
        counts.poor++;
      }
      return counts;
    }, { excellent: 0, moderate: 0, poor: 0 });
  }, [panels]);

  // Generate solar panel data using test data generator
  useEffect(() => {
    const initializePanels = () => {
      console.log('=== PANEL GENERATION DEBUG ===');
      console.log('PanelMonitor: Initializing panels for company:', company?.name);
      console.log('PanelMonitor: Company data:', company);
      console.log('PanelMonitor: Total tables:', totalTables);
      console.log('PanelMonitor: Table configs:', company?.tableConfigs);
      
      if (!company || !company.tableConfigs || company.tableConfigs.length === 0) {
        console.error('❌ No company or table configs found!');
        setPanels([]);
        return;
      }
      
      // Validate table configs
      company.tableConfigs.forEach((config, index) => {
        console.log(`Table ${config.tableNumber}: ${config.topRowPanels} top + ${config.bottomRowPanels} bottom = ${config.topRowPanels + config.bottomRowPanels} total`);
      });
      
      const tableConfigs = company.tableConfigs;
      console.log('Generating panels with configs:', tableConfigs);
      const panelData = generateTestDataWithConfigs(totalTables, tableConfigs, company?.id);
      console.log(`Generated ${panelData.length} panels total`);
      setPanels(panelData);
      
      // Get faulty panels based on health status
      const faultyIds = panelData
        .filter(panel => panel.isFaulty)
        .map(panel => panel.id);
      setFaultyPanels(new Set(faultyIds));
    };

    initializePanels();
    
      // Real-time updates every 1 second for smooth timer integration
      const interval = setInterval(() => {
        console.log('Updating panel data...', new Date().toLocaleTimeString());
        setLastUpdate(new Date().toLocaleTimeString());
        
        // Generate new data based on current timer state
        const tableConfigs = company?.tableConfigs || [];
        const newPanelData = generateTestDataWithConfigs(totalTables, tableConfigs, company?.id);
        setPanels(newPanelData);
      
      // Update faulty panels list
      const faultyIds = newPanelData
        .filter(panel => panel.isFaulty)
        .map(panel => panel.id);
      setFaultyPanels(new Set(faultyIds));
    }, 1000); // Update every 1 second for smooth timer updates

    return () => clearInterval(interval);
  }, [totalTables, company?.tableConfigs, company?.id, company]);

  // Use memoized metrics
  const {
    totalPanels,
    faultyCount,
    totalPower,
    totalExpectedPower,
    totalPowerLoss,
    averageTemperature,
    averageEfficiency,
    averageIrradiance,
    systemEfficiency
  } = systemMetrics;
  
  // Handle timer phase changes
  const handlePhaseChange = useCallback((phase: string) => {
    console.log(`Phase change: ${phase}`);
    // Force update panels when phase changes
    const tableConfigs = company?.tableConfigs || [];
    const newPanelData = generateTestDataWithConfigs(totalTables, tableConfigs, company?.id);
    setPanels(newPanelData);
    
    const faultyIds = newPanelData
      .filter(panel => panel.isFaulty)
      .map(panel => panel.id);
    setFaultyPanels(new Set(faultyIds));
  }, [totalTables, company?.tableConfigs, company?.id]);

  return (
    <div className="panel-monitor">
      <Timer onPhaseChange={handlePhaseChange} />
      
      <div className="panel-monitor-header">
        <div className="header-left">
          <h1 className="monitor-title">Solar Panel Monitoring System</h1>
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span>Live Data</span>
            <span className="last-update">Last update: {lastUpdate}</span>
          </div>
            </div>
        <div className="company-info">
          <span className="company-name">{companyName}</span>
          </div>
      </div>

      <div className="panel-monitor-content">
        <h2 className="plant-title">{companyName} Solar Plant: Panels Analysis</h2>
        <div className="main-content">
          <div className="panels-analysis">
            {Array.from({ length: totalTables }, (_, tableIndex) => {
              const tableNumber = tableIndex + 1;
              const tableConfig = getTableConfig(tableNumber);
              const tablePanels = panels.filter(panel => panel.table === tableNumber);
              const topRowPanelsData = tablePanels.slice(0, tableConfig.topRowPanels);
              const bottomRowPanelsData = tablePanels.slice(tableConfig.topRowPanels, tableConfig.topRowPanels + tableConfig.bottomRowPanels);
              
              return (
                <div key={tableNumber} className="table-container">
                  <div className="string-row">
                    <div className="string-label">TABLE {tableNumber}<br/>(String{tableNumber})</div>
                    <div className="panel-rows-container">
                      <div className="panels-grid">
                        {topRowPanelsData.map((panel, index) => (
                          <SolarPanel
                            key={panel.id}
                            panel={panel}
                            userRole={user?.role || 'technician'}
                            seriesNumber={index + 1}
                            canEdit={canEdit && editingTable === tableNumber}
                            onPanelClick={canEdit && editingTable === tableNumber ? () => handleDeletePanel(tableNumber, true, index) : undefined}
                          />
                        ))}
                      </div>
                      <div className="horizontal-line"></div>
                      <div className="panels-grid">
                        {bottomRowPanelsData.map((panel, index) => (
                          <SolarPanel
                            key={panel.id}
                            panel={panel}
                            userRole={user?.role || 'technician'}
                            seriesNumber={tableConfig.topRowPanels + index + 1}
                            canEdit={canEdit && editingTable === tableNumber}
                            onPanelClick={canEdit && editingTable === tableNumber ? () => handleDeletePanel(tableNumber, false, index) : undefined}
                          />
                        ))}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="table-edit-controls">
                        <button 
                          onClick={() => toggleEditTable(tableNumber)}
                          className={`edit-table-btn ${editingTable === tableNumber ? 'active' : ''}`}
                        >
                          {editingTable === tableNumber ? 'Close' : 'Edit'}
                        </button>
                        <button 
                          onClick={() => handleDeleteTable(tableNumber)}
                          className="delete-table-btn"
                          title={`Delete Table ${tableNumber}`}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {canEdit && editingTable === tableNumber && (
                    <div className="table-edit-panel">
                      <h4>Edit Table {tableNumber}</h4>
                      <div className="row-controls">
                        <div className="row-control">
                          <span className="row-label">Top Row ({tableConfig.topRowPanels} panels)</span>
                          <div className="row-buttons">
                            <button 
                              onClick={() => handleAddToRow(tableNumber, true)}
                              className="edit-btn add-btn small"
                            >
                              + Add
                            </button>
                            <button 
                              onClick={() => handleRemoveFromRow(tableNumber, true)}
                              className="edit-btn remove-btn small"
                              disabled={tableConfig.topRowPanels <= 0}
                            >
                              - Remove
                            </button>
                          </div>
                        </div>
                        <div className="row-control">
                          <span className="row-label">Bottom Row ({tableConfig.bottomRowPanels} panels)</span>
                          <div className="row-buttons">
                            <button 
                              onClick={() => handleAddToRow(tableNumber, false)}
                              className="edit-btn add-btn small"
                            >
                              + Add
                            </button>
                            <button 
                              onClick={() => handleRemoveFromRow(tableNumber, false)}
                              className="edit-btn remove-btn small"
                              disabled={tableConfig.bottomRowPanels <= 0}
                            >
                              - Remove
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="panel-delete-info">
                        <p className="text-xs text-muted-foreground">
                          💡 <strong>Edit Mode Active:</strong> Click any panel to delete it (removes from end of that row)
                        </p>
                      </div>
                      <div className="table-info">
                        Total: {tableConfig.topRowPanels + tableConfig.bottomRowPanels} panels per table
                      </div>
                    </div>
                  )}
            </div>
              );
            })}
            
            {/* Add Table Button for Plant Admins */}
            {canEdit && (
              <div className="add-table-container">
                <button 
                  onClick={handleAddTable}
                  className="add-table-btn"
                  title="Add a new table"
                >
                  ➕ Add New Table
                </button>
              </div>
            )}
          </div>
          
          <div className="info-dashboard">
            <h3>Dashboard</h3>
            
            <div className="info-section fault-list">
              <h4>FAULT:</h4>
              {panels
                .filter(panel => panel.isFaultPanel || panel.needsCleaning)
                .map((panel) => (
                  <p key={panel.id}>{panel.id}</p>
                ))}
            </div>

            <div className="info-section repair-process">
              <h4>REPAIR PROCESS:</h4>
              {panels
                .filter(panel => panel.isBeingRepaired && (panel.wasFaultPanel || panel.wasCleaningPanel))
                .map((panel) => (
                  <div key={panel.id} className="repair-item">
                    <div className="repair-panel-info">
                      <span className="repair-panel-id">{panel.id}</span>
                      <span className="repair-progress-text">{Math.round(panel.repairProgress)}% Complete</span>
                    </div>
                    <div className="repair-health-info">
                      <span className="repair-health-label">Health:</span>
                      <span className="repair-health-value">{Math.round(panel.healthPercentage)}%</span>
                    </div>
                    <div className="repair-progress-bar">
                      <div 
                        className="repair-progress-fill" 
                        style={{
                          width: `${panel.repairProgress}%`,
                          backgroundColor: panel.repairStage === 'red_stage' ? '#e74c3c' : 
                                         panel.repairStage === 'orange_stage' || panel.repairStage === 'orange_to_blue' ? '#f39c12' : 
                                         '#27ae60'
                        }}
                      ></div>
                    </div>
                    <div className="repair-status">
                      {panel.repairStage === 'red_stage' ? '🔴 Cleaning Debris & Diagnostics' : 
                       panel.repairStage === 'orange_stage' ? '🟠 Testing & Calibration' : 
                       panel.repairStage === 'orange_to_blue' ? '🟠 Final Testing' :
                       '🟢 Fully Repaired'}
                    </div>
          </div>
                ))}
              {panels.filter(panel => panel.isBeingRepaired && (panel.wasFaultPanel || panel.wasCleaningPanel)).length === 0 && (
                <p className="no-repairs">No panels currently being repaired</p>
              )}
      </div>





            <div className="info-section predictive-losses">
              <h4>Predictive Losses:</h4>
              <p className="loss-value">{(totalPowerLoss / 1000).toFixed(1)}kW</p>
              <p className="loss-condition">(if issue not resolved in next 1Hr)</p>
      </div>
            
            <div className="info-section panels-health-legend">
              <h4>Panels Health</h4>
              <div className="legend-items">
                <div className="legend-item">
                  <div className="legend-panel" style={{backgroundColor: '#27ae60', borderColor: '#27ae60'}}>
                    <div className="health-bar" style={{backgroundColor: '#2ecc71', height: '100%'}}></div>
                  </div>
                  <span>100%</span>
                </div>
                <div className="legend-item">
                  <div className="legend-panel" style={{backgroundColor: '#f39c12', borderColor: '#f39c12'}}>
                    <div className="health-bar" style={{backgroundColor: '#e67e22', height: '70%'}}></div>
                  </div>
                  <span>50-89%</span>
                      </div>
                <div className="legend-item">
                  <div className="legend-panel" style={{backgroundColor: '#e74c3c', borderColor: '#e74c3c'}}>
                    <div className="health-bar" style={{backgroundColor: '#c0392b', height: '40%'}}></div>
                  </div>
                  <span>&lt;50%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanelMonitor;