const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/postgres');

const SuperAdmin = sequelize.define('SuperAdmin', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    companyName: {
        type: DataTypes.STRING,
        defaultValue: 'microsyslogic',
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'super_admin'
    }
}, {
    tableName: 'super_admins',
    timestamps: false // No need for timestamps as requested "no other data"
});

module.exports = SuperAdmin;
