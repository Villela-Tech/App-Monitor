const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const dns = require('dns').promises;
const fetch = require('node-fetch');

class IPService {
  /**
   * Verifica se um endereço IP está online usando ping
   * @param {string} ip Endereço IP a ser verificado
   * @returns {Promise<Object>} Resultado do ping
   */
  async pingIP(ip) {
    try {
      const startTime = Date.now();
      
      // Comando de ping diferente para Windows e Linux/Mac
      const isWindows = process.platform === 'win32';
      const pingCmd = isWindows 
        ? `ping -n 1 ${ip}` 
        : `ping -c 1 ${ip}`;
      
      const { stdout } = await exec(pingCmd, { timeout: 5000 });
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Analisar a saída do ping para extrair estatísticas
      const stats = this.parsePingOutput(stdout, isWindows);
      
      return {
        status: 'up',
        responseTime: stats.avg || responseTime,
        packetLoss: stats.packetLoss,
        min: stats.min,
        max: stats.max,
        avg: stats.avg,
        raw: stdout
      };
    } catch (error) {
      console.error(`Erro ao fazer ping para ${ip}:`, error.message);
      return {
        status: 'down',
        responseTime: 5000,
        error: error.message,
        packetLoss: 100,
        raw: error.message
      };
    }
  }
  
  /**
   * Analisa a saída do comando ping para extrair estatísticas
   * @param {string} output Saída do comando ping
   * @param {boolean} isWindows Se o sistema operacional é Windows
   * @returns {Object} Estatísticas de ping
   */
  parsePingOutput(output, isWindows) {
    try {
      const result = {
        min: null,
        max: null,
        avg: null,
        packetLoss: null
      };
      
      if (isWindows) {
        // Extrair perda de pacotes no Windows
        const packetLossMatch = output.match(/(\d+)% loss/);
        if (packetLossMatch) {
          result.packetLoss = parseInt(packetLossMatch[1], 10);
        }
        
        // Extrair tempo no Windows
        const timeMatch = output.match(/time=(\d+)ms/);
        if (timeMatch) {
          const time = parseInt(timeMatch[1], 10);
          result.min = time;
          result.max = time;
          result.avg = time;
        }
      } else {
        // Extrair perda de pacotes no Linux/Mac
        const packetLossMatch = output.match(/(\d+)% packet loss/);
        if (packetLossMatch) {
          result.packetLoss = parseInt(packetLossMatch[1], 10);
        }
        
        // Extrair tempo no Linux/Mac
        const timeMatch = output.match(/time=([0-9.]+) ms/);
        if (timeMatch) {
          const time = parseFloat(timeMatch[1]);
          result.min = time;
          result.max = time;
          result.avg = time;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao analisar saída do ping:', error);
      return {
        min: null,
        max: null,
        avg: null,
        packetLoss: null
      };
    }
  }
  
  /**
   * Obtém informações detalhadas sobre um IP usando serviços externos
   * @param {string} ip Endereço IP
   * @returns {Promise<Object>} Informações do IP
   */
  async getIPInfo(ip) {
    try {
      // Usar API pública para obter informações do IP
      const response = await fetch(`http://ip-api.com/json/${ip}`);
      const data = await response.json();
      
      if (data.status === 'fail') {
        throw new Error(data.message || 'Falha ao obter informações do IP');
      }
      
      // Tentar fazer lookup reverso de DNS
      let reverseDns = null;
      try {
        const hostnames = await dns.reverse(ip);
        reverseDns = hostnames[0] || null;
      } catch (error) {
        console.log(`Não foi possível obter DNS reverso para ${ip}:`, error.message);
      }
      
      return {
        ip,
        country: data.country,
        countryCode: data.countryCode,
        region: data.region,
        regionName: data.regionName,
        city: data.city,
        zip: data.zip,
        lat: data.lat,
        lon: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        org: data.org,
        as: data.as,
        reverseDns,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Erro ao obter informações do IP ${ip}:`, error);
      return {
        ip,
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }
  
  /**
   * Verifica portas abertas em um IP
   * @param {string} ip Endereço IP
   * @param {Array<number>} ports Lista de portas a verificar
   * @returns {Promise<Object>} Resultado da verificação de portas
   */
  async checkPorts(ip, ports = [80, 443, 22, 21, 25, 3306, 5432]) {
    const results = {};
    
    for (const port of ports) {
      try {
        const startTime = Date.now();
        
        // Usar socket para verificar se a porta está aberta
        const { stdout, stderr } = await exec(`node -e "
          const net = require('net');
          const client = net.createConnection({ host: '${ip}', port: ${port} }, () => {
            console.log('open');
            client.end();
          });
          client.setTimeout(3000);
          client.on('error', (err) => {
            console.log('closed');
            client.end();
          });
          client.on('timeout', () => {
            console.log('timeout');
            client.end();
          });
        "`, { timeout: 5000 });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        const output = stdout.trim();
        results[port] = {
          status: output === 'open' ? 'open' : 'closed',
          responseTime: responseTime
        };
      } catch (error) {
        results[port] = {
          status: 'error',
          error: error.message
        };
      }
    }
    
    return {
      ip,
      ports: results,
      lastCheck: new Date().toISOString()
    };
  }
}

module.exports = IPService; 