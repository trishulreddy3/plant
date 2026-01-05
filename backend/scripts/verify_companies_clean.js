const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

async function checkCompanies() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const companies = await db.collection('companies').find({}).toArray();

        companies.forEach(c => {
            console.log(`Company: ${c.companyName}`);
            console.log(`plantDetails keys: ${Object.keys(c.plantDetails || {})}`);
            if (c.plantDetails && c.plantDetails.live_data) {
                console.log('ERROR: live_data still exists in plantDetails!');
            } else {
                console.log('SUCCESS: live_data is NOT in plantDetails.');
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
checkCompanies();
