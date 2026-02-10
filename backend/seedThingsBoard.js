const { Company, User, sequelize } = require('./models_sql');
const bcrypt = require('bcryptjs');

const seedThingsBoardCompany = async () => {
    try {
        const companyId = 'tb-test-01';
        const companyName = 'ThingsBoard Test Company';
        const adminEmail = 'tbadmin@pm.com';
        const adminPassword = 'thingsboard';
        const deviceId = '03672710-fc15-11f0-89b7-3d7c3589f5d6';

        // Check if exists
        const existing = await Company.findByPk(companyId);
        if (existing) {
            console.log('ThingsBoard Test Company already exists.');
            return;
        }

        console.log('Seeding ThingsBoard Test Company...');

        // Create Company
        await Company.create({
            companyId,
            companyName,
            voltagePerPanel: 20,
            currentPerPanel: 10,
            plantPowerKW: 100,
            dataSource: 'thingsboard',
            externalDeviceId: deviceId
        });

        // Create Admin User
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        await User.create({
            userId: `admin-tb-${Date.now()}`,
            email: adminEmail,
            password: hashedPassword,
            role: 'admin',
            companyId: companyId,
            companyName: companyName,
            userName: 'TB Admin',
            status: 'active'
        });

        console.log('ThingsBoard Test Company seeded successfully!');
        console.log('Login Email: tbadmin@pm.com / Password: thingsboard');
    } catch (error) {
        console.error('Error seeding ThingsBoard company:', error);
    }
};

if (require.main === module) {
    seedThingsBoardCompany().then(() => process.exit());
}

module.exports = seedThingsBoardCompany;
