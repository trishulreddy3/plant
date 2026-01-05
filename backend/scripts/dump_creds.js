
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI;

// Use the actual model to avoid any collection mismatch
const LoginCredentials = require('../models/LoginCredentials');

async function dumpCredentials() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB.');

        const creds = await LoginCredentials.find({});
        console.log(`\n--- LoginCredentials Dump (${creds.length}) ---`);
        creds.forEach(c => {
            console.log(JSON.stringify({
                email: c.email,
                companyName: c.companyName,
                companyId: c.companyId,
                role: c.role,
                userName: c.userName
            }, null, 2));
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

dumpCredentials();
