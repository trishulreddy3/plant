
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

const CompanySchema = new mongoose.Schema({
    companyId: String,
    plantDetails: { type: mongoose.Schema.Types.Mixed }
}, { strict: false });

const Company = mongoose.model('Company', CompanySchema);

// ID of the main company
const COMPANY_ID = 'company-1766814585804'; // From your previous outputs

async function debugCreateTable() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        const company = await Company.findOne({ companyId: COMPANY_ID });
        if (!company) {
            console.log('Company not found');
            return;
        }

        console.log('--- Current DB State ---');
        const tables = company.plantDetails.live_data || [];
        console.log(`Found ${tables.length} tables.`);
        tables.forEach((t, i) => console.log(`[${i}] Node: ${t.node}, Serial: ${t.serialNumber}, ID: ${t.id}`));

        // Simulate MaxNum Logic
        let maxNum = 0;
        tables.forEach(t => {
            // Check both node and serialNumber just in case
            const label = t.node || t.serialNumber;
            const parts = label ? label.split('-') : [];
            if (parts.length === 2) {
                const num = parseInt(parts[1]);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });

        console.log(`Calculated MaxNum: ${maxNum}`);
        const nextNum = maxNum + 1;
        const nextLabel = `TBL-${String(nextNum).padStart(4, '0')}`;
        console.log(`Next Table would be: ${nextLabel}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

debugCreateTable();
