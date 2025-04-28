const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Site = sequelize.define('Site', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      isUrl: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  status: {
    type: DataTypes.ENUM('up', 'down', 'unknown'),
    defaultValue: 'unknown'
  },
  lastCheck: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  sslInfo: {
    type: DataTypes.JSON,
    defaultValue: null,
    get() {
      const rawValue = this.getDataValue('sslInfo');
      return rawValue ? JSON.parse(JSON.stringify(rawValue)) : null;
    }
  },
  domainInfo: {
    type: DataTypes.JSON,
    defaultValue: null,
    get() {
      const rawValue = this.getDataValue('domainInfo');
      return rawValue ? JSON.parse(JSON.stringify(rawValue)) : null;
    }
  },
  notifications: {
    type: DataTypes.JSON,
    defaultValue: {
      email: '',
      downtime: true,
      sslExpiry: true,
      domainExpiry: true
    },
    validate: {
      isValidNotifications(value) {
        if (!value || typeof value !== 'object') {
          throw new Error('Configurações de notificação inválidas');
        }
        if (!value.email || typeof value.email !== 'string') {
          throw new Error('Email é obrigatório');
        }
        if (typeof value.downtime !== 'boolean' ||
            typeof value.sslExpiry !== 'boolean' ||
            typeof value.domainExpiry !== 'boolean') {
          throw new Error('Configurações de notificação inválidas');
        }
      }
    },
    get() {
      const rawValue = this.getDataValue('notifications');
      return rawValue ? JSON.parse(JSON.stringify(rawValue)) : null;
    }
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true
  }
});

module.exports = Site; 