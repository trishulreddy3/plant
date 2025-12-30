const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

const tableSchema = new mongoose.Schema({
    node: String,
    time: Date,
    temperature: Number,
    lightIntensity: Number,
    current: Number,
    panelVoltages: [Number],
    id: String,
    serialNumber: String,
    panelsCount: Number,
    panelsTop: Number,
    panelsBottom: Number
}, { _id: false });

const CompanySchema = new mongoose.Schema({
    companyId: String,
    plantDetails: {
        live_data: {
            type: Map,
            of: tableSchema
        }
    }
}, { strict: false });

const Company = mongoose.model('Company', CompanySchema);

async function migrateToArrayToMap() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB.');

        const companies = await Company.find({});
        for (const company of companies) {
            const rawPd = company.toObject().plantDetails;
            if (rawPd && Array.isArray(rawPd.live_data)) {
                console.log(`Migrating company: ${company.companyId}`);
                const oldArr = rawPd.live_data;

                // Clear and rebuild as Map
                company.plantDetails.live_data = new Map();
                oldArr.forEach(table => {
                    const key = table.node || table.serialNumber || table.id || `UNKNOWN-${Date.now()}`;
                    company.plantDetails.live_data.set(key, table);
                });

                company.markModified('plantDetails');
                await company.save();
                console.log(`Migrated ${oldArr.length} tables for ${company.companyId}`);
            }
        }
        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

migrateToArrayToMap();
