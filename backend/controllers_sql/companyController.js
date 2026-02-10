const { Company, User, LiveData, Ticket } = require('../models_sql');
const bcrypt = require('bcryptjs');

exports.getCompanies = async (req, res) => {
    try {
        const companies = await Company.findAll({
            include: [
                { model: User, attributes: ['email', 'role'] } // Just valid check
            ]
        });
        res.json(companies);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createCompany = async (req, res) => {
    try {
        const {
            companyId,
            companyName,
            voltagePerPanel,
            currentPerPanel,
            plantPowerKW,
            adminEmail,
            adminPassword,
            adminName
        } = req.body;

        console.log(`[CreateCompany] Attempt for: ${companyName}`);
        console.log(`[CreateCompany] Admin Email: ${adminEmail}`);
        console.log(`[CreateCompany] Password Received Length: ${adminPassword ? adminPassword.length : 'NULL/UNDEFINED'}`);

        if (!adminPassword || adminPassword.length < 4) {
            return res.status(400).json({ error: 'Admin password is too short or missing.' });
        }

        // 1. Check existing
        const existing = await Company.findByPk(companyId);
        if (existing) {
            return res.status(409).json({ error: 'Company exists' });
        }

        // 2. Create Company Record (Registry)
        const company = await Company.create({
            companyId,
            companyName,
            voltagePerPanel,
            currentPerPanel,
            plantPowerKW
        });

        // 3. Create Admin User (Global Registry)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const admin = await User.create({
            userId: `admin-${Date.now()}`,
            email: adminEmail,
            password: hashedPassword,
            name: adminName,
            role: 'plant_admin',
            companyId: companyId,
            accountStatus: 'active'
        });

        // 4. Create Tenant Schema & Admin User (Dedicated Isolation)
        try {
            const { getCompanyStaffModel } = require('../utils/dynamicModel');
            // This will automatically:
            // a) Create schema `tenant_<name>`
            // b) Create table `users` inside it
            // c) Return the Model
            const TenantUser = await getCompanyStaffModel(companyName);

            await TenantUser.create({
                userId: admin.userId, // Sync ID with Global
                companyName: companyName,
                userName: adminName,
                email: adminEmail,
                role: 'plant_admin', // or plant_admin
                password: hashedPassword,
                phoneNumber: '',
                status: 'inactive'
            });

            console.log(`[Success] Created Tenant Schema & Admin for ${companyName}`);

        } catch (tenantErr) {
            console.error(`[Error] Failed to initialize Tenant Schema for ${companyName}. Rolling back!`, tenantErr);

            // ROLLBACK: Delete the just-created registry entries to prevent "Zombie" companies
            await admin.destroy();
            await company.destroy();

            return res.status(500).json({
                error: 'Failed to initialize company database. Please try again. System rolled back.'
            });
        }

        res.status(201).json({ success: true, company, admin });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Company or Email already exists' });
        }
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getCompanyById = async (req, res) => {
    try {
        const company = await Company.findByPk(req.params.id, {
            include: [
                // We DON'T include LiveData here because it points to generic table
                { model: Ticket }
            ]
        });

        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Fetch Live Data from DEDICATED table in SCHEMA
        try {
            const { initializeTenantSchema } = require('../utils/dynamicModel');
            const models = await initializeTenantSchema(company.companyName);
            const tenantLiveData = await models.LiveData.findAll({ order: [['node', 'ASC']] });
            const tenantFaultData = await models.FaultTable.findAll();

            // Map p1v...p20v columns to panelVoltages array for frontend compatibility
            const mappedData = tenantLiveData.map(d => {
                const item = d.get({ plain: true });
                const faultRow = tenantFaultData.find(f => f.node === item.node);
                const voltages = [];
                const currents = [];
                const statuses = [];

                const pCount = item.panelCount || 20;
                for (let i = 1; i <= pCount; i++) {
                    voltages.push(item[`p${i}v`] || 0);
                    currents.push(item[`p${i}c`] || 0);
                    const s = faultRow ? faultRow[`p${i}`] : 'G';
                    statuses.push(s === 'B' ? 'bad' : s === 'M' ? 'moderate' : 'good');
                }
                return {
                    ...item,
                    id: item.node, // Frontend compatibility
                    serialNumber: item.node, // Legacy UI support
                    panelVoltages: voltages,
                    panelCurrents: currents,
                    panelStatuses: statuses
                };
            });

            const companyJson = company.toJSON();
            companyJson.live_data = mappedData;
            companyJson.tables = mappedData; // Legacy support
            return res.json(companyJson);
        } catch (e) {
            console.warn(`Could not fetch tenant data:`, e.message);
        }

        const companyJson = company.toJSON();
        companyJson.live_data = [];
        res.json(companyJson);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteCompany = async (req, res) => {
    try {
        const { companyId } = req.params;

        const company = await Company.findByPk(companyId);
        if (!company) return res.status(404).json({ error: 'Company not found' });

        // --- NEW: Check for active sessions ---
        const { force } = req.query;
        const activeUsersCount = await User.count({
            where: {
                companyId,
                isLoggedIn: true
            }
        });

        if (activeUsersCount > 0 && force !== 'true') {
            return res.status(409).json({
                error: 'some of the staff of that company is still logged in still want to proceed'
            });
        }

        // 1. Drop Dedicated Tenant SCHEMA
        const cleanName = company.companyName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        const schemaName = `tenant_${cleanName}`;
        const { sequelize } = require('../db/postgres');

        try {
            console.log(`[Delete] Dropping Schema: ${schemaName}...`);
            await sequelize.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`);
            console.log(`[Delete] Schema dropped successfully.`);
        } catch (err) {
            console.error('[Delete] Error dropping schema:', err);
        }

        // 2. Also try dropping legacy table (cleanup)
        try {
            const legacyTable = `${cleanName}_users`;
            await sequelize.query(`DROP TABLE IF EXISTS "companies"."${legacyTable}" CASCADE;`);
        } catch (e) { }

        // 2. Delete Dependencies
        // Cleanup LoginLogs first to avoid foreign key issues
        const users = await User.findAll({ where: { companyId }, attributes: ['userId'] });
        const userIds = users.map(u => u.userId);
        if (userIds.length > 0) {
            const { LoginLog } = require('../models_sql');
            await LoginLog.destroy({ where: { userId: userIds } });
        }

        await User.destroy({ where: { companyId } });
        await LiveData.destroy({ where: { companyId } });
        await Ticket.destroy({ where: { companyId } });

        // 3. Delete Company
        await company.destroy();

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updatePlantSettings = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { voltagePerPanel, currentPerPanel, plantPowerKW } = req.body;

        const company = await Company.findByPk(companyId);
        if (!company) return res.status(404).json({ error: 'Company not found' });

        if (voltagePerPanel !== undefined) company.voltagePerPanel = voltagePerPanel;
        if (currentPerPanel !== undefined) company.currentPerPanel = currentPerPanel;
        if (plantPowerKW !== undefined) company.plantPowerKW = plantPowerKW;

        await company.save();

        res.json({ success: true, company });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.checkSessionStatus = async (req, res) => {
    try {
        const { companyId } = req.params;
        const activeUsersCount = await User.count({
            where: {
                companyId,
                isLoggedIn: true
            }
        });
        res.json({ activeSessions: activeUsersCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
