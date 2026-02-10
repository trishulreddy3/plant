const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/postgres');

const LiveData = sequelize.define('LiveData', {
    id: {
        type: DataTypes.STRING, // e.g. node-xxxx
        primaryKey: true
    },
    companyId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'companyId'
        }
    },
    node: {
        type: DataTypes.STRING,
        allowNull: false
    },
    serialNumber: {
        type: DataTypes.STRING
    },
    time: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    panelVoltages: {
        type: DataTypes.JSONB, // Store array of voltages
        defaultValue: []
    },
    current: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    temperature: {
        type: DataTypes.FLOAT
    },
    lightIntensity: {
        type: DataTypes.FLOAT
    },
    panelCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'live_data',
    timestamps: true
});

module.exports = LiveData;
