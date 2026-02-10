const { sequelize, connectDB } = require('../db/postgres');
const Company = require('./Company');
const User = require('./User');
const LiveData = require('./LiveData');
const Ticket = require('./Ticket');
const LoginLog = require('./LoginLog');
const SuperAdmin = require('./SuperAdmin');

// Associations
Company.hasMany(User, { foreignKey: 'companyId' });
User.belongsTo(Company, { foreignKey: 'companyId' });

Company.hasMany(LiveData, { foreignKey: 'companyId' });
LiveData.belongsTo(Company, { foreignKey: 'companyId' });

Company.hasMany(Ticket, { foreignKey: 'companyId' });
Ticket.belongsTo(Company, { foreignKey: 'companyId' });

User.hasMany(LoginLog, { foreignKey: 'userId' });
LoginLog.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
    sequelize,
    connectDB,
    Company,
    User,
    LiveData,
    Ticket,
    LoginLog,
    SuperAdmin
};
