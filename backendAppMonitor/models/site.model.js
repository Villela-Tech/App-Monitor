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
      notEmpty: true
    }
  },
  type: {
    type: DataTypes.ENUM('url', 'ip'),
    allowNull: false,
    defaultValue: 'url'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'website',
    validate: {
      isIn: [['website', 'application', 'domain', 'api', 'server', 'ip', 'other']]
    }
  },
  status: {
    type: DataTypes.ENUM('up', 'down', 'unknown'),
    defaultValue: 'unknown'
  },
  responseTime: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  lastCheck: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  anomalyThreshold: {
    type: DataTypes.INTEGER,
    defaultValue: 1000, // Limite em ms para considerar uma anomalia
    allowNull: false
  },
  averageResponseTime: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  standardDeviation: {
    type: DataTypes.FLOAT,
    allowNull: true
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
  dnsInfo: {
    type: DataTypes.JSON,
    defaultValue: null,
    get() {
      const rawValue = this.getDataValue('dnsInfo');
      return rawValue ? JSON.parse(JSON.stringify(rawValue)) : null;
    }
  },
  ipInfo: {
    type: DataTypes.JSON,
    defaultValue: null,
    get() {
      const rawValue = this.getDataValue('ipInfo');
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