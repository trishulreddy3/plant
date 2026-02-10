const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/postgres');

const Company = sequelize.define('Company', {
    companyId: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true
    },
    companyName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    plantPowerKW: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    voltagePerPanel: {
        type: DataTypes.FLOAT,
        defaultValue: 20
    },
    currentPerPanel: {
        type: DataTypes.FLOAT,
        defaultValue: 9.9
    },
    // We can store plantDetails as JSONB if it has varying structure
    plantDetails: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    dataSource: {
        type: DataTypes.STRING,
        defaultValue: 'standard' // 'standard' or 'thingsboard'
    },
    externalDeviceId: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'companies',
    timestamps: true
});

module.exports = Company;
