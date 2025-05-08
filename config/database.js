const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use environment variables if available, otherwise use defaults
const dbName = process.env.DB_NAME || 'c21sqlmonitor';
const dbUser = process.env.DB_USER || 'c21sqlmonitor';
const dbPassword = process.env.DB_PASSWORD || 'cEDLp3t5hmQZ_';
const dbHost = process.env.DB_HOST || 'isp-apache-ded-333.intesys.io';
const dbPort = process.env.DB_PORT || 3306;

// MySQL configuration
const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: process.env.NODE_ENV !== 'production' ? console.log : false,
  dialectOptions: {
    connectTimeout: 60000
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 60000,
    idle: 10000
  }
});

module.exports = sequelize; 