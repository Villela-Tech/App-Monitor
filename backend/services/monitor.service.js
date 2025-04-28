const fetch = require('node-fetch');
const sslChecker = require('ssl-checker');
const whois = require('whois-json');
const nodemailer = require('nodemailer');
const Site = require('../models/site.model');

class MonitorService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async checkSiteStatus(url) {
    try {
      const response = await fetch(url);
      const responseTime = response.headers.get('x-response-time');
      return {
        status: response.ok ? 'up' : 'down',
        responseTime: responseTime ? parseInt(responseTime) : null
      };
    } catch (error) {
      console.error(`Erro ao verificar status do site ${url}:`, error);
      return { status: 'down', responseTime: null };
    }
  }

  async checkSSL(hostname) {
    try {
      const sslInfo = await sslChecker(hostname);
      const daysRemaining = Math.floor((new Date(sslInfo.validTo) - new Date()) / (1000 * 60 * 60 * 24));
      return {
        validTo: sslInfo.validTo,
        issuer: sslInfo.issuer,
        daysRemaining
      };
    } catch (error) {
      console.error(`Erro ao verificar SSL para ${hostname}:`, error);
      return null;
    }
  }

  extractDomain(url) {
    try {
      const { hostname } = new URL(url);
      // Remove 'www.' se existir
      return hostname.replace(/^www\./, '');
    } catch (error) {
      console.error('Erro ao extrair domínio:', error);
      return null;
    }
  }

  parseBrDomainDate(dateStr) {
    if (!dateStr) return null;
    
    // Formato comum para domínios .br: "20250722"
    if (/^\d{8}$/.test(dateStr)) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return new Date(`${year}-${month}-${day}`);
    }
    
    return new Date(dateStr);
  }

  async checkDomain(url) {
    try {
      const domain = this.extractDomain(url);
      if (!domain) return null;

      console.log(`Verificando informações do domínio: ${domain}`);
      const domainInfo = await whois(domain);
      
      console.log('Informações WHOIS recebidas:', JSON.stringify(domainInfo, null, 2));

      let expiryDate = null;
      let registrar = 'Não disponível';

      // Tratamento específico para domínios .br
      if (domain.endsWith('.br')) {
        expiryDate = this.parseBrDomainDate(domainInfo.expires);
        registrar = domainInfo.owner || domainInfo.registrar || 'Não disponível';
      } else {
        // Tratamento para outros domínios
        const possibleExpiryFields = [
          'registryExpiryDate',
          'expirationDate',
          'registrarRegistrationExpirationDate',
          'expires'
        ];

        for (const field of possibleExpiryFields) {
          if (domainInfo[field]) {
            expiryDate = new Date(domainInfo[field]);
            if (!isNaN(expiryDate.getTime())) break;
          }
        }

        registrar = domainInfo.registrar || 
                   domainInfo.registrarName || 
                   domainInfo['Registrar'] ||
                   'Não disponível';
      }

      if (!expiryDate || isNaN(expiryDate.getTime())) {
        console.error(`Data de expiração inválida para ${domain}. Campos disponíveis:`, 
          Object.keys(domainInfo).filter(k => domainInfo[k]));
        return null;
      }

      const daysRemaining = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

      return {
        expiryDate: expiryDate.toISOString(),
        registrar,
        daysRemaining
      };
    } catch (error) {
      console.error(`Erro ao verificar domínio ${url}:`, error);
      return null;
    }
  }

  async sendNotification(site, type, message) {
    if (!site.notifications?.[type]) return;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: site.notifications.email,
        subject: `[Site Monitor] Alerta para ${site.name}`,
        text: message
      });
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  }

  async monitorSite(site) {
    try {
      console.log(`Iniciando monitoramento do site: ${site.name} (${site.url})`);
      
      const { status, responseTime } = await this.checkSiteStatus(site.url);
      const hostname = new URL(site.url).hostname;
      
      console.log(`Status do site ${site.name}: ${status}`);
      const sslInfo = await this.checkSSL(hostname);
      console.log(`Informações SSL obtidas para ${site.name}`);
      
      const domainInfo = await this.checkDomain(site.url);
      console.log(`Informações de domínio obtidas para ${site.name}:`, domainInfo);

      const updates = {
        status,
        responseTime,
        lastCheck: new Date(),
        sslInfo,
        domainInfo
      };

      // Verificar e enviar notificações
      if (status === 'down' && site.status === 'up') {
        await this.sendNotification(site, 'downtime', `O site ${site.name} está fora do ar!`);
      }

      if (sslInfo && sslInfo.daysRemaining <= 30) {
        await this.sendNotification(site, 'sslExpiry', 
          `O certificado SSL de ${site.name} irá expirar em ${sslInfo.daysRemaining} dias.`);
      }

      if (domainInfo && domainInfo.daysRemaining <= 30) {
        await this.sendNotification(site, 'domainExpiry',
          `O domínio ${site.name} irá expirar em ${domainInfo.daysRemaining} dias.`);
      }

      await site.update(updates);
      return site;
    } catch (error) {
      console.error(`Erro ao monitorar site ${site.name}:`, error);
      return site;
    }
  }

  async startMonitoring() {
    console.log('Iniciando serviço de monitoramento...');
    setInterval(async () => {
      try {
        const sites = await Site.findAll();
        for (const site of sites) {
          await this.monitorSite(site);
        }
      } catch (error) {
        console.error('Erro no ciclo de monitoramento:', error);
      }
    }, 5 * 60 * 1000); // Verificar a cada 5 minutos
  }
}

module.exports = new MonitorService(); 