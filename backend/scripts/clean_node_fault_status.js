const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

async function cleanHistory() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        console.log('Connected to DB.');

        const collection = db.collection('node_fault_status');
        const count = await collection.countDocuments();
        console.log(`Found ${count} records in node_fault_status.`);

        // Delete all because they appear to be spam/malformed based on user report
        await collection.deleteMany({});
        console.log('Successfully deleted all records from node_fault_status.');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

cleanHistory();
