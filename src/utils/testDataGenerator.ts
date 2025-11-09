// Solar Panel Monitoring System - Timer-Based Series Connection Simulation
// Uses external timer and data file for precise control
import { PANEL_VALUES, updatePanelValues } from '../data/panelValues';

// Test Cycle Configuration - Easily configurable time phases
export const TEST_CYCLE_CONFIG = {
  FAULT_DETECTION_START: 3, // When fault detection begins (seconds)
  REPAIR_COMPLETE_START: 5, // When repair process begins (seconds)
  TEST_COMPLETE_TIME: 15, // When entire test cycle completes (seconds)
  // Repair duration = TEST_COMPLETE_TIME - REPAIR_COMPLETE_START (10 seconds in this case)
};

// Panel specifications for series connection
const PANEL_SPECS = {
  voltage: 20, // Volts per panel
  current: 10, // Amperes per panel
  power: 200 // Watts per panel (20V * 10A)
};

// Global timer state (will be set by Timer component)
let currentElapsedSeconds = 0;

// Function to set elapsed seconds from Timer component
export const setElapsedSeconds = (seconds: number) => {
  currentElapsedSeconds = seconds;
};

// Panel interface
export interface Panel {
  id: string;
  table: number;
  position: number;
  isTopPanel: boolean;
  isFaulty: boolean;
  isFaultPanel: boolean;
  isAffectedBySeriesBreak: boolean;
  needsCleaning: boolean;
  isAffectedByCleaning: boolean;
  wasFaultPanel: boolean;
  wasCleaningPanel: boolean;
  isBeingRepaired: boolean;
  repairProgress: number;
  repairStage: string;
  healthStatus: string;
  healthPercentage: number;
  power: number;
  voltage: number;
  current: number;
  temperature: number;
  efficiency: number;
  irradiance: number;
  expectedPower: number;
  powerLoss: number;
  degradationFactor: number;
  lastUpdate: string;
}

// Generate individual panel data for specific table configuration
const generateIndividualPanelData = (table: number, panelPosition: number, isTopPanel: boolean, topRowPanels: number, bottomRowPanels: number, companyId?: string): Panel => {
  const panelId = isTopPanel ? `T.${table}.TOP.P${panelPosition}` : `T.${table}.BOTTOM.P${panelPosition}`;
  
  // Create unique seed for this specific panel to ensure consistent but individual behavior
  const panelSeed = `${companyId || 'default'}-${table}-${panelPosition}-${isTopPanel}`;
  const seedHash = panelSeed.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
  
  // Use panel-specific random values based on seed
  const random1 = Math.abs(Math.sin(seedHash * 0.1)) * 100;
  const random2 = Math.abs(Math.sin(seedHash * 0.2)) * 100;
  const random3 = Math.abs(Math.sin(seedHash * 0.3)) * 100;
  
  // Base panel values
  const baseVoltage = 20;
  const baseCurrent = 10;
  const basePower = 200;
  
  // Add slight variations based on panel position and table
  const voltageVariation = (random1 % 5) - 2; // -2 to +2V variation
  const currentVariation = (random2 % 3) - 1; // -1 to +1A variation
  
  const voltage = baseVoltage + voltageVariation;
  const current = baseCurrent + currentVariation;
  const power = voltage * current;
  
  // Determine health based on panel-specific factors
  let healthPercentage = 100;
  let isFaultPanel = false;
  let needsCleaning = false;
  
  // Create some variety in panel health based on position and time
  const timeBasedFactor = Math.sin(currentElapsedSeconds * 0.1 + seedHash * 0.01);
  const positionFactor = (panelPosition / Math.max(topRowPanels, bottomRowPanels)) * 100;
  
  // Simulate occasional faults or cleaning needs based on panel characteristics
  if (random3 > 95 && timeBasedFactor > 0.7) {
    isFaultPanel = true;
    healthPercentage = 30 + (random1 % 20); // 30-50% health
  } else if (random3 > 85 && timeBasedFactor > 0.5) {
    needsCleaning = true;
    healthPercentage = 60 + (random2 % 30); // 60-90% health
  } else {
    // Normal operation with slight variations
    healthPercentage = 85 + (random1 % 15); // 85-100% health
  }
  
  // Determine health status category
  let healthStatus: string;
  if (healthPercentage >= 90) {
    healthStatus = '100%';
  } else if (healthPercentage >= 60) {
    healthStatus = '50-89%';
  } else {
    healthStatus = '<50%';
  }
  
  return {
    id: panelId,
    table: table,
    position: panelPosition,
    isTopPanel: isTopPanel,
    isFaulty: isFaultPanel || needsCleaning,
    isFaultPanel: isFaultPanel,
    isAffectedBySeriesBreak: false, // Individual panels don't affect others
    needsCleaning: needsCleaning,
    isAffectedByCleaning: false,
    wasFaultPanel: false,
    wasCleaningPanel: false,
    isBeingRepaired: false,
    repairProgress: 0,
    repairStage: 'not_started',
    healthStatus: healthStatus,
    healthPercentage: Math.round(healthPercentage),
    power: Math.round(power),
    voltage: Math.round(voltage * 10) / 10,
    current: Math.round(current * 10) / 10,
    temperature: 30 + (random1 % 20), // 30-50°C
    efficiency: Math.round((power / basePower) * 100 * 100) / 100,
    irradiance: 800 + (random2 % 400), // 800-1200 W/m²
    expectedPower: basePower,
    powerLoss: Math.max(0, basePower - power),
    degradationFactor: healthPercentage / 100,
    lastUpdate: new Date().toLocaleTimeString()
  };
};

