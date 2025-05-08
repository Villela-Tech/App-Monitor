const fetch = require('node-fetch');
const sslChecker = require('ssl-checker');
const whois = require('whois-json');
const nodemailer = require('nodemailer');
const Site = require('../models/site.model');
const History = require('../models/history.model');
const { Op } = require('sequelize');
const DomainService = require('./domain.service');
const IPService = require('./ip.service');

class MonitorService {
  constructor() {
    this.websockets = new Map();
    this.monitoringInterval = null;
    this.updateInterval = 60000; // 1 minuto
    this.siteDowntime = new Map(); // Armazenar informações de downtime
    this.domainService = new DomainService();
    this.ipService = new IPService();
  }

  async startMonitoring() {
    console.log('Iniciando monitoramento automático...');

    // Primeira verificação imediata
    await this.checkAllSites();

    // Configurar intervalo de monitoramento
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      await this.checkAllSites();
    }, this.updateInterval);
  }

  async checkAllSites() {
    try {
      console.log('Verificando todos os sites...');
      const sites = await Site.findAll();
      
      for (const site of sites) {
        const result = await this.monitorSite(site);
        this.broadcastUpdate(site.id, result);
      }
      console.log('Verificação completa de todos os sites');
    } catch (error) {
      console.error('Erro ao verificar sites:', error);
    }
  }

  async monitorSite(site) {
    try {
      console.log(`Monitorando ${site.type === 'ip' ? 'IP' : 'site'}: ${site.name} (${site.url})`);
      
      let statusResult;
      
      // Verificar se é um IP ou URL
      if (site.type === 'ip') {
        statusResult = await this.ipService.pingIP(site.url);
      } else {
        statusResult = await this.checkSiteStatus(site.url);
      }
      
      const { status, responseTime, error, statusCode } = statusResult;
      console.log(`Status: ${status}, Tempo de resposta: ${responseTime}ms${statusCode ? `, Status Code: ${statusCode}` : ''}${error ? `, Erro: ${error}` : ''}`);

      // Gerenciar downtime
      const wasDown = site.status === 'down';
      const isDown = status === 'down';
      
      if (!wasDown && isDown) {
        // Site/IP acabou de cair
        this.siteDowntime.set(site.id, {
          startTime: new Date(),
          notified: false
        });
        await this.sendNotification(site, 'down');
      } else if (wasDown && !isDown) {
        // Site/IP voltou ao ar
        const downtime = this.siteDowntime.get(site.id);
        if (downtime) {
          const duration = new Date() - downtime.startTime;
          const durationMinutes = Math.floor(duration / 60000);
          await this.sendNotification(site, 'up', durationMinutes);
          this.siteDowntime.delete(site.id);
        }
      }

      // Calcular estatísticas
      const { average, standardDeviation } = await this.calculateStatistics(site.id);
      
      // Verificar anomalias
      const isAnomalous = responseTime ? this.isAnomaly(responseTime, average, standardDeviation, site.anomalyThreshold) : false;

      // Salvar histórico
      await History.create({
        siteId: site.id,
        status,
        responseTime,
        statusCode: statusCode || null,
        timestamp: new Date(),
        error: error || null
      });

      // Preparar dados de atualização
      const updates = {
        status,
        responseTime,
        lastCheck: new Date(),
        averageResponseTime: average,
        standardDeviation,
        lastError: error || null,
        lastStatusCode: statusCode || null
      };

      // Processar informações específicas baseadas no tipo (URL ou IP)
      if (site.type === 'ip') {
        // Obter informações sobre o IP
        try {
          const ipInfo = await this.ipService.getIPInfo(site.url);
          updates.ipInfo = ipInfo;
          
          // Verificar portas abertas (opcional, pode ser pesado para o monitoramento contínuo)
          // const portInfo = await this.ipService.checkPorts(site.url);
          // updates.ipInfo = { ...updates.ipInfo, ports: portInfo.ports };
        } catch (error) {
          console.error(`Erro ao obter informações do IP:`, error);
          updates.ipInfo = null;
        }
      } else {
        // Verificar SSL para URLs
        try {
          const hostname = new URL(site.url).hostname;
          const ssl = await sslChecker(hostname);
          updates.sslInfo = {
            valid: ssl.valid,
            validTo: ssl.validTo,
            daysRemaining: Math.floor((new Date(ssl.validTo) - new Date()) / (1000 * 60 * 60 * 24))
          };
        } catch (error) {
          console.error(`Erro ao verificar SSL:`, error);
          updates.sslInfo = null;
        }

        // Verificar informações do domínio e DNS para URLs
        try {
          const [domainInfo, dnsInfo] = await Promise.all([
            this.domainService.getDomainInfo(site.url),
            this.domainService.getDNSInfo(site.url)
          ]);

          if (domainInfo) {
            updates.domainInfo = domainInfo;
          }
          if (dnsInfo) {
            updates.dnsInfo = dnsInfo;
          }
        } catch (error) {
          console.error(`Erro ao verificar informações do domínio:`, error);
          updates.domainInfo = null;
          updates.dnsInfo = null;
        }
      }

      // Atualizar site no banco de dados
      await site.update(updates);
      await site.save();

      return {
        ...updates,
        isAnomalous,
        name: site.name,
        url: site.url,
        category: site.category,
        type: site.type
      };
    } catch (error) {
      console.error(`Erro ao monitorar ${site.type === 'ip' ? 'IP' : 'site'} ${site.name}:`, error);
      return {
        status: 'error',
        error: error.message,
        lastCheck: new Date(),
        name: site.name,
        url: site.url,
        category: site.category,
        type: site.type
      };
    }
  }

  setWebSocket(ws, req) {
    const clientId = req.headers['sec-websocket-key'];
    
    // Verificar se já existe uma conexão ativa para este cliente
    if (this.websockets.has(clientId)) {
      const oldWs = this.websockets.get(clientId);
      if (oldWs.readyState === 1) {
        console.log(`Fechando conexão antiga para o cliente ${clientId}`);
        oldWs.close();
      }
    }

    // Configurar eventos da nova conexão
    ws.isAlive = true;
    ws.clientId = clientId;

    // Armazenar nova conexão
    this.websockets.set(clientId, ws);
    console.log(`Nova conexão estabelecida para o cliente ${clientId}. Total de conexões: ${this.websockets.size}`);

    // Enviar dados atuais imediatamente
    this.checkAllSites();

    // Configurar eventos
    ws.on('close', () => {
      console.log(`Conexão fechada para o cliente ${clientId}`);
      this.cleanupConnection(clientId);
    });

    ws.on('error', (error) => {
      console.error(`Erro na conexão WebSocket para o cliente ${clientId}:`, error);
      this.cleanupConnection(clientId);
    });
  }

  broadcastUpdate(siteId, data) {
    const message = JSON.stringify({
      type: 'siteUpdate',
      siteId,
      data
    });

    for (const [clientId, ws] of this.websockets.entries()) {
      try {
        if (ws.readyState === 1) {
          ws.send(message);
        } else {
          this.cleanupConnection(clientId);
        }
      } catch (error) {
        console.error(`Erro ao enviar mensagem para cliente ${clientId}:`, error);
        this.cleanupConnection(clientId);
      }
    }
  }

  cleanupConnection(clientId) {
    const ws = this.websockets.get(clientId);
    if (ws) {
      this.websockets.delete(clientId);
      console.log(`Limpando conexão para o cliente ${clientId}`);
    }
  }

  async checkSiteStatus(url) {
    try {
      // Fazer 3 tentativas antes de considerar o site como down
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => {
            controller.abort();
          }, 5000); // Reduzido para 5 segundos de timeout

          const startTime = Date.now();
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            redirect: 'follow', // Seguir redirecionamentos
            timeout: 5000 // Timeout adicional para o fetch
          });
          
          clearTimeout(timeout);
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          // Site está respondendo
          return {
            status: 'up',
            responseTime,
            statusCode: response.status
          };
        } catch (error) {
          if (attempt === 3) {
            throw error; // Lançar erro após 3 tentativas
          }
          await new Promise(resolve => setTimeout(resolve, 1000)); // Reduzido para 1 segundo entre tentativas
        }
      }
    } catch (error) {
      console.error(`Erro ao verificar status do site ${url} após 3 tentativas:`, error.message);
      return { 
        status: 'down', 
        responseTime: 5000, // Reduzido para 5 segundos quando o site está fora do ar
        error: error.message || 'Erro de conexão'
      };
    }
  }

  async calculateStatistics(siteId) {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const history = await History.findAll({
      where: {
        siteId,
        timestamp: {
          [Op.gte]: last24Hours
        },
        responseTime: {
          [Op.not]: null
        }
      }
    });

    if (history.length > 0) {
      const responseTimes = history.map(h => h.responseTime);
      const average = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      const squareDiffs = responseTimes.map(value => {
        const diff = value - average;
        return diff * diff;
      });
      const standardDeviation = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / responseTimes.length);

      return { average, standardDeviation };
    }

    return { average: null, standardDeviation: null };
  }

  isAnomaly(responseTime, average, standardDeviation, threshold) {
    if (!average || !standardDeviation) return false;
    const zScore = Math.abs(responseTime - average) / standardDeviation;
    return zScore > 2 || responseTime > threshold; // Z-score > 2 ou acima do threshold
  }

  async sendNotification(site, status, downtimeDuration = null) {
    try {
      if (!site.notificationEmail) return;

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      let subject, text;
      if (status === 'down') {
        subject = `[ALERTA] Site ${site.name} está fora do ar`;
        text = `O site ${site.name} (${site.url}) está inacessível.\nÚltima verificação: ${new Date().toLocaleString()}`;
      } else {
        subject = `[RECUPERADO] Site ${site.name} está de volta ao ar`;
        text = `O site ${site.name} (${site.url}) está novamente acessível.\nTempo total fora do ar: ${downtimeDuration} minutos\nHorário de recuperação: ${new Date().toLocaleString()}`;
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: site.notificationEmail,
        subject,
        text
      };

      await transporter.sendMail(mailOptions);
      console.log(`Notificação enviada para ${site.name} - Status: ${status}`);
    } catch (error) {
      console.error(`Erro ao enviar notificação para ${site.name}:`, error);
    }
  }
}

module.exports = MonitorService; 