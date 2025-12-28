const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

async function clearOldData() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const collection = db.collection('node_fault_status');

        console.log('Clearing old node_fault_status records...');
        const result = await collection.deleteMany({});
        console.log(`Deleted ${result.deletedCount} old records.`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

clearOldData();
