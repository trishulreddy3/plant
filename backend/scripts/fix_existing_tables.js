
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI;

const CompanySchema = new mongoose.Schema({
    companyId: String,
    plantDetails: { type: mongoose.Schema.Types.Mixed }
}, { strict: false });

const Company = mongoose.model('Company', CompanySchema);

async function fixExistingTables() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB.');

        const companies = await Company.find({});
        for (const company of companies) {
            if (company.plantDetails && Array.isArray(company.plantDetails.live_data)) {
                let changed = false;
                company.plantDetails.live_data.forEach(table => {
                    const total = table.panelVoltages ? table.panelVoltages.length : (table.panelsCount || 0);

                    if (table.panelsTop === undefined || table.panelsBottom === undefined) {
                        // Guess distribution: 50/50
                        table.panelsTop = Math.ceil(total / 2);
                        table.panelsBottom = Math.floor(total / 2);
                        table.panelsCount = total;
                        changed = true;
                    }
                });

                if (changed) {
                    company.markModified('plantDetails');
                    await company.save();
                    console.log(`Fixed tables for company: ${company.companyId}`);
                }
            }
        }
        console.log('Fix complete.');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

fixExistingTables();
