const { sequelize } = require('../models_sql/index');
const { DataTypes } = require('sequelize');

const tenantCache = new Map();

/**
 * Initialize a complete tenant schema with all required tables:
 * - users (staff members)
 * - live_data (panel monitoring)
 * - login_logs (audit trail)
 * - tickets (issue tracking)
 */
const initializeTenantSchema = async (companyName) => {
    if (!companyName) throw new Error('Company Name required for tenant schema');

    const cleanName = companyName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const schemaName = `tenant_${cleanName}`;

    // Return from cache if already initialized in this process
    if (tenantCache.has(schemaName)) {
        return tenantCache.get(schemaName);
    }

    // Ensure the Schema Exists
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);

    // Define all models for this tenant
    const models = {};

    // 1. TABLE 1: login_credentials
    const loginCredsModelName = `${schemaName}_LoginCredentials`;
    if (!sequelize.models[loginCredsModelName]) {
        models.LoginCredentials = sequelize.define(loginCredsModelName, {
            userId: {
                type: DataTypes.STRING,
                primaryKey: true,
            },
            companyName: { type: DataTypes.STRING },
            userName: { type: DataTypes.STRING },
            email: { type: DataTypes.STRING }, // userid/mail id
            password: { type: DataTypes.STRING },
            phoneNumber: { type: DataTypes.STRING },
            role: { type: DataTypes.STRING },
            status: {
                type: DataTypes.STRING,
                defaultValue: 'active' // active or inactive
            },
        }, {
            tableName: 'login_credentials',
            schema: schemaName,
            timestamps: true
        });
    } else {
        models.LoginCredentials = sequelize.models[loginCredsModelName];
    }

    // 2. TABLE 2: login_details
    const loginDetailsModelName = `${schemaName}_LoginDetails`;
    if (!sequelize.models[loginDetailsModelName]) {
        models.LoginDetails = sequelize.define(loginDetailsModelName, {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            companyName: { type: DataTypes.STRING },
            userId: { type: DataTypes.STRING },
            attempts: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            timeIn: { type: DataTypes.DATE },
            timeOut: { type: DataTypes.DATE },
            presentStatus: { type: DataTypes.STRING } // active, blocked, offline
        }, {
            tableName: 'login_details',
            schema: schemaName,
            timestamps: true
        });
    } else {
        models.LoginDetails = sequelize.models[loginDetailsModelName];
    }

    // 3. TABLE 3: live_data
    const liveDataModelName = `${schemaName}_LiveData`;
    if (!sequelize.models[liveDataModelName]) {
        const liveDataFields = {
            node: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            panelCount: {
                type: DataTypes.INTEGER,
                defaultValue: 20
            },
            temperature: { type: DataTypes.FLOAT },
            lightIntensity: { type: DataTypes.FLOAT },
            current: { type: DataTypes.FLOAT },
            voltagePerPanel: { type: DataTypes.FLOAT, defaultValue: 20 },
            currentPerPanel: { type: DataTypes.FLOAT, defaultValue: 10 },
        };

        // Add p1v to p20v and p1c to p20c
        for (let i = 1; i <= 20; i++) {
            liveDataFields[`p${i}v`] = { type: DataTypes.FLOAT, defaultValue: 0 };
            liveDataFields[`p${i}c`] = { type: DataTypes.FLOAT, defaultValue: 0 };
        }

        models.LiveData = sequelize.define(liveDataModelName, liveDataFields, {
            tableName: 'live_data',
            schema: schemaName,
            timestamps: true
        });
    } else {
        models.LiveData = sequelize.models[liveDataModelName];
    }

    // 4. TABLE 4: fault_tables
    const faultTableModelName = `${schemaName}_FaultTable`;
    if (!sequelize.models[faultTableModelName]) {
        const faultFields = {
            node: {
                type: DataTypes.STRING,
                primaryKey: true
            }
        };

        // Add p1 to p20 (G/B/M)
        for (let i = 1; i <= 20; i++) {
            faultFields[`p${i}`] = {
                type: DataTypes.STRING(1),
                defaultValue: 'G'
            };
        }

        models.FaultTable = sequelize.define(faultTableModelName, faultFields, {
            tableName: 'fault_tables',
            schema: schemaName,
            timestamps: true
        });
    } else {
        models.FaultTable = sequelize.models[faultTableModelName];
    }

    // Sync all tables (Only if not already in cache)
    await models.LoginCredentials.sync({ alter: true });
    await models.LoginDetails.sync({ alter: true });
    await models.LiveData.sync({ alter: true });
    await models.FaultTable.sync({ alter: true });

    tenantCache.set(schemaName, models);
    return models;
};

/**
 * Returns the LoginCredentials model (formerly User model)
 */
const getCompanyStaffModel = async (companyName) => {
    const models = await initializeTenantSchema(companyName);
    return models.LoginCredentials;
};

/**
 * Get specific table model from tenant schema
 */
const getTenantModel = async (companyName, modelType) => {
    const models = await initializeTenantSchema(companyName);
    return models[modelType]; // modelType: 'LoginCredentials', 'LoginDetails', 'LiveData', 'FaultTable'
};

module.exports = {
    getCompanyStaffModel,
    initializeTenantSchema,
    getTenantModel
};
