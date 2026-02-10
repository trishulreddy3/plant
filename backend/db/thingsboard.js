const { Sequelize } = require('sequelize');
require('dotenv').config();

// ThingsBoard Database Connection
const thingsboardSequelize = new Sequelize(
    process.env.TB_DB_NAME || 'thingsboard',
    process.env.TB_DB_USER || 'thingsboard',
    process.env.TB_DB_PASSWORD || 'thingsboard',
    {
        host: process.env.TB_DB_HOST || 'localhost',
        dialect: 'postgres',
        port: process.env.TB_DB_PORT || 5433,
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

const connectThingsBoardDB = async () => {
    try {
        await thingsboardSequelize.authenticate();
        console.log('ThingsBoard PostgreSQL Connected...');
    } catch (err) {
        console.error('Unable to connect to the ThingsBoard database:', err);
    }
};

module.exports = { thingsboardSequelize, connectThingsBoardDB };
