const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

async function forceUpdate() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        console.log('Connected to DB.');

        // 1. COMPLETELY WIPE plantDetails.live_data from all companies
        const companiesCol = db.collection('companies');
        await companiesCol.updateMany({}, { $unset: { "plantDetails.live_data": "" } });
        console.log('Unset plantDetails.live_data from all company documents.');

        // 2. Fetch existing data (if we have it in the new collection) to transform or just start fresh if needed
        // Since I want to make sure it's EXACT, I'll drop and rebuild from my previous migration's data or just transform it.
        const liveDataCol = db.collection('live_data');
        const existingRecords = await liveDataCol.find({}).toArray();

        await liveDataCol.deleteMany({});
        console.log('Cleared live_data collection for exact rebuild.');

        for (const record of existingRecords) {
            const row = {
                _id: record._id,
                companyId: record.companyId,
                node: record.node,
                time: record.time || new Date(),
                temparature: record.temperature || 25, // Convert temperature -> temparature
                lightintensity: record.lightIntensity || 1000, // Convert lightIntensity -> lightintensity
                current: record.current || 0
            };

            // Re-map panels to non-padded version: p1_v, p2_v...
            // Find all pXX_v keys
            const pKeys = Object.keys(record).filter(k => /^p\d+_v$/.test(k)).sort();
            pKeys.forEach((oldKey, i) => {
                const newKey = `p${i + 1}_v`; // p1_v, p2_v
                row[newKey] = record[oldKey];
            });

            await liveDataCol.insertOne(row);
        }

        console.log('Rebuilt live_data with exact field names.');
    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

forceUpdate();
