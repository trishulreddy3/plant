const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/postgres');

const Ticket = sequelize.define('Ticket', {
    id: {
        type: DataTypes.STRING,
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
    trackId: {
        type: DataTypes.STRING
    },
    fault: {
        type: DataTypes.STRING
    },
    reason: {
        type: DataTypes.STRING
    },
    category: {
        type: DataTypes.ENUM('BAD', 'MODERATE'),
        defaultValue: 'MODERATE'
    },
    powerLoss: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    predictedLoss: {
        type: DataTypes.FLOAT
    },
    resolvedAt: {
        type: DataTypes.DATE
    },
    resolvedBy: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'tickets',
    timestamps: true
});

module.exports = Ticket;
