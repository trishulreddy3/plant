const mongoose = require('mongoose');
const Company = require('../models/Plant');
require('dotenv').config({ path: '../.env.development' });

const debugStaff = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const companies = await Company.find({});
        console.log('Total Companies found:', companies.length);

        companies.forEach(company => {
            console.log(`\n--- Company: ${company.companyName} (ID: ${company.companyId}) ---`);
            console.log('Admin:', company.admin ? company.admin.email : 'NONE');
            console.log('Management count:', company.management.length);
            company.management.forEach(m => console.log(`  - ${m.email} (${m.role}) [Pass: ${m.password ? 'YES' : 'NO'}]`));
            console.log('Technicians count:', company.technicians.length);
            company.technicians.forEach(t => console.log(`  - ${t.email} (${t.role}) [Pass: ${t.password ? 'YES' : 'NO'}]`));
            console.log('Entries count:', company.entries.length);
            company.entries.forEach(e => console.log(`  - ${e.email} (${e.role}) [Pass: ${e.password ? 'YES' : 'NO'}]`));
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debugStaff();
