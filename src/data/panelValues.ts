// Panel Values Data File
// Each panel: 20V, 10A nominal
// Series connection behavior: when one panel fails, all subsequent panels in the string are affected

// Local test cycle configuration (kept for UI timing without data generator)
const TEST_CYCLE_CONFIG = {
  FAULT_DETECTION_START: 5,
  REPAIR_COMPLETE_START: 15,
  TEST_COMPLETE_TIME: 25,
};

export const PANEL_VALUES = {
  // Table 1 - Top Row (P1-P20)
  table1_top: {
    voltage: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
    current: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10], // Normal state
    power: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200]
  },
  
  // Table 1 - Bottom Row (P1-P20)
  table1_bottom: {
    voltage: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
    current: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10], // Normal state
    power: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200]
  },

  // Table 2 - Top Row (P1-P20) - FAULT OCCURS HERE
  table2_top: {
    voltage: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
    current: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10], // Normal state
    power: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200]
  },
  
  // Table 2 - Bottom Row (P1-P20)
  table2_bottom: {
    voltage: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
    current: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10], // Normal state
    power: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200]
  },

  // Table 3 - Top Row (P1-P20)
  table3_top: {
    voltage: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
    current: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10], // Normal state
    power: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200]
  },
  
  // Table 3 - Bottom Row (P1-P20)
  table3_bottom: {
    voltage: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
    current: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10], // Normal state
    power: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200]
  },

  // Table 4 - Top Row (P1-P20)
  table4_top: {
    voltage: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
    current: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10], // Normal state
    power: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200]
  },
  
  // Table 4 - Bottom Row (P1-P20)
  table4_bottom: {
    voltage: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
    current: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10], // Normal state
    power: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200]
  }
};

// Function to update panel values based on timer
export const updatePanelValues = (elapsedSeconds: number, totalTables: number = 4, topRowPanels: number = 20, bottomRowPanels: number = 20) => {
  // Create dynamic panel values for any number of tables and panels
  const createTableValues = () => {
    const values: any = {};
    for (let table = 1; table <= totalTables; table++) {
      values[`table${table}_top`] = {
        voltage: Array(topRowPanels).fill(20),
        current: Array(topRowPanels).fill(10),
        power: Array(topRowPanels).fill(200)
      };
      values[`table${table}_bottom`] = {
        voltage: Array(bottomRowPanels).fill(20),
        current: Array(bottomRowPanels).fill(10),
        power: Array(bottomRowPanels).fill(200)
      };
    }
    return values;
  };

  const updatedValues = createTableValues();
  
  if (elapsedSeconds >= TEST_CYCLE_CONFIG.FAULT_DETECTION_START && elapsedSeconds < TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START) {
    // Dynamic fault simulation based on available tables
    const faultTable = Math.min(2, Math.ceil(totalTables / 2));
    const cleaningTable = Math.min(3, Math.max(2, Math.ceil(totalTables * 0.75)));
    
    // Dynamic fault panel position - use 75% through the top row, but ensure it exists
    const faultPanelPosition = Math.min(Math.ceil(topRowPanels * 0.75), topRowPanels);
    const cleaningPanelPosition = Math.min(Math.ceil(topRowPanels * 0.6), topRowPanels);
    
    // Fault in the designated fault table: panels from fault position to end show 5A
    if (faultTable <= totalTables) {
      const faultCurrent = Array(topRowPanels).fill(10);
      const faultPower = Array(topRowPanels).fill(200);
      
      // Affect panels from fault position to end
      for (let i = faultPanelPosition - 1; i < topRowPanels; i++) {
        faultCurrent[i] = 5;
        faultPower[i] = 100;
      }
      
      updatedValues[`table${faultTable}_top`] = {
        voltage: Array(topRowPanels).fill(20),
        current: faultCurrent,
        power: faultPower
      };
    }
    
    // Cleaning in the designated cleaning table: panels from cleaning position to end show 7A
    if (cleaningTable <= totalTables) {
      const cleaningCurrent = Array(topRowPanels).fill(10);
      const cleaningPower = Array(topRowPanels).fill(200);
      
      // Affect panels from cleaning position to end
      for (let i = cleaningPanelPosition - 1; i < topRowPanels; i++) {
        cleaningCurrent[i] = 7;
        cleaningPower[i] = 140;
      }
      
      updatedValues[`table${cleaningTable}_top`] = {
        voltage: Array(topRowPanels).fill(20),
        current: cleaningCurrent,
        power: cleaningPower
      };
    }
  }
  // After repair complete start time, values return to normal (already set to normal above)
  
  return updatedValues;
};
