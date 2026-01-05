const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

// Simple schema to get the data
const Company = mongoose.model('Company', new mongoose.Schema({
    companyId: String,
    plantDetails: mongoose.Schema.Types.Mixed
}, { strict: false }));

async function forceMigration() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB.');

        const companies = await Company.find({});
        for (const company of companies) {
            if (company.plantDetails && company.plantDetails.live_data && Array.isArray(company.plantDetails.live_data)) {
                console.log(`Migrating ${company.companyId}...`);
                const oldArr = company.plantDetails.live_data;
                const newMap = {};

                oldArr.forEach(table => {
                    const key = table.node || table.serialNumber || table.id || `node_${Date.now()}`;
                    newMap[key] = table;
                });

                // Directly replace the field
                await Company.updateOne(
                    { _id: company._id },
                    { $set: { "plantDetails.live_data": newMap } }
                );
                console.log(`Successfully migrated ${company.companyId} to Object-based live_data.`);
            } else {
                console.log(`Company ${company.companyId} already migrated or has no live_data.`);
            }
        }
        console.log('Force migration complete.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

forceMigration();
