const sequelize = require('./config/database');

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com MySQL estabelecida com sucesso.');
    
    // Listar tabelas existentes
    const [results] = await sequelize.query('SHOW TABLES');
    console.log('Tabelas existentes no banco de dados:');
    results.forEach(result => {
      const tableName = Object.values(result)[0];
      console.log(`- ${tableName}`);
    });
    
  } catch (error) {
    console.error('Erro ao conectar ao MySQL:', error);
  } finally {
    await sequelize.close();
  }
}

testConnection(); 