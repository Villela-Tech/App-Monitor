const { Sequelize } = require('sequelize');

// Local MySQL configuration
const sequelize = new Sequelize('c21sqlmonitor', 'c21sqlmonitor', 'cEDLp3t5hmQZ_', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: console.log,
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

// Test the connection and sync models
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('MySQL connection successful');

    // Import models
    require('../models/associations');
    
    // Sync database - this will create tables if they don't exist
    await sequelize.sync();
    console.log('Database synchronized successfully');

  } catch (error) {
    console.error('Unable to connect to MySQL database:', error.message);
    process.exit(1);
  }
}

// Initialize database
initializeDatabase();

module.exports = sequelize; 