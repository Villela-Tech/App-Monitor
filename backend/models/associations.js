const Site = require('./site.model');
const History = require('./history.model');

// Definir associações
Site.hasMany(History, {
  foreignKey: 'siteId',
  as: 'history'
});

History.belongsTo(Site, {
  foreignKey: 'siteId',
  as: 'site'
});

module.exports = {
  Site,
  History
}; 