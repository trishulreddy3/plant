const { thingsboardSequelize } = require('../db/thingsboard');
const { QueryTypes } = require('sequelize');

/**
 * Get Latest Fault Data for a device from ThingsBoard
 */
exports.getLatestFaults = async (req, res) => {
    try {
        const { deviceId } = req.params; // Expecting '03672710-fc15-11f0-89b7-3d7c3589f5d6'

        const query = `
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

        const results = await thingsboardSequelize.query(query, {
            replacements: { deviceId },
            type: QueryTypes.SELECT
        });

        // Format JSON values for frontend
        const formatted = results.map(row => ({
            ...row,
            data: JSON.parse(row.value || '{}')
        }));

        res.json(formatted);
    } catch (error) {
        console.error('[TB Controller] Error fetching latest faults:', error);
        res.status(500).json({ error: 'Failed to fetch latest faults from ThingsBoard' });
    }
};

/**
 * Get Historical Fault Data for a device from ThingsBoard
 */
exports.getHistoricalFaults = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { start, end } = req.query; // ms timestamps

        const query = `
            SELECT
                ts.ts AS timestamp_ms,
                kd.key AS key_name,
                ts.str_v AS value
            FROM ts_kv ts
            JOIN device d ON ts.entity_id = d.id
            JOIN key_dictionary kd ON ts.key = kd.key_id
            WHERE d.id = :deviceId::uuid
              AND kd.key LIKE 'fault_n%'
              AND ts.ts >= :start
              AND ts.ts <= :end
            ORDER BY ts.ts DESC, kd.key;
        `;

        const results = await thingsboardSequelize.query(query, {
            replacements: {
                deviceId,
                start: parseInt(start),
                end: parseInt(end)
            },
            type: QueryTypes.SELECT
        });

        const formatted = results.map(row => ({
            ...row,
            data: JSON.parse(row.value || '{}')
        }));

        res.json(formatted);
    } catch (error) {
        console.error('[TB Controller] Error fetching historical faults:', error);
        res.status(500).json({ error: 'Failed to fetch historical faults from ThingsBoard' });
    }
};

/**
 * Get All Fault Data for a device from ThingsBoard
 */
exports.getAllFaults = async (req, res) => {
    try {
        const { deviceId } = req.params;

        const query = `
            SELECT
                ts.ts AS timestamp_ms,
                kd.key AS key_name,
                ts.str_v AS value
            FROM ts_kv ts
            JOIN device d ON ts.entity_id = d.id
            JOIN key_dictionary kd ON ts.key = kd.key_id
            WHERE d.id = :deviceId::uuid
              AND kd.key LIKE 'fault_n%'
            ORDER BY ts.ts DESC, kd.key;
        `;

        const results = await thingsboardSequelize.query(query, {
            replacements: { deviceId },
            type: QueryTypes.SELECT
        });

        const formatted = results.map(row => ({
            ...row,
            data: JSON.parse(row.value || '{}')
        }));

        res.json(formatted);
    } catch (error) {
        console.error('[TB Controller] Error fetching all faults:', error);
        res.status(500).json({ error: 'Failed to fetch all faults from ThingsBoard' });
    }
};
