const sequelize = require('../config/database');
const { Site, History } = require('../models/associations');

async function initDatabase() {
  try {
    // Forçar sincronização do banco de dados em ordem
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    
    // Dropar tabelas na ordem correta
    await History.drop();
    await Site.drop();
    
    // Criar tabelas na ordem correta
    await Site.sync();
    await History.sync();
    
    await sequelize.query('PRAGMA foreign_keys = ON;');
    
    console.log('Banco de dados inicializado com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    process.exit(1);
  }
}

module.exports = initDatabase; 