# App Monitor

Aplicação de monitoramento de sites, certificados SSL e domínios.

## Estrutura do Projeto

```
app-monitor/
├── frontend/     # Aplicação React
├── backendAppMonitor/      # API Node.js
└── ecosystem.config.js  # Configuração PM2
```

## Pré-requisitos

- Node.js 16+
- NPM ou Yarn
- MySQL (ou SQLite como alternativa)

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/app-monitor.git
cd app-monitor
```

2. Instale as dependências:
```bash
cd frontend && npm install
cd ../backendAppMonitor && npm install
```

## Configuração do Banco de Dados

### MySQL (Recomendado)
A aplicação está configurada para usar MySQL com as seguintes credenciais:

```
Host: isp-apache-ded-333.intesys.io
Usuário: c21sqlmonitor
Senha: cEDLp3t5hmQZ_
Banco: c21sqlmonitor
```

### Migração de SQLite para MySQL

Se você estava usando SQLite anteriormente, siga os passos no arquivo `backendAppMonitor/MIGRATION_GUIDE.md` para migrar seus dados.

Para executar a migração:

```bash
cd backendAppMonitor
npm run migrate
```

### Voltar para SQLite (caso necessário)

Para usar SQLite em vez de MySQL, edite o arquivo `backendAppMonitor/config/database.js` e altere a variável `dbDialect` para 'sqlite'.

## Desenvolvimento Local

Para rodar o projeto localmente:

```bash
# Terminal 1 - Backend
cd backendAppMonitor
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

## Deploy com PM2

Use o arquivo ecosystem.config.js para deploy com PM2:

```bash
pm2 start ecosystem.config.js
```

## Variáveis de Ambiente

### Backend
```
DB_DIALECT=mysql
DB_HOST=isp-apache-ded-333.intesys.io
DB_PORT=3306
DB_NAME=c21sqlmonitor
DB_USER=c21sqlmonitor
DB_PASSWORD=cEDLp3t5hmQZ_
PORT=5000
NODE_ENV=production
```

## Scripts Disponíveis

- `npm start`: Inicia o backend/frontend
- `npm run migrate`: Migra dados de SQLite para MySQL

## Licença

ISC 