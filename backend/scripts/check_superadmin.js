
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI;
const SuperAdmin = require('../models/SuperAdmin');

async function checkSuperAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        const sas = await SuperAdmin.find({});
        console.log('--- SuperAdmins ---');
        sas.forEach(s => {
            console.log(`Email: ${s.email}, Status: ${s.accountStatus}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkSuperAdmin();
