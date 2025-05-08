const API_URL = process.env.REACT_APP_API_URL || 'http://8.242.76.156:5000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://8.242.76.156:5000';

const api = {
  sites: {
    list: () => `${API_URL}/api/sites`,
    get: (id) => `${API_URL}/api/sites/${id}`,
    create: () => `${API_URL}/api/sites`,
    update: (id) => `${API_URL}/api/sites/${id}`,
    delete: (id) => `${API_URL}/api/sites/${id}`,
    check: (id) => `${API_URL}/api/sites/${id}/check`,
    metrics: (id) => `${API_URL}/api/sites/${id}/metrics`,
    notifications: (id) => `${API_URL}/api/sites/${id}/notifications`,
    checkPorts: (id) => `${API_URL}/api/sites/${id}/check-ports`,
    updateNotifications: (id) => `${API_URL}/api/sites/${id}/notifications`
  },
  history: {
    list: (siteId) => `${API_URL}/api/history/${siteId}`,
    stats: (siteId) => `${API_URL}/api/history/${siteId}/stats`
  },
  websocket: {
    connect: () => WS_URL
  }
};

export default api; 