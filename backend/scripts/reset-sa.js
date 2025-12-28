const mongoose = require('mongoose');
const SuperAdmin = require('../models/SuperAdmin');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env.development' });

const resetSA = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Delete existing
        await SuperAdmin.deleteMany({});
        console.log('Cleared SuperAdmins');

        // Create fresh
        const sa = new SuperAdmin({
            email: 'superadmin@gmail.com',
            password: 'superadmin@123', // Will be hashed by pre-save
            role: 'admin',
            name: 'Super Admin',
            companyName: 'microsyslogic'
        });

        await sa.save();
        console.log('Created fresh Super Admin');

        // Verify
        const saved = await SuperAdmin.findOne({ email: 'superadmin@gmail.com' });
        const isMatch = await saved.matchPassword('superadmin@123');
        console.log('Immediate Verification Match:', isMatch);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

resetSA();
