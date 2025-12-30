const mongoose = require('mongoose');
const path = require('path');
const LiveData = require('./models/LiveData');
const panelLogic = require('./scripts/DB_scripts/panel_logic');
require('dotenv').config({ path: path.join(__dirname, '../.env.development') });

const MONGO_URI = process.env.MONGODB_URI;
const COMPANY_ID = 'company-1766814585804';
const TABLE_ID = 'TBL-0001';

async function runCheck() {
    try {
        await mongoose.connect(MONGO_URI);

        // 1. Make Fault TOP P4 (Index 3)
        console.log('--- Making Fault TOP P4 ---');
        await panelLogic.updatePanelCurrent(COMPANY_ID, {
            tableId: TABLE_ID,
            position: 'top',
            index: 3,
            current: 2.0,
            voltage: 5.0
        });

        // Verify
        let record = await LiveData.findOne({ companyId: COMPANY_ID, node: TABLE_ID });
        console.log(`Fault made. P4_v: ${record.p4_v} (Expected ~5.0), Current: ${record.current}`);

        // 2. Resolve Fault TOP P4
        console.log('--- Resolving Fault TOP P4 ---');
        await panelLogic.resolvePanel(COMPANY_ID, {
            tableId: TABLE_ID,
            position: 'top',
            index: 3
        });

        // Verify
        record = await LiveData.findOne({ companyId: COMPANY_ID, node: TABLE_ID });
        console.log(`Resolved. P4_v: ${record.p4_v} (Expected ~20.0), Current: ${record.current}`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

runCheck();
