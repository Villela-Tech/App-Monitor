const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';

export const getApiUrl = (endpoint) => `${API_URL}${endpoint}`;
export const getWsUrl = (endpoint) => `${WS_URL}${endpoint}`;

export default {
  sites: {
    list: () => getApiUrl('/api/sites'),
    get: (id) => getApiUrl(`/api/sites/${id}`),
    create: () => getApiUrl('/api/sites'),
    update: (id) => getApiUrl(`/api/sites/${id}`),
    delete: (id) => getApiUrl(`/api/sites/${id}`),
    check: (id) => getApiUrl(`/api/sites/${id}/check`),
    metrics: (id) => getApiUrl(`/api/sites/${id}/metrics`),
    notifications: (id) => getApiUrl(`/api/sites/${id}/notifications`)
  },
  websocket: {
    connect: () => getWsUrl('/ws')
  }
}; 