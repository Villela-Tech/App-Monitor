const router = require('express').Router();
const Site = require('../models/site.model');
const net = require('net');

// Função para validar IP
function isValidIP(ip) {
  if (net.isIP(ip)) {
    return true;
  }
  return false;
}

// Listar todos os sites e IPs
router.get('/', async (req, res) => {
  try {
    const sites = await Site.findAll();
    res.json(sites);
  } catch (err) {
    console.error('Erro ao listar sites e IPs:', err);
    res.status(500).json('Erro ao listar sites e IPs: ' + err.message);
  }
});

// Adicionar novo site ou IP
router.post('/', async (req, res) => {
  try {
    const { url, type = 'url' } = req.body;
    
    // Validar URL ou IP
    if (type === 'url') {
      try {
        new URL(url);
      } catch (error) {
        return res.status(400).json('URL inválida');
      }
    } else if (type === 'ip') {
      if (!isValidIP(url)) {
        return res.status(400).json('Endereço IP inválido');
      }
    } else {
      return res.status(400).json('Tipo inválido. Use "url" ou "ip"');
    }

    // Validar notificações
    const notifications = req.body.notifications;
    if (!notifications || typeof notifications !== 'object') {
      return res.status(400).json('Configurações de notificação inválidas');
    }

    if (!notifications.email || typeof notifications.email !== 'string') {
      return res.status(400).json('Email é obrigatório');
    }

    // Definir categoria padrão baseada no tipo
    if (!req.body.category) {
      if (type === 'ip') {
        req.body.category = 'ip';
      } else {
        req.body.category = 'website';
      }
    }

    const site = await Site.create(req.body);
    if (req.app.locals.monitorService) {
      await req.app.locals.monitorService.monitorSite(site);
    }
    res.json(site);
  } catch (err) {
    console.error('Erro ao adicionar site/IP:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json(err.errors[0].message);
    }
    res.status(500).json('Erro ao adicionar site/IP: ' + err.message);
  }
});

// Obter site ou IP específico
router.get('/:id', async (req, res) => {
  try {
    const site = await Site.findByPk(req.params.id);
    if (!site) {
      return res.status(404).json('Site/IP não encontrado');
    }
    res.json(site);
  } catch (err) {
    console.error('Erro ao buscar site/IP:', err);
    res.status(500).json('Erro ao buscar site/IP: ' + err.message);
  }
});

// Atualizar site ou IP
router.put('/:id', async (req, res) => {
  try {
    const site = await Site.findByPk(req.params.id);
    if (!site) {
      return res.status(404).json('Site/IP não encontrado');
    }

    // Se estiver atualizando a URL, validar conforme o tipo
    if (req.body.url) {
      const type = req.body.type || site.type;
      
      if (type === 'url') {
        try {
          new URL(req.body.url);
        } catch (error) {
          return res.status(400).json('URL inválida');
        }
      } else if (type === 'ip') {
        if (!isValidIP(req.body.url)) {
          return res.status(400).json('Endereço IP inválido');
        }
      }
    }

    await site.update(req.body);
    res.json(site);
  } catch (err) {
    console.error('Erro ao atualizar site/IP:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json(err.errors[0].message);
    }
    res.status(500).json('Erro ao atualizar site/IP: ' + err.message);
  }
});

// Deletar site ou IP
router.delete('/:id', async (req, res) => {
  try {
    const site = await Site.findByPk(req.params.id);
    if (!site) {
      return res.status(404).json('Site/IP não encontrado');
    }
    await site.destroy();
    res.json('Site/IP deletado com sucesso.');
  } catch (err) {
    console.error('Erro ao deletar site/IP:', err);
    res.status(500).json('Erro ao deletar site/IP: ' + err.message);
  }
});

// Verificar site ou IP manualmente
router.post('/:id/check', async (req, res) => {
  try {
    if (!req.app.locals.monitorService) {
      return res.status(503).json('Serviço de monitoramento não está disponível');
    }

    const site = await Site.findByPk(req.params.id);
    if (!site) {
      return res.status(404).json('Site/IP não encontrado');
    }
    const updatedSite = await req.app.locals.monitorService.monitorSite(site);
    res.json(updatedSite);
  } catch (err) {
    console.error('Erro ao verificar site/IP:', err);
    res.status(500).json('Erro ao verificar site/IP: ' + err.message);
  }
});

// Verificar portas abertas para um IP
router.post('/:id/check-ports', async (req, res) => {
  try {
    if (!req.app.locals.monitorService) {
      return res.status(503).json('Serviço de monitoramento não está disponível');
    }

    const site = await Site.findByPk(req.params.id);
    if (!site) {
      return res.status(404).json('Site/IP não encontrado');
    }
    
    if (site.type !== 'ip') {
      return res.status(400).json('Esta operação só é válida para IPs');
    }
    
    // Verificar portas específicas ou usar padrão
    const ports = req.body.ports || [80, 443, 22, 21, 25, 3306, 5432];
    
    const portInfo = await req.app.locals.monitorService.ipService.checkPorts(site.url, ports);
    
    // Atualizar informações do IP com dados de portas
    const currentIpInfo = site.ipInfo || {};
    await site.update({
      ipInfo: {
        ...currentIpInfo,
        ports: portInfo.ports,
        lastPortCheck: new Date().toISOString()
      }
    });
    
    res.json(portInfo);
  } catch (err) {
    console.error('Erro ao verificar portas:', err);
    res.status(500).json('Erro ao verificar portas: ' + err.message);
  }
});

// Atualizar configurações de notificação
router.put('/:id/notifications', async (req, res) => {
  try {
    const site = await Site.findByPk(req.params.id);
    if (!site) {
      return res.status(404).json('Site/IP não encontrado');
    }

    const currentNotifications = site.notifications || {};
    const updatedNotifications = {
      ...currentNotifications,
      downtime: req.body.downtime,
      sslExpiry: req.body.sslExpiry,
      domainExpiry: req.body.domainExpiry,
      email: currentNotifications.email // Mantém o email existente
    };

    await site.update({ notifications: updatedNotifications });
    res.json(site);
  } catch (err) {
    console.error('Erro ao atualizar configurações de notificação:', err);
    res.status(500).json('Erro ao atualizar configurações: ' + err.message);
  }
});

module.exports = router; 