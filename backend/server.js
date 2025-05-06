const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
require('dotenv').config();
const sequelize = require('./config/database');
const { Op } = require('sequelize');
const monitorService = require('./services/monitor.service');
const { Site, History } = require('./models/associations');
const initDatabase = require('./migrations/init');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Teste de conexão
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas
const sitesRouter = require('./routes/sites');
app.use('/api/sites', sitesRouter);

// Rota para obter métricas do site
app.get('/api/sites/:id/metrics', async (req, res) => {
  try {
    console.log(`Buscando métricas para o site ${req.params.id}`);
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const history = await History.findAll({
      where: {
        siteId: req.params.id,
        timestamp: {
          [Op.gte]: last24Hours
        }
      },
      order: [['timestamp', 'ASC']]
    });

    console.log(`Encontrados ${history.length} registros de histórico`);

    // Criar um mapa com todas as horas das últimas 24h
    const hourlyData = new Map();
    const now = Date.now();
    
    // Preencher com as últimas 24 horas
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now - i * 60 * 60 * 1000);
      hour.setMinutes(0, 0, 0);
      hourlyData.set(hour.getTime(), {
        sum: 0,
        count: 0,
        hour: hour
      });
    }

    // Agrupar dados por hora
    history.forEach(h => {
      const timestamp = new Date(h.timestamp);
      timestamp.setMinutes(0, 0, 0);
      const hourKey = timestamp.getTime();
      
      if (hourlyData.has(hourKey)) {
        const data = hourlyData.get(hourKey);
        // Se o site estiver fora do ar, usar o valor máximo (15000ms)
        const responseTimeValue = h.status === 'down' ? 15000 : (h.responseTime || 15000);
        data.sum += responseTimeValue;
        data.count += 1;
      }
    });

    // Ordenar os dados por hora
    const sortedData = Array.from(hourlyData.entries()).sort((a, b) => a[0] - b[0]);

    const responseTimeData = sortedData.map(([_, data]) => ({
      responseTime: data.count > 0 ? Math.round(data.sum / data.count) : 0
    }));

    const timestamps = sortedData.map(([_, data]) => 
      data.hour.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit'
      })
    );

    const response = {
      responseTimeData,
      timestamps
    };

    console.log('Resposta final:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    res.status(500).json({ error: 'Erro ao buscar métricas' });
  }
});

// Rota para verificar site manualmente
app.post('/api/sites/:id/check', async (req, res) => {
  try {
    const site = await Site.findByPk(req.params.id);
    if (!site) {
      return res.status(404).json({ error: 'Site não encontrado' });
    }
    await monitorService.monitorSite(site);
    const updatedSite = await Site.findByPk(req.params.id);
    res.json(updatedSite);
  } catch (error) {
    console.error('Erro ao verificar site:', error);
    res.status(500).json({ error: 'Erro ao verificar site' });
  }
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Inicializar banco de dados antes de iniciar o servidor
initDatabase().then(() => {
  const server = app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });

  // Configurar WebSocket
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws',
    clientTracking: true,
    perMessageDeflate: false
  });

  wss.on('connection', (ws, req) => {
    monitorService.setWebSocket(ws, req);
  });

}).catch(error => {
  console.error('Erro ao iniciar servidor:', error);
  process.exit(1);
}); 