
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

// Define a minimal schema to read the raw data
const CompanySchema = new mongoose.Schema({}, { strict: false });
const Company = mongoose.model('Company', CompanySchema);

async function checkState() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log(`Connected to MongoDB at host: ${mongoose.connection.host}, DB: ${mongoose.connection.name}`);

        const company = await Company.findOne({}); // Get one company
        if (!company) {
            console.log('No company found.');
            return;
        }

        console.log(`Checking Company: ${company.companyName} (${company.companyId})`);

        // Check plantDetails structure
        if (company.plantDetails && company.plantDetails.live_data && company.plantDetails.live_data.length > 0) {
            company.plantDetails.live_data.forEach((table, idx) => {
                console.log(`\n--- Table ${idx + 1}: ${table.node || table.serialNumber} ---`);
                console.log('ID:', table.id);
                console.log('Panel Voltages Count:', table.panelVoltages ? table.panelVoltages.length : 'MISSING');
                console.log('Current:', table.current);
                if (table.panelVoltages && table.panelVoltages.length === 0) {
                    console.log('WARNING: panelVoltages is empty array!');
                }
            });
        } else {
            console.log('No tables found in plantDetails (live_data).');
        }


    } catch (err) {
        console.error('Error:', err);
    } finally {
        // This block will not be reached if process.exit(0) is called
        // await mongoose.disconnect();
    }
}

checkState();
