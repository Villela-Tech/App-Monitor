# App Monitor

Aplicação de monitoramento de sites, certificados SSL e domínios.

## Estrutura do Projeto

```
app-monitor/
├── frontend/     # Aplicação React
├── backend/      # API Node.js
└── netlify.toml  # Configuração do Netlify
```

## Pré-requisitos

- Node.js 16+
- NPM ou Yarn
- PostgreSQL

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/app-monitor.git
cd app-monitor
```

2. Instale as dependências:
```bash
npm run install-all
```

## Desenvolvimento Local

Para rodar o projeto localmente:

```bash
npm run dev
```

## Deploy

### Frontend (Netlify)

1. Conecte seu repositório ao Netlify
2. Configure as variáveis de ambiente:
   - `REACT_APP_API_URL`: URL do seu backend

3. O deploy será automático a cada push na branch principal

### Backend (Heroku/Railway/Render)

1. Escolha uma plataforma de hospedagem
2. Configure as variáveis de ambiente:
   - `DATABASE_URL`: URL do banco PostgreSQL
   - `FRONTEND_URL`: URL do frontend no Netlify
   - `NODE_ENV`: "production"

3. Configure o banco de dados PostgreSQL

## Variáveis de Ambiente

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000
```

### Backend (.env)
```
PORT=5000
DATABASE_URL=postgres://usuario:senha@host:5432/banco
FRONTEND_URL=http://localhost:3000
```

## Scripts Disponíveis

- `npm run dev`: Inicia o projeto em modo desenvolvimento
- `npm run build`: Build do frontend
- `npm start`: Inicia o backend
- `npm run install-all`: Instala todas as dependências

## Licença

ISC 