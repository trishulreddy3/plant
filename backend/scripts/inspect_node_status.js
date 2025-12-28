const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

async function inspectCollection() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const collection = db.collection('node_fault_status');

        const latestDocs = await collection.find({}).sort({ time: -1 }).limit(1).toArray();
        if (latestDocs.length > 0) {
            console.log('LATEST RECORD IN node_fault_status:');
            console.log(JSON.stringify(latestDocs[0], null, 2));
        } else {
            console.log('Collection is empty or does not exist yet.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

inspectCollection();
