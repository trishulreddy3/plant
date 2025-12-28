
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI;

const CompanySchema = new mongoose.Schema({
    companyId: String,
    companyName: String,
    admin: { type: mongoose.Schema.Types.Mixed },
    management: [mongoose.Schema.Types.Mixed],
    technicians: [mongoose.Schema.Types.Mixed]
}, { strict: false });

const LoginCredentialsSchema = new mongoose.Schema({
    email: String,
    companyName: String,
    role: String
}, { strict: false });

const Company = mongoose.model('Company', CompanySchema);
const LoginCredentials = mongoose.model('LoginCredentials', LoginCredentialsSchema);

async function checkAuthData() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB.');

        const creds = await LoginCredentials.find({});
        console.log(`\n--- LoginCredentials (${creds.length}) ---`);
        creds.forEach(c => {
            console.log(`Email: ${c.email}, Company: ${c.companyName}, Role: ${c.role}`);
        });

        const companies = await Company.find({});
        console.log(`\n--- Companies (${companies.length}) ---`);
        companies.forEach(c => {
            console.log(`\nCompany: ${c.companyName} (${c.companyId})`);
            console.log(`Admin email: ${c.admin?.email || 'NONE'}`);
            console.log(`Management count: ${c.management?.length || 0}`);
            if (c.management?.length > 0) {
                c.management.forEach(m => console.log(`  - ${m.email}`));
            }
            console.log(`Technicians count: ${c.technicians?.length || 0}`);
            if (c.technicians?.length > 0) {
                c.technicians.forEach(t => console.log(`  - ${t.email}`));
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkAuthData();