// Generate panel data based on current timer state (legacy function for backward compatibility)
const generatePanelData = (table: number, panelPosition: number, isTopPanel: boolean, totalTables: number, topRowPanels: number = 20, bottomRowPanels: number = 20): Panel => {
  const panelId = isTopPanel ? `T.${table}.TOP.P${panelPosition}` : `T.${table}.BOTTOM.P${panelPosition}`;
  
  // Get current panel values based on timer
  const panelValues = updatePanelValues(currentElapsedSeconds, totalTables, topRowPanels, bottomRowPanels);
  
  // Determine which table data to use (dynamic table selection)
  const tableKey = isTopPanel ? `table${table}_top` : `table${table}_bottom`;
  const tableData = panelValues[tableKey];

  // Get values for this specific panel
  const voltage = tableData!.voltage[panelPosition - 1];
  const current = tableData!.current[panelPosition - 1];
  const power = tableData!.power[panelPosition - 1];

  // Determine panel status based on current value and timer state
  // For fault simulation, use table 2 if it exists, otherwise use the second table
  const faultTable = Math.min(2, Math.ceil(totalTables / 2));
  const cleaningTable = Math.min(3, Math.max(2, Math.ceil(totalTables * 0.75)));
  
  // Dynamic fault panel position - use 75% through the top row, but ensure it exists
  const faultPanelPosition = Math.min(Math.ceil(topRowPanels * 0.75), topRowPanels);
  const cleaningPanelPosition = Math.min(Math.ceil(topRowPanels * 0.6), topRowPanels);
  
  const isFaultPanel = (table === faultTable && isTopPanel && panelPosition === faultPanelPosition && 
    currentElapsedSeconds >= TEST_CYCLE_CONFIG.FAULT_DETECTION_START && 
    currentElapsedSeconds < TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START); // Fault panel
  
  const needsCleaning = (table === cleaningTable && isTopPanel && panelPosition === cleaningPanelPosition && 
    currentElapsedSeconds >= TEST_CYCLE_CONFIG.FAULT_DETECTION_START && 
    currentElapsedSeconds < TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START); // Cleaning panel
  
  const isAffectedBySeriesBreak = (table === faultTable && isTopPanel && panelPosition >= faultPanelPosition && 
    currentElapsedSeconds >= TEST_CYCLE_CONFIG.FAULT_DETECTION_START && 
    currentElapsedSeconds < TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START); // Panels after fault panel affected by series break
  
  const isAffectedByCleaning = (table === cleaningTable && isTopPanel && panelPosition >= cleaningPanelPosition && 
    currentElapsedSeconds >= TEST_CYCLE_CONFIG.FAULT_DETECTION_START && 
    currentElapsedSeconds < TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START); // Panels after cleaning panel affected by cleaning

  // Track which panels were fault/cleaning panels (for repair process)
  const wasFaultPanel = (table === faultTable && isTopPanel && panelPosition === faultPanelPosition && 
    currentElapsedSeconds >= TEST_CYCLE_CONFIG.FAULT_DETECTION_START); // Fault panel
  
  const wasCleaningPanel = (table === cleaningTable && isTopPanel && panelPosition === cleaningPanelPosition && 
    currentElapsedSeconds >= TEST_CYCLE_CONFIG.FAULT_DETECTION_START); // Cleaning panel

  // Track which panels were affected by series break (for repair process)
  const wasAffectedBySeriesBreak = (table === faultTable && isTopPanel && panelPosition >= faultPanelPosition && 
    currentElapsedSeconds >= TEST_CYCLE_CONFIG.FAULT_DETECTION_START); // Panels after fault panel were affected
  
  const wasAffectedByCleaning = (table === cleaningTable && isTopPanel && panelPosition >= cleaningPanelPosition && 
    currentElapsedSeconds >= TEST_CYCLE_CONFIG.FAULT_DETECTION_START); // Panels after cleaning panel were affected

  // Repair process states (after repair complete start time, all panels in series string start repairing)
  const isBeingRepaired = (wasFaultPanel || wasCleaningPanel || wasAffectedBySeriesBreak || wasAffectedByCleaning) && 
    currentElapsedSeconds >= TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START;

  // Different repair progress based on initial panel state
  let repairProgress = 0;
  let repairStage = 'not_started';
  
  if (isBeingRepaired) {
    const repairTime = currentElapsedSeconds - TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START;
    const totalRepairDuration = TEST_CYCLE_CONFIG.TEST_COMPLETE_TIME - TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START;
    
    // Determine repair type based on which series string this panel belongs to
    const isFaultSeries = (table === faultTable && isTopPanel && panelPosition >= faultPanelPosition); // Fault table series
    const isCleaningSeries = (table === cleaningTable && isTopPanel && panelPosition >= cleaningPanelPosition); // Cleaning table series
    
    if (isFaultSeries) {
      // Red panel series (fault) - must go through red → orange → blue progression
      const redStageDuration = totalRepairDuration * 0.4; // 40% of repair time for red stage
      const orangeStageDuration = totalRepairDuration * 0.6; // 60% of repair time for orange stage
      
      if (repairTime < redStageDuration) {
        repairProgress = (repairTime / redStageDuration) * 50; // 0-50% in red stage
        repairStage = 'red_stage';
      } else if (repairTime < redStageDuration + orangeStageDuration) {
        repairProgress = 50 + ((repairTime - redStageDuration) / orangeStageDuration) * 50; // 50-100% in orange stage
        repairStage = 'orange_stage';
      } else {
        repairProgress = 100; // Fully repaired (blue stage)
        repairStage = 'blue_stage';
      }
    } else if (isCleaningSeries) {
      // Orange panel series (cleaning) - can directly go to blue
      repairProgress = Math.min((repairTime / totalRepairDuration) * 100, 100);
      repairStage = repairProgress < 100 ? 'orange_to_blue' : 'blue_stage';
    }
  }

  // Calculate health percentage
  let healthPercentage: number;
  if (isBeingRepaired) {
    // During repair: health updates based on repair stage
    if (repairStage === 'red_stage') {
      healthPercentage = 30 + (repairProgress * 0.4); // 30% to 50% (red stage)
    } else if (repairStage === 'orange_stage') {
      healthPercentage = 50 + ((repairProgress - 50) * 1); // 50% to 100% (orange stage)
    } else if (repairStage === 'orange_to_blue') {
      healthPercentage = 70 + (repairProgress * 0.3); // 70% to 100% (orange to blue)
    } else if (repairStage === 'blue_stage') {
      healthPercentage = 100; // Fully repaired
    } else {
      healthPercentage = 100;
    }
  } else if (isFaultPanel) {
    healthPercentage = 30; // Fault panel at 30%
  } else if (needsCleaning) {
    healthPercentage = 70; // Cleaning panel at 70% (60-80% range)
  } else if (isAffectedBySeriesBreak) {
    healthPercentage = 30; // Affected panels show same health as fault panel (30%)
  } else if (isAffectedByCleaning) {
    healthPercentage = 70; // Panels affected by cleaning show same health as cleaning panel (70%)
  } else {
    healthPercentage = 100; // Normal panels at 100%
  }

  // Determine health status category
  let healthStatus: string;
  if (healthPercentage >= 90) {
    healthStatus = '100%';
  } else if (healthPercentage >= 60) {
    healthStatus = '50-89%';
  } else {
    healthStatus = '<50%';
  }

  return {
    id: panelId,
    table: table,
    position: panelPosition,
    isTopPanel: isTopPanel,
    isFaulty: isAffectedBySeriesBreak,
    isFaultPanel: isFaultPanel,
    isAffectedBySeriesBreak: isAffectedBySeriesBreak,
    needsCleaning: needsCleaning,
    isAffectedByCleaning: isAffectedByCleaning,
    wasFaultPanel: wasFaultPanel,
    wasCleaningPanel: wasCleaningPanel,
    isBeingRepaired: isBeingRepaired,
    repairProgress: repairProgress,
    repairStage: repairStage,
    healthStatus: healthStatus,
    healthPercentage: healthPercentage,
    power: power,
    voltage: voltage,
    current: current,
    temperature: 35 + Math.random() * 10, // Random temperature 35-45°C
    efficiency: Math.round((power / PANEL_SPECS.power) * 100 * 100) / 100,
    irradiance: 900 + Math.random() * 100, // Random irradiance 900-1000 W/m²
    expectedPower: PANEL_SPECS.power,
    powerLoss: Math.round((PANEL_SPECS.power - power) * 100) / 100,
    degradationFactor: healthPercentage / 100,
    lastUpdate: new Date().toLocaleTimeString()
  };
};

