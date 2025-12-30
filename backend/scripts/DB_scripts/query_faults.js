const mongoose = require('mongoose');
require('dotenv').config({ path: '../../../.env.development' });
const connectDB = require('../../db/db');
const panelLogic = require('./panel_logic');

/**
 * query-faults.js
 * 
 * CLI tool to query faulty panels across a company.
 * Usage: node query-faults.js <companyId> [conditionLabel: G/M/B]
 */

async function main() {
    try {
        const companyId = process.argv[2];
        const conditionLabel = process.argv[3] || 'B'; // Default to Bad (B)

        if (!companyId) {
            console.log('Usage: node query-faults.js <companyId> [conditionLabel: G/M/B]');
            process.exit(1);
        }

        await connectDB();

        console.log(`--- Querying Faults for: ${companyId} (Label: ${conditionLabel}) ---`);

        const results = await panelLogic.queryFaults({
            companyId,
            conditionLabel
        });

        if (results.length === 0) {
            console.log('No faults found matching the criteria.');
        } else {
            console.log(JSON.stringify(results, null, 2));
            console.log(`\nTotal faulty sets found: ${results.length}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Query failed:', err.message);
        process.exit(1);
    }
}

main();