const sequelize = require('../config/database');
const { Site, History } = require('../models/associations');

async function initDatabase() {
  try {
    // Sincronizar modelos com o banco de dados
    await sequelize.sync({ force: true });
    
    // Verificar se existem sites no banco de dados
    const siteCount = await Site.count();
    if (siteCount === 0) {
      // Criar site padrão
      await Site.create({
        name: 'Villela Tech',
        url: 'https://villelatech.com.br',
        type: 'url',
        category: 'website',
        status: 'unknown',
        notifications: {
          email: 'admin@villelatech.com.br',
          downtime: true,
          sslExpiry: true,
          domainExpiry: true
        }
      });
      console.log('Site padrão criado com sucesso!');
      
      // Criar IP padrão para exemplo
      await Site.create({
        name: 'Google DNS',
        url: '8.8.8.8',
        type: 'ip',
        category: 'ip',
        status: 'unknown',
        notifications: {
          email: 'admin@villelatech.com.br',
          downtime: true,
          sslExpiry: false,
          domainExpiry: false
        }
      });
      console.log('IP padrão criado com sucesso!');
    }
    
    console.log('Banco de dados inicializado com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    throw error;
  }
}

module.exports = initDatabase; 