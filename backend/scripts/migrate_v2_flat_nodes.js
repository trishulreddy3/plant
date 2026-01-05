
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

const CompanySchema = new mongoose.Schema({
    companyId: String,
    plantDetails: {
        tables: []
    }
}, { strict: false });

const Company = mongoose.model('Company', CompanySchema);

// Defaults
const DEFAULT_TEMP = 30;
const DEFAULT_LIGHT = 950;
const DEFAULT_CURRENT = 9.5;

async function migrate() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB for Migration');

        const companies = await Company.find({});
        console.log(`Found ${companies.length} companies.`);

        for (const company of companies) {
            console.log(`Migrating Company: ${company.companyId}`);
            if (!company.plantDetails || !Array.isArray(company.plantDetails.tables)) {
                console.log(' - No tables found, skipping.');
                continue;
            }

            let updatedCount = 0;
            const newTables = company.plantDetails.tables.map(table => {
                // Check if already migrated
                if (table.panelVoltages && !table.topPanels) {
                    return table;
                }

                console.log(` - Migrating table ${table.serialNumber || table.id}...`);
                updatedCount++;

                // Extract Voltages
                let vTop = [];
                let vBottom = [];

                if (table.topPanels && Array.isArray(table.topPanels.voltage)) {
                    vTop = table.topPanels.voltage;
                }
                if (table.bottomPanels && Array.isArray(table.bottomPanels.voltage)) {
                    vBottom = table.bottomPanels.voltage;
                }

                // If no voltages but counts exist, generate dummies
                if (vTop.length === 0 && table.panelsTop > 0) {
                    vTop = Array(table.panelsTop).fill(38.5);
                }
                if (vBottom.length === 0 && table.panelsBottom > 0) {
                    vBottom = Array(table.panelsBottom).fill(38.5);
                }

                const allVoltages = [...vTop, ...vBottom];

                // Create new flat structure
                const newTable = {
                    node: table.serialNumber || `TBL-${table.id}`,
                    time: new Date(),
                    temperature: DEFAULT_TEMP + (Math.random() * 5),
                    lightIntensity: DEFAULT_LIGHT + (Math.random() * 100),
                    current: table.current || DEFAULT_CURRENT,
                    panelVoltages: allVoltages,

                    // Keep some legacy IDs for safety
                    id: table.id,
                    serialNumber: table.serialNumber,
                    panelsCount: allVoltages.length
                };

                return newTable;
            });

            if (updatedCount > 0) {
                // Mongoose mixed/array update requires marking modified
                company.plantDetails.tables = newTables;
                company.markModified('plantDetails');
                await company.save();
                console.log(` - Saved ${updatedCount} tables for ${company.companyId}.`);
            } else {
                console.log(' - No tables needed migration.');
            }
        }

        console.log('Migration Complete.');

    } catch (err) {
        console.error('Migration Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
