
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

const CompanySchema = new mongoose.Schema({
    companyId: String,
    plantDetails: { type: mongoose.Schema.Types.Mixed }
}, { strict: false });

const Company = mongoose.model('Company', CompanySchema);

// Constants
const VP = 20;
const CP = 9.9;

async function fixPanels() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB for Panel Fix');

        const companies = await Company.find({});
        for (const company of companies) {
            if (!company.plantDetails || !Array.isArray(company.plantDetails.live_data)) continue;

            let modified = false;
            company.plantDetails.live_data.forEach(table => {
                // Ensure ID and Node
                if (!table.id) {
                    table.id = `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    modified = true;
                }
                if (!table.node) {
                    table.node = table.serialNumber || 'TBL-FIXED';
                    modified = true;
                }

                // Ensure Panel Counts
                if (!table.panelsCount || table.panelsCount === 0) {
                    // Try to guess from voltages
                    if (table.panelVoltages && table.panelVoltages.length > 0) {
                        table.panelsCount = table.panelVoltages.length;
                    } else {
                        table.panelsCount = 10; // Default
                    }
                    modified = true;
                }

                // Populate Voltages if missing
                if (!table.panelVoltages || table.panelVoltages.length === 0) {
                    console.log(`Fixing empty panels for table ${table.node}`);
                    table.panelVoltages = Array.from({ length: table.panelsCount }, () => {
                        return Number((VP + (Math.random() * 0.4 - 0.2)).toFixed(1));
                    });
                    modified = true;
                }

                // Ensure Current
                if (table.current === undefined || table.current === 0) {
                    table.current = CP;
                    modified = true;
                }

                // Ensure legacy fields gone
                if (table.topPanels) { delete table.topPanels; modified = true; }
                if (table.bottomPanels) { delete table.bottomPanels; modified = true; }
            });

            if (modified) {
                company.markModified('plantDetails');
                await company.save();
                console.log(`Fixed panels for company ${company.companyId}`);
            } else {
                console.log(`Company ${company.companyId} data is healthy.`);
            }
        }

    } catch (err) {
        console.error('Fix Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

fixPanels();
