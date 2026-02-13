# 🚀 Deploy HiperFarma CRM - GitHub para Coolify

> **Pré-requisito:** Coolify já instalado e funcionando

Este guia cobre o deploy completo da aplicação Next.js do repositório GitHub para produção.

---

## 📋 Checklist Rápido

**Antes de começar, certifique-se que você tem:**

- [ ] Coolify instalado e acessível
- [ ] Repositório no GitHub (público ou privado)
- [ ] Domínio DNS apontando para o servidor Coolify
- [ ] Acesso admin ao Coolify
- [ ] Acesso admin ao repositório GitHub

---

## 📁 1. Preparar o Repositório

### Arquivos Obrigatórios na Raiz do Repo

```
hiperfarma-crm/
├── Dockerfile          ← OBRIGATÓRIO
├── coolify.yaml        ← OBRIGATÓRIO
├── next.config.mjs     ← Deve ter output: 'standalone'
├── package.json
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── src/
```

### 1.1 Verificar next.config.mjs

```javascript
// next.config.mjs - CONFIGURAÇÃO CRÍTICA
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // ✅ OBRIGATÓRIO
  
  // Opcional mas recomendado
  compress: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

export default nextConfig
```

**Por quê?** Sem `standalone`, a imagem Docker terá ~1GB. Com `standalone`, apenas ~150-200MB.

### 1.2 Criar/Verificar Dockerfile

Use o Dockerfile que forneci anteriormente (multi-stage builds) ou este simplificado:

```dockerfile
# Deps
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
RUN npx prisma generate && npm run build

# Migration
FROM node:20-alpine AS migrate
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed"]

# Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init openssl libc6-compat
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
EXPOSE 3000
USER nextjs
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

### 1.3 Criar/Verificar coolify.yaml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 10s
    restart: unless-stopped

  migrate:
    build:
      context: .
      target: migrate
      args:
        NODE_ENV: production
    environment:
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      postgres:
        condition: service_healthy
    labels:
      - "coolify.exclude_from_hc=true"
    restart: 'no'

  app:
    build:
      context: .
      target: runner
      args:
        NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
    depends_on:
      migrate:
        condition: service_completed_successfully
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      AUTH_SECRET: ${AUTH_SECRET}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      AUTH_TRUST_HOST: ${AUTH_TRUST_HOST:-true}
      RESEND_API_KEY: ${RESEND_API_KEY}
      RESEND_FROM_EMAIL: ${RESEND_FROM_EMAIL}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
      UPLOAD_DIR: /app/uploads
    volumes:
      - uploads:/app/uploads
    expose:
      - 3000
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  uploads:
```

### 1.4 Commit e Push

```bash
git add Dockerfile coolify.yaml next.config.mjs
git commit -m "chore: adiciona configuração de deploy para Coolify"
git push origin main
```

---

## 🔧 2. Configurar GitHub App no Coolify

### 2.1 Criar Source

1. Dashboard Coolify → **Sources** → **+ Add**
2. Tipo: **GitHub App**
3. Preencha:
   - **Name**: `github-hiperfarma`
   - **Webhook Endpoint**: `https://coolify.seudominio.com`
4. ✅ **Preview Deployments**: Enabled (se quiser preview de PRs)
5. **Register Now**

### 2.2 Autorizar no GitHub

1. Será redirecionado para GitHub
2. Nome do app: `coolify-hiperfarma` (ou escolha outro)
3. **Create GitHub App**
4. Após criação, clique **Install Repositories on GitHub**
5. Escolha: **Only select repositories**
6. Selecione: `hiperfarma-crm`
7. **Install**

✅ Pronto! GitHub App configurado.

---

## 📦 3. Criar Resource no Coolify

### 3.1 Criar Projeto

1. Dashboard → **Projects** → **+ New**
2. Nome: `HiperFarma CRM`
3. Environment: `production`

### 3.2 Adicionar Application

1. Dentro do projeto → **+ New** → **Application**
2. Configuração:
   - **Type**: Private Repository (with GitHub App)
   - **Server**: `localhost` (ou seu servidor)
   - **Destination**: Docker Standalone
   - **GitHub App**: Selecione o app criado
   - **Repository**: `seu-usuario/hiperfarma-crm`
   - **Branch**: `main`
