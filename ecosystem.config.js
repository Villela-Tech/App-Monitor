module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './backendAppMonitor',
      script: 'server.js',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        REACT_APP_API_URL: 'http://8.242.76.156:5000'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        REACT_APP_API_URL: 'http://8.242.76.156:5000'
      }
    }
  ]
}; 