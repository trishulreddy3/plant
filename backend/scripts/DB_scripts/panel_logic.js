const Company = require('../../models/Plant');
const Ticket = require('../../models/Ticket');

/**
 * Core Panel Calculation Logic (G/M/B mapping)
 * G = Good, M = Moderate (Repairing), B = Bad (Fault)
 */
const vpDefault = 20;
const cpDefault = 9.9;

const calculateStateLabel = (pPower, nominalPower) => {
    if (nominalPower <= 0) return 'G';
    const h = Math.round((pPower / nominalPower) * 100);
    if (h < 50) return 'B';
    if (h < 99) return 'M';
    return 'G';
};

const stateToLabel = (state) => {
    if (state === 'fault') return 'B';
    if (state === 'repairing') return 'M';
    return 'G';
};

const labelToState = (label) => {
    if (label === 'B') return 'fault';
    if (label === 'M') return 'repairing';
    return 'G';
};

/**
 * Synchronize series connection logic (Bottleneck effect)
 */
/**
 * Synchronize series connection logic (Bottleneck effect)
 */
const VP = 20;
const CP = 9.9;

function normalizePlantDetails(plant) {
    if (!plant || !Array.isArray(plant.live_data)) return false;

    // Use defaults
    const vp = VP;
    const cp = CP;

    let checkChanged = false;

    plant.live_data.forEach(table => {
        // Init arrays if missing or wrong length (Table schema has panelVoltages)
        const len = table.panelsCount || 0;
        if (len <= 0) return;

        // Ensure voltages exist
        if (!Array.isArray(table.panelVoltages) || table.panelVoltages.length !== len) {
            table.panelVoltages = new Array(len).fill(vp);
            checkChanged = true;
        }

        // Let's assume normalizing ensures `current` is valid.
        if (typeof table.current !== 'number') {
            table.current = cp;
            checkChanged = true;
        }
    });

    return checkChanged;
}

const generatePanelData = (panelCount, voltagePerPanel = VP, currentPerPanel = CP) => {
    // Return flat structure for Table

    // Simulate slight natural variation in voltages
    const voltages = Array.from({ length: panelCount }, () => {
        const variation = (Math.random() * 0.4) - 0.2; // +/- 0.2V
        return Number((voltagePerPanel + variation).toFixed(1));
    });

    // Assume healthy initially
    const current = currentPerPanel;

    // Temperature and Light (Standard STCish)
    const temperature = 25 + (Math.random() * 5); // 25-30C
    const lightIntensity = 980 + (Math.random() * 40); // 980-1020 W/m2

    return {
        panelVoltages: voltages,
        current: Number(current.toFixed(2)),
        temperature: Number(temperature.toFixed(1)),
        lightIntensity: Math.floor(lightIntensity),
        time: new Date()
    };
};

/**
 * Query Faults Logic (Similar to Python query_faults.py)
 */
async function queryFaults({ companyId, startDate, endDate, tableIds, conditionLabel }) {
    const query = { companyId };
    const company = await Company.findOne(query);
    if (!company || !company.plantDetails || !company.plantDetails.tables) return [];

    let results = [];
    const tables = company.plantDetails.tables;

    tables.forEach(table => {
        // Filter by tableId if provided
        if (tableIds && tableIds.length > 0 && !tableIds.includes(table.id)) return;

        ['topPanels', 'bottomPanels'].forEach(key => {
            const panelSet = table[key];
            if (!panelSet) return;

            const record = {
                generated_at: company.createdAt,
                tb_no: table.serialNumber || table.id,
                latest_temp: 35, // Mock data or from plant
                latest_light: 800, // Mock data
                ex_V: panelSet.voltage.reduce((a, b) => a + b, 0),
                ex_A: Math.min(...panelSet.current),
                condition_ts: company.plantDetails.lastUpdated,
                panels: {
                    t_pv: {}, b_pv: {}
                }
            };

            const targetKey = key === 'topPanels' ? 't_pv' : 'b_pv';
            let hasCondition = false;

            panelSet.states.forEach((state, i) => {
                const label = stateToLabel(state);
                if (conditionLabel && label !== conditionLabel) return;

                record.panels[targetKey][`p${i + 1}`] = label;
                hasCondition = true;
            });

            if (hasCondition) results.push(record);
        });
    });

    return results;
}

/**
 * Database operations for panels
 */
async function updatePanelCurrent(companyId, { tableId, index, current, voltage }) {
    const company = await Company.findOne({ companyId });
    if (!company || !company.plantDetails) throw new Error('Plant not found');

    const table = (company.plantDetails.live_data || []).find(t => t.id === tableId);
    if (!table) throw new Error('Table not found');

    const cp = company.plantDetails.currentPerPanel || cpDefault;
    const vp = company.plantDetails.voltagePerPanel || vpDefault;

    // Use flat panelVoltages
    if (!table.panelVoltages) table.panelVoltages = [];

    // Safety check for index
    if (index < 0 || index >= table.panelVoltages.length) throw new Error('Invalid panel index');

    const targetVoltage = (typeof voltage === 'number' && Number.isFinite(voltage))
        ? voltage
        : (current < cp ? (vp * (current / cp)) : vp);

    table.panelVoltages[index] = targetVoltage;

    // If we want to store individual current, we can't in the simplified schema (only table.current).
    // But we can update table.current to be the min of all panels if we tracked them?
    // For now, if this is a "fault" simulation, we might assume the table current drops?
    if (current < table.current) {
        table.current = current;
    }

    normalizePlantDetails(company.plantDetails);
    company.plantDetails.lastUpdated = new Date().toISOString();
    company.markModified('plantDetails');
    await company.save();
    return company.plantDetails;
}

async function resolvePanel(companyId, { tableId, index }) {
    const company = await Company.findOne({ companyId });
    if (!company || !company.plantDetails) throw new Error('Plant not found');

    const table = (company.plantDetails.live_data || []).find(t => t.id === tableId);
    if (!table) throw new Error('Table not found');

    const vp = company.plantDetails.voltagePerPanel || vpDefault;
    const cp = company.plantDetails.currentPerPanel || cpDefault;

    if (table.panelVoltages && index >= 0 && index < table.panelVoltages.length) {
        table.panelVoltages[index] = vp;
    }

    // Reset table current if we assume this resolved the bottleneck
    // In a real series, we'd need to check all other panels. 
    // For simplicity, we can reset to default or just leave it (next refresh picks it up)
    table.current = cp;

    normalizePlantDetails(company.plantDetails);
    company.plantDetails.lastUpdated = new Date().toISOString();
    company.markModified('plantDetails');
    await company.save();
    return company.plantDetails;
}

module.exports = {
    normalizePlantDetails,
    generatePanelData,
    queryFaults,
    stateToLabel,
    labelToState,
    updatePanelCurrent,
    resolvePanel
};