3. **Load Repository**

### 3.3 Configurar Build

1. **Build Pack**: `Docker Compose`
2. **Compose File Path**: `/coolify.yaml`
3. **Base Directory**: `/` (vazio = raiz)

**Build Arguments** (aba Build):
```
NEXT_PUBLIC_APP_URL=https://crm.seudominio.com
```

---

## 🌐 4. Configurar Domínio

### 4.1 Configurar DNS

No seu provedor de DNS (Cloudflare, etc):

```
Type: A
Name: crm
Value: <IP_DO_SERVIDOR_COOLIFY>
TTL: Auto
```

**Teste:**
```bash
nslookup crm.seudominio.com
# Deve retornar o IP do servidor
```

### 4.2 Adicionar Domínio no Coolify

1. Resource → **Domains** → **+ Add**
2. Digite: `crm.seudominio.com`
3. ✅ **Enable SSL** (Let's Encrypt automático)
4. ✅ **Enable Proxy**
5. **Save**

**Aguarde 1-2 minutos** para SSL ser provisionado.

---

## 🔐 5. Configurar Variáveis de Ambiente

### 5.1 Gerar Secrets Seguros

```bash
# AUTH_SECRET / NEXTAUTH_SECRET (32 bytes)
openssl rand -base64 32

# POSTGRES_PASSWORD (32 caracteres alfanuméricos)
openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c32
```

### 5.2 Adicionar no Coolify

Resource → **Environment** → Adicione:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<gere_com_openssl>
POSTGRES_DB=hiperfarma_crm
DATABASE_URL=postgresql://postgres:<senha_acima>@postgres:5432/hiperfarma_crm?schema=public

# Cache
REDIS_URL=redis://redis:6379

# Auth
AUTH_SECRET=<gere_com_openssl>
NEXTAUTH_SECRET=<mesmo_valor_acima>
NEXTAUTH_URL=https://crm.seudominio.com
NEXT_PUBLIC_APP_URL=https://crm.seudominio.com
AUTH_TRUST_HOST=true

# Email
RESEND_API_KEY=re_sua_chave
RESEND_FROM_EMAIL=naoresponda@seudominio.com

# MS Teams (opcional)
MS_TEAMS_CLIENT_ID=
MS_TEAMS_CLIENT_SECRET=
MS_TEAMS_TENANT_ID=
```

**⚠️ Atenção:**
- Em `DATABASE_URL`, o host é `postgres` (nome do serviço), não `localhost`
- `AUTH_SECRET` e `NEXTAUTH_SECRET` devem ter o mesmo valor
- `NEXT_PUBLIC_APP_URL` deve estar também como **Build Argument**

---

## 🚀 6. Fazer o Deploy

### 6.1 Deploy Inicial

1. No resource, clique **Deploy** (canto superior direito)
2. Monitore os logs em tempo real
3. Aguarde conclusão

**Ordem esperada:**
```
1. postgres: Building → Starting → Healthy ✅
2. redis: Building → Starting → Healthy ✅
3. migrate: Building → Starting → Exited (0) ✅ ← NORMAL!
4. app: Building → Starting → Healthy ✅
```

**Tempo estimado:** 5-10 minutos no primeiro deploy.

### 6.2 Verificar Status

Dashboard → Resource:
- postgres: ✅ Healthy
- redis: ✅ Healthy
- migrate: ⏸️ Exited (0) ← **Isto é normal!**
- app: ✅ Healthy

---

## ✅ 7. Validar Deployment

### 7.1 Health Check

```bash
curl https://crm.seudominio.com/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-02-13T...",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

### 7.2 Testar Login

1. Acesse: `https://crm.seudominio.com`
2. Vá em `/login`
3. Tente fazer login com credenciais do seed

### 7.3 Ver Logs

**No dashboard Coolify:**
- Resource → **Deployments** → Latest → **Logs**

**Via CLI no servidor:**
```bash
docker logs -f hiperfarma_app
docker logs -f hiperfarma_postgres
docker logs -f hiperfarma_redis
docker logs hiperfarma_migrate  # Não usa -f pois já finalizou
```

---

## 🔄 8. Deploy Automático (Auto-Deploy)

### 8.1 Habilitar Auto Deploy

1. Resource → **General**
2. ✅ **Auto Deploy**: Enabled
3. Save

### 8.2 Testar

```bash
# Faça uma mudança no código
git add .
git commit -m "feat: adiciona nova funcionalidade"
git push origin main
```

**O que acontece:**
1. GitHub envia webhook para Coolify
2. Coolify inicia deploy automaticamente
3. Logs disponíveis em tempo real no dashboard

**Ver histórico de deploys:**
Resource → **Deployments** → Lista de todos os deploys

---

## 🧪 9. Preview Deployments (Opcional)

Se você quer testar PRs antes do merge:

### 9.1 Configurar DNS Wildcard

```
Type: A
Name: *.preview
Value: <IP_DO_SERVIDOR_COOLIFY>
TTL: Auto
```

### 9.2 Habilitar no Coolify

1. Server → **localhost** → Wildcard Domain: `https://preview.seudominio.com`
2. Resource → **Advanced**:
   - ✅ **Preview Deployments**: Enabled
   - ⚠️ **Allow Public PR Deployments**: Disabled (segurança)
   - **Preview URL Template**: `{{pr_id}}.preview.seudominio.com`

### 9.3 Como Funciona

1. Crie branch: `git checkout -b feature/nova-funcionalidade`
2. Push: `git push origin feature/nova-funcionalidade`
3. Abra PR no GitHub: base `main` ← compare `feature/nova-funcionalidade`
4. Coolify cria preview automaticamente
5. URL aparece nos comentários do PR: `https://42.preview.seudominio.com`

**Limpeza:** Delete manualmente em Resource → **Pull Requests** → 🗑️

---

## 🔔 10. Configurar Notificações

### Opção A: Slack

1. Crie Incoming Webhook: https://api.slack.com/apps
2. Resource → **Notifications**:
   - ✅ Enable
   - **Slack Webhook URL**: Cole a URL
   - Eventos: Success, Failed
   - Save

### Opção B: Discord

1. Canal Discord → Configurações → Webhooks → Criar
2. Copie URL e adicione `/slack` no final:
   ```
   https://discord.com/api/webhooks/123/abc/slack
   ```
3. Resource → **Notifications**:
   - ✅ Enable
   - **Slack Webhook URL**: Cole a URL modificada
   - Save

### Opção C: Email

1. Coolify Settings → **Email** → Configure SMTP
2. Resource → **Notifications**:
   - ✅ Enable Email
   - **Recipients**: `equipe@empresa.com`
   - Eventos: **Apenas Failed** (evita spam)
   - Save

---

## 🔧 11. Troubleshooting Comum

### Problema: Build falha com "no space left on device"

```bash
# No servidor Coolify
docker system prune -a --volumes -f
```

### Problema: App não conecta no banco

**Diagnóstico:**
```bash
docker exec hiperfarma_app env | grep DATABASE_URL
```

**Causa comum:** Host errado em `DATABASE_URL`
- ❌ Errado: `localhost:5432`
- ✅ Correto: `postgres:5432`

### Problema: NEXT_PUBLIC_* não funciona

**Solução:** Adicione como Build Argument:
1. Resource → **Build** → Build Arguments
2. Adicione: `NEXT_PUBLIC_APP_URL=https://crm.seudominio.com`
3. Redeploy

### Problema: Migrate aparece "Unhealthy"

**Resposta:** Isto é normal! Migration é um job one-shot.

Status esperado:
- ⏸️ Exited (0) = Sucesso

Veja logs:
```bash
docker logs hiperfarma_migrate
```

### Problema: SSL não provisiona

**Diagnóstico:**
1. Verifique DNS: `nslookup crm.seudominio.com`
2. Verifique porta 443 aberta: `sudo ufw status`

**Solução:**
```bash
# Abrir portas se necessário
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Problema: Deploy automático não funciona

**Diagnóstico:**
Resource → **Webhooks** → Ver "Recent Deliveries"

**Causas comuns:**
1. Auto Deploy desabilitado → Habilite
2. Porta 8000 bloqueada → `sudo ufw allow 8000/tcp`
3. Webhook secret errado → Re-registre GitHub App

---

## 📊 12. Monitoramento

### Health Endpoint

Implemente em `app/api/health/route.ts`:

```typescript
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {} as Record<string, string>,
  }

  // Database
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.services.database = 'healthy'
  } catch {
    checks.services.database = 'unhealthy'
    checks.status = 'degraded'
  }

  // Redis
  try {
    await redis.ping()
    checks.services.redis = 'healthy'
  } catch {
    checks.services.redis = 'unavailable'
  }

  return Response.json(checks, {
    status: checks.status === 'ok' ? 200 : 503,
  })
}
```

### Monitorar Recursos

**No servidor:**
```bash
docker stats hiperfarma_app
docker stats hiperfarma_postgres
```

**Ajustar limites no coolify.yaml:**
```yaml
app:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 768M
```

---

## 🎯 13. Manutenção

### Backup do Banco

**Manual:**
```bash
docker exec hiperfarma_postgres pg_dump -U postgres hiperfarma_crm > backup.sql
```

**Automático (cron job):**
```bash
# crontab -e
0 3 * * * docker exec hiperfarma_postgres pg_dump -U postgres hiperfarma_crm | gzip > /backups/$(date +\%Y\%m\%d).sql.gz
```

**Ou use feature nativa:**
Resource → **Backups** → Configure

### Atualizar Dependências

```bash
# Local
npm update
npm audit fix
git add package*.json
git commit -m "chore: atualiza dependências"
git push origin main
```

Coolify faz deploy automático.

### Ver Logs Históricos

```bash
# Últimas 100 linhas
docker logs --tail=100 hiperfarma_app

