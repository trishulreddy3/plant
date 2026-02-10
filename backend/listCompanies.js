const { Company } = require('./models_sql');
const { sequelize } = require('./db/postgres');

const list = async () => {
    try {
        await sequelize.authenticate();
        const companies = await Company.findAll();
        console.log('COMPANIES IN DB:');
        companies.forEach(c => {
            console.log(`- ${c.companyName} (ID: ${c.companyId})`);
        });
    } catch (err) {
        console.error('DATABASE ERROR:', err.name);
        console.error('MESSAGE:', err.message);
        if (err.parent) {
            console.error('PARENT ERROR:', err.parent.message);
        }
    } finally {
        process.exit();
    }
};

list();
