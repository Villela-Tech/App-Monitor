const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const mysqlSequelize = require('../config/database');
const { Site, History } = require('../models/associations');

// Verifica se o arquivo SQLite existe
const sqliteDbPath = path.join(__dirname, '..', 'database.sqlite');
const sqliteExists = fs.existsSync(sqliteDbPath);

async function migrateSqliteToMysql() {
  if (!sqliteExists) {
    console.log('Arquivo SQLite não encontrado. Nenhuma migração necessária.');
    return;
  }

  // Configuração temporária para o SQLite
  const sqliteSequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqliteDbPath,
    logging: false
  });

  try {
    // Definir modelos temporários para SQLite
    const SqliteSite = sqliteSequelize.define('Site', {}, { tableName: 'Sites' });
    const SqliteHistory = sqliteSequelize.define('History', {}, { tableName: 'Histories' });

    // Testar conexão com MySQL
    await mysqlSequelize.authenticate();
    console.log('Conexão com MySQL estabelecida com sucesso.');

    // Testar conexão com SQLite
    await sqliteSequelize.authenticate();
    console.log('Conexão com SQLite estabelecida com sucesso.');

    // Sincronizar modelos com MySQL (criar tabelas)
    await mysqlSequelize.sync({ force: true });
    console.log('Tabelas MySQL criadas com sucesso.');

    // Migrar sites
    const sites = await SqliteSite.findAll();
    console.log(`Encontrados ${sites.length} sites para migrar.`);
    
    for (const site of sites) {
      const siteData = site.toJSON();
      delete siteData.id; // Remover ID para que seja gerado automaticamente
      
      // Adicionar campo de tipo se não existir
      if (!siteData.type) {
        // Verificar se é um IP ou URL
        try {
          new URL(siteData.url);
          siteData.type = 'url';
        } catch (error) {
          // Tentar determinar se é um IP
          const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
          if (ipPattern.test(siteData.url)) {
            siteData.type = 'ip';
            // Atualizar categoria se for padrão
            if (siteData.category === 'website') {
              siteData.category = 'ip';
            }
          } else {
            siteData.type = 'url'; // Padrão para URL
          }
        }
      }
      
      await Site.create(siteData);
      console.log(`Site ${siteData.name} migrado com sucesso.`);
    }

    // Migrar histórico
    const histories = await SqliteHistory.findAll();
    console.log(`Encontrados ${histories.length} registros de histórico para migrar.`);
    
    for (const history of histories) {
      const historyData = history.toJSON();
      delete historyData.id; // Remover ID para que seja gerado automaticamente
      await History.create(historyData);
    }

    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração:', error);
  } finally {
    // Fechar conexões
    await sqliteSequelize.close();
    console.log('Conexão com SQLite fechada.');
  }
}

// Executar migração
if (require.main === module) {
  migrateSqliteToMysql()
    .then(() => {
      console.log('Processo de migração finalizado.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Erro no processo de migração:', err);
      process.exit(1);
    });
} else {
  module.exports = migrateSqliteToMysql;
} 