# Desde timestamp
docker logs --since="2025-02-13T12:00:00" hiperfarma_app

# Salvar em arquivo
docker logs hiperfarma_app > app.log 2>&1
```

---

## ✅ Checklist Final

Antes de considerar deployment completo:

### Aplicação
- [ ] Health endpoint respondendo 200
- [ ] Login funcionando
- [ ] Upload de arquivos funcionando (se aplicável)
- [ ] Emails sendo enviados (se aplicável)

### Infraestrutura
- [ ] SSL funcionando (HTTPS)
- [ ] Auto-deploy habilitado
- [ ] Backups configurados
- [ ] Notificações configuradas (Slack/Discord/Email)

### Segurança
- [ ] Secrets não estão no código
- [ ] Firewall configurado
- [ ] Container roda como non-root user
- [ ] Variáveis de ambiente corretas

### Monitoramento
- [ ] Health checks passando
- [ ] Logs acessíveis
- [ ] Resource limits configurados
- [ ] Alertas de falha configurados

---

## 📚 Comandos Úteis

```bash
# Ver status de todos os containers
docker ps -a

# Restart do app (sem rebuild)
docker restart hiperfarma_app

# Ver uso de recursos
docker stats

# Limpar espaço
docker system prune -a --volumes -f

# Executar comando no container
docker exec -it hiperfarma_app sh

# Testar DATABASE_URL
docker exec hiperfarma_app npx prisma db pull

# Ver logs em tempo real
docker logs -f hiperfarma_app

# Backup manual do banco
docker exec hiperfarma_postgres pg_dump -U postgres hiperfarma_crm > backup_$(date +\%Y\%m\%d).sql
```

---

## 🆘 Precisa de Ajuda?

1. **Logs do Coolify:** Dashboard → Resource → Deployments → Latest → Logs
2. **Logs do container:** `docker logs hiperfarma_app`
3. **Coolify Discord:** https://discord.gg/coolify
4. **GitHub Issues:** https://github.com/coollabsio/coolify/issues

---

**Última atualização:** Fevereiro 2025  
**Versão:** 2.0 (Focada em Deploy)
