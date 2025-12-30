const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

const LiveData = require('../models/LiveData');
const Company = require('../models/Plant');

async function migrateToFlatLiveData() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB.');

        // Clear existing live_data collection to start fresh
        await LiveData.deleteMany({});
        console.log('Cleared existing LiveData collection.');

        const companies = await Company.find({});
        for (const company of companies) {
            const rawPd = company.toObject().plantDetails;
            if (rawPd && rawPd.live_data) {
                console.log(`Processing company: ${company.companyId}`);

                // Handle both Map (Object) and Array
                const tables = (typeof rawPd.live_data === 'object' && !Array.isArray(rawPd.live_data))
                    ? Object.values(rawPd.live_data)
                    : (Array.isArray(rawPd.live_data) ? rawPd.live_data : []);

                for (const table of tables) {
                    const row = {
                        companyId: company.companyId,
                        node: table.node || table.serialNumber || table.id,
                        time: table.time || new Date(),
                        temperature: table.temperature || 25,
                        lightIntensity: table.lightIntensity || 1000,
                        current: table.current || 0
                    };

                    // Flatten panel voltages
                    const voltages = table.panelVoltages || [];
                    voltages.forEach((v, i) => {
                        const pNum = (i + 1).toString().padStart(2, '0');
                        row[`p${pNum}_v`] = v;
                    });

                    await new LiveData(row).save();
                }

                // Remove live_data from Company document
                await Company.updateOne(
                    { _id: company._id },
                    { $unset: { "plantDetails.live_data": "" } }
                );

                console.log(`Migrated ${tables.length} tables for ${company.companyId} and unset redundant field.`);
            }
        }
        console.log('Migration to flat LiveData collection complete.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

migrateToFlatLiveData();
