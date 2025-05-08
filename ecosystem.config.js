module.exports = {
  apps: [
    {
      name: 'backend',
      script: './backendAppMonitor/server.js',
      watch: ['backendAppMonitor'],
      ignore_watch: [
        'node_modules',
        'backendAppMonitor/database.sqlite',
        'backendAppMonitor/database.sqlite-journal'
      ],
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        DB_DIALECT: 'mysql',
        DB_HOST: 'isp-apache-ded-333.intesys.io',
        DB_NAME: 'c21sqlmonitor',
        DB_USER: 'c21sqlmonitor',
        DB_PASSWORD: 'cEDLp3t5hmQZ_'
      }
    },
    {
      name: 'frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        REACT_APP_API_URL: 'http://172.16.105.12:5000'
      }
    }
  ]
}; 