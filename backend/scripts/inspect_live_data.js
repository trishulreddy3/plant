const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

async function inspectFlatLiveData() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const collection = db.collection('live_data');

        console.log('--- CONTENT OF live_data COLLECTION ---');
        const docs = await collection.find({}).limit(5).toArray();
        docs.forEach(doc => {
            console.log(JSON.stringify(doc, null, 2));
            console.log('---------------------------------------');
        });

        const count = await collection.countDocuments();
        console.log(`Total records in live_data: ${count}`);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

inspectFlatLiveData();
