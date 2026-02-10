const { sequelize } = require('./backend/models_sql/index');
async function check() {
    try {
        const [results] = await sequelize.query('SELECT * FROM "tenant_utl"."live_data"');
        console.log('--- Nodes in tenant_utl ---');
        console.log(JSON.stringify(results, null, 2));

        const [companies] = await sequelize.query('SELECT * FROM "Companies"');
        console.log('--- Companies Registry ---');
        console.log(JSON.stringify(companies, null, 2));
    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}
check();
