const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env.development' });
const connectDB = require('../db/db');
const LoginDetails = require('../models/LoginDetails');
const Company = require('../models/Plant');

async function debugDB() {
    try {
        await connectDB();
        console.log('--- DB DEBUG: LoginDetails (Isolated Table) ---');
        const allDetails = await LoginDetails.find({}).limit(5);
        allDetails.forEach(d => {
            console.log(`User: ${d.userName}, Company: ${d.companyId}, Status: ${d.accountStatus}, Sessions: ${d.sessions.length}`);
        });

        console.log('\n--- DB DEBUG: Companies (Embedded Sync) ---');
        const companies = await Company.find({}).limit(2);
        for (const company of companies) {
            console.log(`Company: ${company.companyName}`);
            const adminSessions = company.admin?.loginDetails?.sessions?.length || 0;
            console.log(`  Admin Sessions: ${adminSessions}`);

            const entries = company.entries || [];
            entries.forEach(e => {
                const name = e.loginCredentials?.userName || e.name || 'Unknown';
                const sessionCount = e.loginDetails?.sessions?.length || 0;
                console.log(`  Staff: ${name}, Sessions: ${sessionCount}`);
            });
        }
        process.exit(0);
    } catch (err) {
        console.error('Debug failed:', err);
        process.exit(1);
    }
}

debugDB();
