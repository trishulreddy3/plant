const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

async function syncMetadata() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        console.log('Connected to DB.');

        const liveDataCol = db.collection('live_data');
        const records = await liveDataCol.find({}).toArray();

        for (const record of records) {
            // Count pX_v fields to guess split if missing
            const keys = Object.keys(record).filter(k => /^p\d+_v$/.test(k));
            const total = keys.length;

            if (record.panelsTop === undefined || record.panelsTop === 0) {
                const top = Math.ceil(total / 2);
                const bottom = total - top;

                await liveDataCol.updateOne(
                    { _id: record._id },
                    { $set: { panelsTop: top, panelsBottom: bottom } }
                );
                console.log(`Updated ${record.node}: set panelsTop=${top}, panelsBottom=${bottom}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

syncMetadata();
