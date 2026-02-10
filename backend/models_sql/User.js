const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/postgres');

const User = sequelize.define('User', {
    userId: {
        type: DataTypes.STRING, // e.g., 'user-123456'
        primaryKey: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING
    },
    role: {
        type: DataTypes.ENUM('super_admin', 'admin', 'plant_admin', 'technician', 'management'),
        defaultValue: 'technician'
    },
    companyId: {
        type: DataTypes.STRING,
        allowNull: true, // Super admin might not have a companyId, or it's 'microsyslogic'
        references: {
            model: 'companies',
            key: 'companyId'
        }
    },
    phoneNumber: {
        type: DataTypes.STRING
    },
    accountStatus: {
        type: DataTypes.ENUM('active', 'blocked', 'offline'),
        defaultValue: 'offline'
    },
    isLoggedIn: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    lastActiveAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'users',
    timestamps: true
});

module.exports = User;
