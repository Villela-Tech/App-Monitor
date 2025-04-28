# Monitor de Sites

Sistema de monitoramento de sites que verifica:
- Status (up/down)
- Certificados SSL
- Expiração de domínios
- Notificações por email

## Requisitos

- Node.js (v14 ou superior)
- MongoDB
- Conta de email para envio de notificações

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/site-monitor.git
cd site-monitor
```

2. Instale as dependências do backend:
```bash
npm install
```

3. Instale as dependências do frontend:
```bash
cd frontend
npm install
```

4. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/site-monitor
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=seu-email@gmail.com
```

## Executando o projeto

1. Inicie o servidor MongoDB

2. Em um terminal, inicie o backend:
```bash
npm run dev:backend
```

3. Em outro terminal, inicie o frontend:
```bash
npm run dev:frontend
```

4. Acesse a aplicação em `http://localhost:3000`

## Funcionalidades

- Monitoramento de status dos sites (verificação a cada 5 minutos)
- Verificação de certificados SSL
- Verificação de expiração de domínios
- Notificações por email para:
  - Site fora do ar
  - Certificado SSL próximo de expirar (30 dias)
  - Domínio próximo de expirar (30 dias)
- Interface moderna e responsiva
- Dashboard com visão geral dos sites monitorados
- Página de detalhes para cada site

## Tecnologias utilizadas

- Backend:
  - Node.js
  - Express
  - MongoDB/Mongoose
  - node-fetch
  - ssl-checker
  - whois-json
  - nodemailer

- Frontend:
  - React
  - Material-UI
  - Axios
  - React Router 