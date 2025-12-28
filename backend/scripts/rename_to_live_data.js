
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

const CompanySchema = new mongoose.Schema({
    companyId: String,
    plantDetails: { type: mongoose.Schema.Types.Mixed }
}, { strict: false });

const Company = mongoose.model('Company', CompanySchema);

async function renameTables() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB.');

        // 1. Rename tables -> live_data
        const res = await Company.updateMany(
            { "plantDetails.tables": { $exists: true } },
            { $rename: { "plantDetails.tables": "plantDetails.live_data" } }
        );

        console.log(`Renamed fields in ${res.modifiedCount} documents.`);

        // 2. Double check and ensure it's an array
        const companies = await Company.find({});
        for (const company of companies) {
            if (company.plantDetails && company.plantDetails.live_data) {
                console.log(`Company ${company.companyId} has live_data with ${company.plantDetails.live_data.length} nodes.`);
            } else if (company.plantDetails && company.plantDetails.tables) {
                console.log(`WARNING: Company ${company.companyId} still has tables!`);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

renameTables();
