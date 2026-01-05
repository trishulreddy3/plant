const mongoose = require('mongoose');
const path = require('path');
const LiveData = require('./models/LiveData');
const Company = require('./models/Plant');
const panelLogic = require('./scripts/DB_scripts/panel_logic');
require('dotenv').config({ path: path.join(__dirname, '../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';
const COMPANY_ID = 'company-1766814585804'; // From user logs
const TABLE_ID = 'TBL-0001';

async function runTest() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB.');

        // 1. Initial State
        let record = await LiveData.findOne({ companyId: COMPANY_ID, node: TABLE_ID });
        console.log(`Initial Current: ${record.current}`);
        console.log(`Initial P21_v: ${record.p21_v}`); // TBL-0001.BOTTOM.P1 (index 0) if 20 top panels

        // 2. Make Fault (Bottom P1, Index 0)
        console.log('\n--- Making Fault on BOTTOM P1 (Index 0) ---');
        await panelLogic.updatePanelCurrent(COMPANY_ID, {
            tableId: TABLE_ID,
            position: 'bottom',
            index: 0,
            current: 2.0,
            voltage: 4.0 // Very low voltage
        });

        record = await LiveData.findOne({ companyId: COMPANY_ID, node: TABLE_ID });
        console.log(`Faulty Current: ${record.current} (Expected ~2.0)`);
        console.log(`Faulty P21_v: ${record.p21_v} (Expected ~4.0)`);

        // 3. Resolve Fault
        console.log('\n--- Resolving Fault on BOTTOM P1 (Index 0) ---');
        await panelLogic.resolvePanel(COMPANY_ID, {
            tableId: TABLE_ID,
            position: 'bottom',
            index: 0
        });

        record = await LiveData.findOne({ companyId: COMPANY_ID, node: TABLE_ID });
        const company = await Company.findOne({ companyId: COMPANY_ID });
        const cp = company.plantDetails.currentPerPanel || 9.9;

        console.log(`Resolved Current: ${record.current} (Expected close to ${cp})`);
        console.log(`Resolved P21_v: ${record.p21_v} (Expected ~20.0)`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
