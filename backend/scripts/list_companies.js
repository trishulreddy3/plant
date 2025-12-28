
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

const CompanySchema = new mongoose.Schema({
    companyId: String,
    companyName: String,
    plantDetails: { type: mongoose.Schema.Types.Mixed }
}, { strict: false });

const Company = mongoose.model('Company', CompanySchema);

async function listCompanies() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB.');

        const companies = await Company.find({});
        console.log(`Found ${companies.length} companies.`);

        companies.forEach(c => {
            const tables = c.plantDetails?.live_data || [];
            console.log(`\n------------------------------------------------`);
            console.log(`Name: ${c.companyName}`);
            console.log(`ID:   ${c.companyId}`);
            console.log(`ID (_id): ${c._id}`);
            if (tables.length > 0) {
                console.log(`Tables:`);
                tables.forEach(t => console.log(`  - Node: ${t.node}, ID: ${t.id}, Serial: ${t.serialNumber}`));
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

listCompanies();
