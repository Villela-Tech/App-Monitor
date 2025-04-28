const router = require('express').Router();
const Site = require('../models/site.model');
const monitorService = require('../services/monitor.service');

// Listar todos os sites
router.get('/', async (req, res) => {
  try {
    const sites = await Site.findAll();
    res.json(sites);
  } catch (err) {
    console.error('Erro ao listar sites:', err);
    res.status(500).json('Erro ao listar sites: ' + err.message);
  }
});

// Adicionar novo site
router.post('/', async (req, res) => {
  try {
    // Validar URL
    try {
      new URL(req.body.url);
    } catch (error) {
      return res.status(400).json('URL inválida');
    }

    // Validar notificações
    const notifications = req.body.notifications;
    if (!notifications || typeof notifications !== 'object') {
      return res.status(400).json('Configurações de notificação inválidas');
    }

    if (!notifications.email || typeof notifications.email !== 'string') {
      return res.status(400).json('Email é obrigatório');
    }

    const site = await Site.create(req.body);
    await monitorService.monitorSite(site);
    res.json(site);
  } catch (err) {
    console.error('Erro ao adicionar site:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json(err.errors[0].message);
    }
    res.status(500).json('Erro ao adicionar site: ' + err.message);
  }
});

// Obter site específico
router.get('/:id', async (req, res) => {
  try {
    const site = await Site.findByPk(req.params.id);
    if (!site) {
      return res.status(404).json('Site não encontrado');
    }
    res.json(site);
  } catch (err) {
    console.error('Erro ao buscar site:', err);
    res.status(500).json('Erro ao buscar site: ' + err.message);
  }
});

// Atualizar site
router.put('/:id', async (req, res) => {
  try {
    const site = await Site.findByPk(req.params.id);
    if (!site) {
      return res.status(404).json('Site não encontrado');
    }

    if (req.body.url) {
      try {
        new URL(req.body.url);
      } catch (error) {
        return res.status(400).json('URL inválida');
      }
    }

    await site.update(req.body);
    res.json(site);
  } catch (err) {
    console.error('Erro ao atualizar site:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json(err.errors[0].message);
    }
    res.status(500).json('Erro ao atualizar site: ' + err.message);
  }
});

// Deletar site
router.delete('/:id', async (req, res) => {
  try {
    const site = await Site.findByPk(req.params.id);
    if (!site) {
      return res.status(404).json('Site não encontrado');
    }
    await site.destroy();
    res.json('Site deletado com sucesso.');
  } catch (err) {
    console.error('Erro ao deletar site:', err);
    res.status(500).json('Erro ao deletar site: ' + err.message);
  }
});

// Verificar site manualmente
router.post('/:id/check', async (req, res) => {
  try {
    const site = await Site.findByPk(req.params.id);
    if (!site) {
      return res.status(404).json('Site não encontrado');
    }
    const updatedSite = await monitorService.monitorSite(site);
    res.json(updatedSite);
  } catch (err) {
    console.error('Erro ao verificar site:', err);
    res.status(500).json('Erro ao verificar site: ' + err.message);
  }
});

// Atualizar configurações de notificação
router.put('/:id/notifications', async (req, res) => {
  try {
    const site = await Site.findByPk(req.params.id);
    if (!site) {
      return res.status(404).json('Site não encontrado');
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