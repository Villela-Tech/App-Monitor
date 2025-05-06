const whois = require('whois-json');
const dns = require('dns').promises;
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

class DomainService {
  async getDomainInfo(url) {
    try {
      const hostname = new URL(url).hostname;
      const whoisData = await whois(hostname);
      
      console.log('Dados WHOIS recebidos:', JSON.stringify(whoisData, null, 2));

      // Função para parsear datas no formato do registro.br (YYYYMMDD)
      const parseBrDate = (dateStr) => {
        if (!dateStr) return null;
        const match = dateStr.match(/(\d{4})(\d{2})(\d{2})/);
        if (match) {
          return new Date(match[1], match[2] - 1, match[3]).toISOString();
        }
        return dateStr;
      };

      // Função auxiliar para buscar valor em diferentes chaves
      const findValue = (obj, keys) => {
        for (const key of keys) {
          const value = typeof key === 'function' ? key(obj) : obj[key];
          if (value) return value;
        }
        return null;
      };

      // Tratar dados específicos do registro.br
      if (hostname.endsWith('.br')) {
        const domainInfo = {
          registrar: 'Registro.br',
          creationDate: parseBrDate(whoisData.created?.split(' ')[0]),
          expiryDate: parseBrDate(whoisData.expires),
          updatedDate: parseBrDate(whoisData.changed?.split(' ')[0]),
          nameservers: whoisData.nserver ? whoisData.nserver.split(' ') : [],
          status: ['registered'],
          owner: whoisData.owner || whoisData.person || 'Não disponível',
          email: whoisData.eMail || whoisData['e-mail'] || 'Não disponível',
          country: whoisData.country || 'BR'
        };

        console.log('Informações do domínio extraídas (BR):', JSON.stringify(domainInfo, null, 2));

        return {
          ...domainInfo,
          daysRemaining: this.calculateDaysRemaining(domainInfo.expiryDate)
        };
      }

      // Lista de possíveis chaves para cada campo (para outros TLDs)
      const registrarKeys = [
        'registrar',
        'Registrar',
        'Registrant',
        'registrant',
        'Registrant Organization',
        'Registrant Name',
        obj => obj['Registrant'] && obj['Registrant']['Organization'],
        obj => obj['registrant'] && obj['registrant']['organization']
      ];

      const ownerKeys = [
        'owner',
        'Registrant Name',
        'Registrant',
        'person',
        obj => obj['Registrant'] && obj['Registrant']['Name'],
        'Organization'
      ];

      const emailKeys = [
        'eMail',
        'e-mail',
        'Email',
        'Registrant Email',
        obj => obj['Registrant'] && obj['Registrant']['Email'],
        'email'
      ];

      const creationKeys = [
        'creationDate',
        'Creation Date',
        'Domain Registration Date',
        'Created Date',
        'Domain Create Date',
        'Created On',
        'created'
      ];

      const expiryKeys = [
        'expiryDate',
        'Registry Expiry Date',
        'Expiration Date',
        'Domain Expiration Date',
        'Expiry Date',
        'Expires On',
        'expires'
      ];

      const updateKeys = [
        'updatedDate',
        'Updated Date',
        'Last Updated Date',
        'Last Modified',
        'Modified Date',
        'Update Date',
        'Last Update',
        'changed'
      ];

      const nameserverKeys = [
        'nameServers',
        'Name Server',
        'Nameservers',
        'Name Servers',
        'nserver',
        obj => {
          const ns = [];
          for (const key in obj) {
            if (key.toLowerCase().includes('name server')) {
              ns.push(obj[key]);
            }
          }
          return ns.length > 0 ? ns : null;
        }
      ];

      const domainInfo = {
        registrar: findValue(whoisData, registrarKeys) || 'Não disponível',
        creationDate: findValue(whoisData, creationKeys),
        expiryDate: findValue(whoisData, expiryKeys),
        updatedDate: findValue(whoisData, updateKeys),
        nameservers: findValue(whoisData, nameserverKeys) || [],
        status: whoisData.status || whoisData['Domain Status'] || whoisData['Status'] || [],
        owner: findValue(whoisData, ownerKeys) || 'Não disponível',
        email: findValue(whoisData, emailKeys) || 'Não disponível',
        country: whoisData.country || 'Não disponível'
      };

      console.log('Informações do domínio extraídas:', JSON.stringify(domainInfo, null, 2));

      return {
        ...domainInfo,
        daysRemaining: this.calculateDaysRemaining(domainInfo.expiryDate)
      };
    } catch (error) {
      console.error('Erro ao obter informações do domínio:', error);
      return null;
    }
  }

  async getDNSInfo(url) {
    try {
      const hostname = new URL(url).hostname;
      const [
        aRecords,
        aaaaRecords,
        mxRecords,
        txtRecords,
        nsRecords,
        cnameRecords
      ] = await Promise.all([
        dns.resolve4(hostname).catch(() => []),
        dns.resolve6(hostname).catch(() => []),
        dns.resolveMx(hostname).catch(() => []),
        dns.resolveTxt(hostname).catch(() => []),
        dns.resolveNs(hostname).catch(() => []),
        dns.resolveCname(hostname).catch(() => [])
      ]);

      // Tentar obter o SOA record
      let soaRecord = null;
      try {
        soaRecord = await dns.resolveSoa(hostname);
      } catch (error) {
        console.log('SOA record não disponível');
      }

      // Verificar propagação de DNS
      const dnsServers = [
        '8.8.8.8',        // Google
        '1.1.1.1',        // Cloudflare
        '208.67.222.222'  // OpenDNS
      ];

      const propagationChecks = await Promise.all(
        dnsServers.map(async (server) => {
          try {
            const { stdout } = await exec(`nslookup ${hostname} ${server}`);
            return { server, propagated: true, response: stdout };
          } catch (error) {
            return { server, propagated: false, error: error.message };
          }
        })
      );

      return {
        a: aRecords,
        aaaa: aaaaRecords,
        mx: mxRecords,
        txt: txtRecords,
        ns: nsRecords,
        cname: cnameRecords,
        soa: soaRecord,
        propagation: propagationChecks,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao obter informações de DNS:', error);
      return null;
    }
  }

  calculateDaysRemaining(expiryDate) {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = Math.abs(expiry - now);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

module.exports = new DomainService(); 