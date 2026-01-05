
const mongoose = require('mongoose');

const connectDB = async () => {
    if (!process.env.MONGODB_URI) {
        console.error('FATAL ERROR: MONGODB_URI environment variable is not defined.');
        console.error('Please set MONGODB_URI in your environment variables (e.g. Render Dashboard).');
        process.exit(1);
    }

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // These options are no longer necessary in Mongoose 6+, but harmless
        });
        console.log(`MongoDB Connected: ${conn.connection.host}, DB: ${conn.connection.name}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
