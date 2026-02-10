const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/postgres');

const LoginLog = sequelize.define('LoginLog', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'users',
            key: 'userId'
        }
    },
    loginTime: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    logoutTime: {
        type: DataTypes.DATE
    },
    ip: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'login_logs',
    timestamps: false
});

module.exports = LoginLog;
