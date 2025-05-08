const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
require('dotenv').config();
const sequelize = require('./config/database');
const { Op } = require('sequelize');
const { Site, History } = require('./models/associations');
const initDatabase = require('./migrations/init');

const app = express();
const port = process.env.PORT || 5000;
let monitorService = null;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://8.242.76.156:3000', 'http://localhost:5000', 'http://8.242.76.156:5000'], // Frontend URLs
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Teste de conexão
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Inicializar banco de dados e iniciar servidor
async function startServer() {
  try {
    // Inicializar banco de dados
    await initDatabase();
    console.log('Banco de dados inicializado com sucesso!');

    // Importar MonitorService após a inicialização do banco de dados
    const MonitorService = require('./services/monitor.service');
    monitorService = new MonitorService();
    app.locals.monitorService = monitorService;

    // Configurar rotas após inicialização do monitorService
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
            // Se o site estiver fora do ar, usar o valor máximo (5000ms)
            const responseTimeValue = h.status === 'down' ? 5000 : (h.responseTime || 5000);
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
        if (!monitorService) {
          return res.status(503).json({ error: 'Serviço de monitoramento não está disponível' });
        }

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

    // Iniciar servidor HTTP
  const server = app.listen(port, '0.0.0.0', () => {
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

    // Iniciar monitoramento após o servidor estar pronto
    await monitorService.startMonitoring();
    console.log('Monitoramento iniciado com sucesso!');

  } catch (error) {
  console.error('Erro ao iniciar servidor:', error);
  process.exit(1);
  }
}

// Iniciar servidor
startServer(); 