const { Sequelize, QueryTypes } = require('sequelize');
require('dotenv').config();

// Direct ThingsBoard Connection (Ignoring main DB)
const thingsboardSequelize = new Sequelize(
    process.env.TB_DB_NAME || 'thingsboard',
    process.env.TB_DB_USER || 'thingsboard',
    process.env.TB_DB_PASSWORD || 'thingsboard',
    {
        host: 'localhost', // Or your server IP
        dialect: 'postgres',
        port: 5433,
        logging: false,
    }
);

const testTB = async () => {
    try {
        console.log('--- TESTING THINGSBOARD CONNECTION ---');
        await thingsboardSequelize.authenticate();
        console.log('✅ Connection Successful!');

        const deviceId = '03672710-fc15-11f0-89b7-3d7c3589f5d6';

        // 1. Get Latest Fault Table (Your Query)
        console.log('\n--- FETCHING LATEST FAULTS ---');
        const latestQuery = `
            SELECT
                ts.ts AS timestamp_ms,
                kd.key AS key_name,
                ts.str_v AS value
            FROM ts_kv ts
            JOIN device d ON ts.entity_id = d.id
            JOIN key_dictionary kd ON ts.key = kd.key_id
            WHERE d.id = :deviceId::uuid
              AND kd.key LIKE 'fault_n%'
              AND ts.ts = (
                  SELECT MAX(ts2.ts)
                  FROM ts_kv ts2
                  WHERE ts2.entity_id = d.id
              )
            ORDER BY kd.key;
        `;

        const results = await thingsboardSequelize.query(latestQuery, {
            replacements: { deviceId },
            type: QueryTypes.SELECT
        });

        if (results.length === 0) {
            console.log('⚠️ No data found for this device ID.');
        } else {
            results.forEach(row => {
                console.log(`[${new Date(parseInt(row.timestamp_ms)).toLocaleString()}] ${row.key_name}: ${row.value}`);
            });
        }

    } catch (error) {
        console.error('❌ ERROR:', error.message);
    } finally {
        await thingsboardSequelize.close();
        process.exit();
    }
};

testTB();
