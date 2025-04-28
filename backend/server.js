const express = require('express');
const cors = require('cors');
require('dotenv').config();
const sequelize = require('./config/database');
const monitorService = require('./services/monitor.service');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Conectar ao banco de dados
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');
    
    // Sincronizar modelos com o banco de dados
    await sequelize.sync();
    console.log('Modelos sincronizados com o banco de dados.');

    // Iniciar o serviço de monitoramento
    monitorService.startMonitoring();
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error);
  }
}

initializeDatabase();

// Rotas
const sitesRouter = require('./routes/sites');
app.use('/api/sites', sitesRouter);

app.listen(port, () => {
    console.log(`Servidor rodando na porta: ${port}`);
}); 