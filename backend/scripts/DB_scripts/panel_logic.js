const Company = require('../../models/Plant');
const Ticket = require('../../models/Ticket');
const LiveData = require('../../models/LiveData');

/**
 * Core Panel Calculation Logic (G/M/B mapping)
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
 * Synchronize series connection logic
 */
const VP = 20;
const CP = 9.9;

async function normalizePlantDetails(companyId) {
    const records = await LiveData.find({ companyId });
    if (!records.length) return false;

    let changed = false;
    for (const doc of records) {
        // Find pXX_v fields
        const keys = Object.keys(doc.toObject()).filter(k => /^p\d+_v$/.test(k));
        if (keys.length === 0) continue;

        if (typeof doc.current !== 'number') {
            doc.current = CP;
            changed = true;
        }

        if (changed) {
            await doc.save();
        }
    }
    return changed;
}

const generatePanelData = (panelCount, voltagePerPanel = VP, currentPerPanel = CP) => {
    const voltages = Array.from({ length: panelCount }, () => {
        const variation = (Math.random() * 0.4) - 0.2;
        return Number((voltagePerPanel + variation).toFixed(1));
    });

    const current = currentPerPanel;
    const temparature = 25 + (Math.random() * 5);
    const lightintensity = 980 + (Math.random() * 40);

    return {
        panelVoltages: voltages,
        current: Number(current.toFixed(2)),
        temparature: Number(temparature.toFixed(1)),
        lightintensity: Math.floor(lightintensity),
        time: new Date()
    };
};

/**
 * Formats a record for the frontend (converts pX_v to panelVoltages array)
 */
const formatRecord = (record) => {
    const obj = record.toObject ? record.toObject() : record;
    const panelVoltages = [];
    const keys = Object.keys(obj)
        .filter(k => /^p\d+_v$/.test(k))
        .sort((a, b) => {
            const ma = a.match(/\d+/);
            const mb = b.match(/\d+/);
            const na = ma ? parseInt(ma[0]) : 0;
            const nb = mb ? parseInt(mb[0]) : 0;
            return na - nb;
        });
    keys.forEach(k => panelVoltages.push(obj[k]));

    return {
        ...obj,
        panelVoltages,
        id: obj.node || obj._id.toString(),
        serialNumber: obj.node
    };
};

/**
 * Database operations for panels
 */
async function updatePanelCurrent(companyId, { tableId, position, index, current, voltage }) {
    console.log(`[panel_logic] updatePanelCurrent: table=${tableId}, pos=${position}, idx=${index}, cur=${current}, vol=${voltage}`);
    const company = await Company.findOne({ companyId });
    if (!company) throw new Error('Company not found');

    const record = await LiveData.findOne({ companyId, node: tableId });
    if (!record) throw new Error(`Table record not found in LiveData for node: ${tableId}`);

    const cp = company.plantDetails.currentPerPanel || cpDefault;
    const vp = company.plantDetails.voltagePerPanel || vpDefault;

    // Calculate absolute index
    let absoluteIndex = index;
    if (position === 'bottom') {
        let topCount = record.panelsTop || 0;
        if (topCount === 0) {
            const pKeys = Object.keys(record.toObject()).filter(k => /^p\d+_v$/.test(k));
            topCount = Math.ceil(pKeys.length / 2);
        }
        absoluteIndex = topCount + index;
    }

    const pKey = `p${absoluteIndex + 1}_v`;
    const targetVoltage = (typeof voltage === 'number' && Number.isFinite(voltage))
        ? voltage
        : (current < cp ? (vp * (current / cp)) : vp);

    console.log(`[panel_logic] Setting ${pKey} = ${targetVoltage}V and table current = ${current}A`);

    record.set(pKey, targetVoltage);
    record.current = current; // Manual override from technician
    record.time = new Date();
    record.markModified(pKey);
    record.markModified('current');

    await record.save();

    const allRecords = await LiveData.find({ companyId });
    return {
        ...company.plantDetails.toObject(),
        live_data: allRecords.map(r => formatRecord(r))
    };
}

async function resolvePanel(companyId, { tableId, position, index }) {
    console.log(`[panel_logic] resolvePanel: table=${tableId}, pos=${position}, idx=${index}`);
    const company = await Company.findOne({ companyId });
    if (!company) throw new Error('Company not found');

    const record = await LiveData.findOne({ companyId, node: tableId });
    if (!record) throw new Error(`Table record not found in LiveData for node: ${tableId}`);

    const vp = company.plantDetails.voltagePerPanel || vpDefault;
    const cp = company.plantDetails.currentPerPanel || cpDefault;

    // Calculate absolute index
    let absoluteIndex = index;
    if (position === 'bottom') {
        let topCount = record.panelsTop || 0;
        if (topCount === 0) {
            const pKeys = Object.keys(record.toObject()).filter(k => /^p\d+_v$/.test(k));
            topCount = Math.ceil(pKeys.length / 2);
        }
        absoluteIndex = topCount + index;
    }

    const pKey = `p${absoluteIndex + 1}_v`;
    console.log(`[panel_logic] Resolving ${pKey} to ${vp}V`);

    record.set(pKey, vp);

    // Recalculate current based on remaining faults
    const recordObj = record.toObject();
    const pKeys = Object.keys(recordObj).filter(k => /^p\d+_v$/.test(k));

    let minHealth = 1.0;
    pKeys.forEach(k => {
        // Use the updated value for the one we are resolving
        const val = (k === pKey) ? vp : recordObj[k];
        if (typeof val === 'number') {
            const health = val / vp;
            if (health < minHealth) minHealth = health;
        }
    });

    const newCurrent = Number((cp * minHealth).toFixed(2));
    console.log(`[panel_logic] Recalculated table current: ${newCurrent}A`);

    record.current = newCurrent;
    record.time = new Date();
    record.markModified(pKey);
    record.markModified('current');

    await record.save();

    const allRecords = await LiveData.find({ companyId });
    return {
        ...company.plantDetails.toObject(),
        live_data: allRecords.map(r => formatRecord(r))
    };
}

module.exports = {
    normalizePlantDetails,
    generatePanelData,
    queryFaults: async () => [], // Simplified placeholder
    stateToLabel,
    labelToState,
    updatePanelCurrent,
    resolvePanel
};
