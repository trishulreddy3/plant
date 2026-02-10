const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'postgres',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'trishulpostgresql@333',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'postgres',
        port: process.env.DB_PORT || 5432,
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL Connected...');
        // Sync models
        // await sequelize.sync({ force: false, alter: true }); 
        // console.log('Database synced');
    } catch (err) {
        console.error('Unable to connect to the database:', err);
        // Don't exit process in dev, just log
    }
};

module.exports = { sequelize, connectDB };
