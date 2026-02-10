const { SuperAdmin, Company, User } = require('./models_sql');
const bcrypt = require('bcryptjs');

const seedSuperAdmin = async () => {
    try {
        const email = 'superadmin@gmail.com';
        const password = 'superadmin@123';
        const companyName = 'microsyslogic';
        const companyId = 'company-superadmin';

        // 1. Seed Dedicated SuperAdmin Table (Legacy/Security)
        const existingSA = await SuperAdmin.findOne({ where: { email } });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (!existingSA) {
            await SuperAdmin.create({
                email,
                password: hashedPassword,
                companyName,
                role: 'super_admin'
            });
            console.log('Super Admin seeded in dedicated table.');
        }

        // 2. Seed Company Registry
        const existingCompany = await Company.findOne({ where: { companyName } });
        if (!existingCompany) {
            await Company.create({
                companyId,
                companyName,
                plantPowerKW: 0,
                voltagePerPanel: 20,
                currentPerPanel: 10
            });
            console.log('Microsyslogic company seeded in registry.');
        }

        // 3. Seed Global User Table
        const existingUser = await User.findOne({ where: { email } });
        if (!existingUser) {
            await User.create({
                userId: 'user-superadmin',
                email,
                password: hashedPassword,
                name: 'Super Admin',
                role: 'super_admin',
                companyId: companyId,
                accountStatus: 'active'
            });
            console.log('Super Admin seeded in global user table.');
        }

        // 4. Seed Tenant Schema
        try {
            const { getCompanyStaffModel } = require('./utils/dynamicModel');
            const TenantUser = await getCompanyStaffModel(companyName);
            const existingTenantUser = await TenantUser.findOne({ where: { email } });
            if (!existingTenantUser) {
                await TenantUser.create({
                    userId: 'user-superadmin',
                    email,
                    name: 'Super Admin',
                    role: 'super_admin',
                    password: hashedPassword,
                    phoneNumber: ''
                });
                console.log('Super Admin seeded in tenant schema.');
            }
        } catch (tenantErr) {
            console.warn('Failed to seed tenant schema:', tenantErr.message);
        }

    } catch (error) {
        console.error('Error seeding Super Admin:', error);
    }
};

module.exports = seedSuperAdmin;
