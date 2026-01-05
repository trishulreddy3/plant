const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const company = await db.collection('companies').findOne({ companyId: 'company-1766814585804' });

        console.log('--- COMPANY DOCUMENT (PLANT DETAILS) ---');
        console.log(JSON.stringify(company.plantDetails, null, 2));

        console.log('\n--- LIVE_DATA COLLECTION SAMPLES ---');
        const liveData = await db.collection('live_data').find({}).limit(1).toArray();
        console.log(JSON.stringify(liveData, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
check();
