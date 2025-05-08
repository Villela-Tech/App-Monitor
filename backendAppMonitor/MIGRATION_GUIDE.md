# Guia de Migração: SQLite para MySQL

Este guia descreve os passos para migrar o banco de dados do App Monitor de SQLite para MySQL.

## Pré-requisitos

1. Acesso ao servidor MySQL
   - Host: isp-apache-ded-333.intesys.io
   - Usuário: c21sqlmonitor
   - Senha: cEDLp3t5hmQZ_
   - Banco de dados: c21sqlmonitor

2. Pacotes necessários já instalados:
   - mysql2
   - sequelize

## Passos para Migração

### 1. Verificar Conexão com o MySQL

Execute o script de teste de conexão:

```bash
node test-mysql-connection.js
```

Se houver problemas de conexão, verifique:
- Se o host está correto
- Se as credenciais estão corretas
- Se o servidor MySQL está acessível da sua rede (firewall, VPN, etc.)
- Se a porta está correta (padrão: 3306)

### 2. Migrar Dados do SQLite para MySQL

Execute o script de migração:

```bash
npm run migrate
```

Este script:
1. Conecta-se ao banco de dados SQLite existente
2. Lê todos os dados das tabelas
3. Cria as tabelas correspondentes no MySQL
4. Insere os dados no MySQL

### 3. Verificar a Migração

Após a migração, verifique se os dados foram transferidos corretamente:

```bash
node test-mysql-connection.js
```

### 4. Atualizar Configuração

A configuração já foi atualizada para usar MySQL em vez de SQLite.

### 5. Backup do SQLite (Opcional)

Recomendamos manter um backup do arquivo SQLite original:

```bash
cp database.sqlite database.sqlite.backup
```

## Solução de Problemas

### Erro de Conexão

Se ocorrer um erro "ETIMEDOUT" ou "ECONNREFUSED":
- Verifique se o servidor MySQL está acessível
- Verifique se as credenciais estão corretas
- Verifique configurações de firewall

### Erro de Tabela ou Coluna

Se ocorrer um erro relacionado a tabelas ou colunas:
- Verifique se o esquema do banco de dados está correto
- Execute `sequelize.sync({ force: true })` para recriar as tabelas

## Notas Adicionais

- O MySQL é mais rigoroso com tipos de dados do que o SQLite
- O MySQL diferencia maiúsculas de minúsculas nos nomes de tabelas em alguns sistemas operacionais
- Certifique-se de que o usuário MySQL tenha permissões adequadas para criar/modificar tabelas 