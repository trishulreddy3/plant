
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI;
const LoginCredentials = require('../models/LoginCredentials');
const LoginDetails = require('../models/LoginDetails');
const Company = require('../models/Plant');

async function wipeStaff() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB.');

        // 1. Wipe LoginCredentials for non-admin roles
        const resultCreds = await LoginCredentials.deleteMany({
            role: { $nin: ['admin', 'plant_admin', 'super_admin'] }
        });
        console.log(`Deleted ${resultCreds.deletedCount} non-admin credentials.`);

        // 2. Wipe LoginDetails for those users
        // Since we don't have a direct role filter in LoginDetails, we'll sync by userId from the deleted credentials if possible, 
        // but it's simpler to just delete all where there's no matching credential.
        const allCreds = await LoginCredentials.find({}, 'userId');
        const activeUserIds = allCreds.map(c => c.userId);
        const resultDetails = await LoginDetails.deleteMany({
            userId: { $nin: activeUserIds }
        });
        console.log(`Deleted ${resultDetails.deletedCount} orphaned login details.`);

        // 3. Clear staff arrays in all companies
        const companies = await Company.find({});
        for (const company of companies) {
            company.management = [];
            company.technicians = [];
            company.entries = [];
            company.markModified('management');
            company.markModified('technicians');
            company.markModified('entries');
            await company.save();
            console.log(`Cleared staff arrays for company: ${company.companyName}`);
        }

        console.log('Wipe complete. Database is now clean.');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

wipeStaff();
