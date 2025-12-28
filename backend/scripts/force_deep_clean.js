
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

const CompanySchema = new mongoose.Schema({
    companyId: String,
    plantDetails: { type: mongoose.Schema.Types.Mixed }
}, { strict: false });

const Company = mongoose.model('Company', CompanySchema);

async function deepClean() {
    try {
        console.log(`Connecting to: ${MONGO_URI.split('@')[1] || 'localhost'}...`); // Log masked URI host
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        const companies = await Company.find({});
        console.log(`Found ${companies.length} companies.`);

        for (const company of companies) {
            console.log(`Processing ${company.companyId}...`);
            if (!company.plantDetails || !Array.isArray(company.plantDetails.tables)) {
                continue;
            }

            // 1. Clean root PlantDetails
            const oldPD = company.plantDetails;
            const newPD = {
                tables: [],
                lastUpdated: new Date()
            };

            // Note: preserving ONLY explicitly requested fields if needed, or strictly following new schema
            // User requested: node, time, temp, light, current, panelVoltages.
            // We might keep generic plantPowerKW if it exists.
            if (oldPD.plantPowerKW) newPD.plantPowerKW = oldPD.plantPowerKW;

            // 2. Clean Tables
            newPD.tables = oldPD.tables.map(t => {
                // Determine source of truth for voltage array
                // If we already possess panelVoltages, use it.
                // If not, try to merge legacy or default.

                let voltages = t.panelVoltages;

                // Fallback migration if panelVoltages missing (shouldn't happen if previous migration ran, but let's be safe)
                if (!voltages) {
                    const topV = (t.topPanels && t.topPanels.voltage) || [];
                    const botV = (t.bottomPanels && t.bottomPanels.voltage) || [];
                    voltages = [...topV, ...botV];
                }

                // If completely empty, default 10 panels
                if (!voltages || voltages.length === 0) {
                    const count = t.panelsCount || 10;
                    voltages = Array(count).fill(20);
                }

                return {
                    // STRICT NEW SCHEMA KEYS ONLY
                    node: t.node || t.serialNumber || `TBL-${t.id || '001'}`,
                    time: t.time || new Date(),
                    temperature: t.temperature || 30,
                    lightIntensity: t.lightIntensity || 950,
                    current: t.current || 9.5,
                    panelVoltages: voltages,

                    // Essential ID for updates
                    id: t.id || `table-${Date.now()}`,
                    // serialNumber might be redundant if node is used, but keeping for ID consistency
                    serialNumber: t.serialNumber || t.node,
                    panelsCount: voltages.length
                };
            });

            // 3. Overwrite completely
            company.plantDetails = newPD;
            company.markModified('plantDetails');
            await company.save();
            console.log(` - Saved cleaned data for ${company.companyId}`);
        }

        console.log('Deep Clean Complete.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

deepClean();