export const generateTestData = (totalTables: number = 4, topRowPanels: number = 20, bottomRowPanels: number = 20): Panel[] => {
  const panelData: Panel[] = [];
  
  console.log(`Timer: ${currentElapsedSeconds.toFixed(1)}s - Generating panel data for ${totalTables} tables with ${topRowPanels} top + ${bottomRowPanels} bottom panels`);
  
  for (let table = 1; table <= totalTables; table++) {
    // Generate top row panels
    for (let panel = 1; panel <= topRowPanels; panel++) {
      const panelDataItem = generatePanelData(table, panel, true, totalTables, topRowPanels, bottomRowPanels);
      panelData.push(panelDataItem);
    }
    
    // Generate bottom row panels
    for (let panel = 1; panel <= bottomRowPanels; panel++) {
      const panelDataItem = generatePanelData(table, panel, false, totalTables, topRowPanels, bottomRowPanels);
      panelData.push(panelDataItem);
    }
  }
  
  return panelData;
};

// New function that uses individual table configurations with company-specific data
export const generateTestDataWithConfigs = (totalTables: number, tableConfigs: Array<{tableNumber: number, topRowPanels: number, bottomRowPanels: number}>, companyId?: string): Panel[] => {
  const panelData: Panel[] = [];
  
  console.log(`Timer: ${currentElapsedSeconds.toFixed(1)}s - Generating panel data for company ${companyId || 'unknown'} with ${totalTables} tables`);
  
  for (let table = 1; table <= totalTables; table++) {
    const config = tableConfigs.find(tc => tc.tableNumber === table) || { tableNumber: table, topRowPanels: 20, bottomRowPanels: 20 };
    
    console.log(`Table ${table}: ${config.topRowPanels} top + ${config.bottomRowPanels} bottom panels`);
    
    // Generate top row panels for this specific table
    for (let panel = 1; panel <= config.topRowPanels; panel++) {
      const panelDataItem = generateIndividualPanelData(table, panel, true, config.topRowPanels, config.bottomRowPanels, companyId);
      panelData.push(panelDataItem);
    }
    
    // Generate bottom row panels for this specific table
    for (let panel = 1; panel <= config.bottomRowPanels; panel++) {
      const panelDataItem = generateIndividualPanelData(table, panel, false, config.topRowPanels, config.bottomRowPanels, companyId);
      panelData.push(panelDataItem);
    }
  }
  
  console.log(`Generated ${panelData.length} total panels for company ${companyId || 'unknown'}`);
  return panelData;
};

// Health status color mapping
export const getHealthColor = (healthStatus: string): string => {
  switch (healthStatus) {
    case '100%': return '#27ae60'; // Green
    case '50-89%': return '#f39c12'; // Orange
    case '<50%': return '#e74c3c'; // Red
    default: return '#27ae60';
  }
};

// Health status background color mapping
export const getHealthBackgroundColor = (healthStatus: string): string => {
  switch (healthStatus) {
    case '100%': return '#e3f2fd'; // Light blue
    case '50-89%': return '#fff3e0'; // Light orange
    case '<50%': return '#ffebee'; // Light red
    default: return '#e3f2fd';
  }
};

// Health status border color mapping
export const getHealthBorderColor = (healthStatus: string): string => {
  switch (healthStatus) {
    case '100%': return '#2196f3'; // Blue border
    case '50-89%': return '#ff9800'; // Orange border
    case '<50%': return '#f44336'; // Red border
    default: return '#2196f3';
  }
};