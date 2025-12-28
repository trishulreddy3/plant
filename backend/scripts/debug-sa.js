const mongoose = require('mongoose');
const SuperAdmin = require('../models/SuperAdmin');
const path = require('path');
require('dotenv').config({ path: '../.env.development' });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const admin = await SuperAdmin.findOne({ email: 'superadmin@gmail.com' });
        console.log('Found Admin:', admin);

        if (admin) {
            const isMatch = await admin.matchPassword('superadmin@123');
            console.log('Password Match for "superadmin@123":', isMatch);
        } else {
            console.log('Super Admin not found in DB');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

connectDB();
