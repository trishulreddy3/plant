
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

const CompanySchema = new mongoose.Schema({
    companyId: String
}, { strict: false });

const Company = mongoose.model('Company', CompanySchema);

async function cleanSchema() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB for Cleanup');

        const result = await Company.updateMany({}, {
            $unset: {
                "plantDetails.voltagePerPanel": "",
                "plantDetails.currentPerPanel": "",
                "plantDetails.powerPerPanel": "",
                // Clean up any other potential leftovers
                "plantDetails.tables.$[].panelsTop": "",
                "plantDetails.tables.$[].panelsBottom": "",
                "plantDetails.tables.$[].topPanels": "",
                "plantDetails.tables.$[].bottomPanels": ""
            }
        });

        console.log(`Cleaned up ${result.modifiedCount} documents.`);
        console.log('Fields cleared: voltagePerPanel, currentPerPanel, powerPerPanel, and legacy table fields.');

    } catch (err) {
        console.error('Cleanup Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

cleanSchema();
