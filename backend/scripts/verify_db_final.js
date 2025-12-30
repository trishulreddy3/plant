const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

async function verify() {
    try {
        await mongoose.connect(MONGO_URI);
        const Company = mongoose.model('Company', new mongoose.Schema({ companyId: String, companyName: String, plantDetails: Object }, { strict: false }));

        const companies = await Company.find({});
        console.log('--- COMPANIES IN DB ---');
        companies.forEach(c => {
            console.log(`ID: ${c.companyId}, Name: ${c.companyName}, Has live_data array: ${Array.isArray(c.plantDetails?.live_data)}`);
        });

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\n--- COLLECTIONS ---');
        collections.forEach(col => console.log(`- ${col.name}`));

        const liveDataCount = await mongoose.connection.db.collection('live_data').countDocuments();
        console.log(`\n--- live_data collection count: ${liveDataCount} ---`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
verify();
