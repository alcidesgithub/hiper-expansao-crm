# Deploy Guide - HiperFarma CRM (Coolify + Docker Compose)

Este guia descreve o deploy do projeto no Coolify usando o `coolify.yaml` da raiz.

## 1. Pre-requisitos

- Coolify instalado e acessivel.
- Repositorio GitHub conectado ao Coolify (GitHub App ou token).
- Dominio apontando para o servidor do Coolify.
- Acesso ao painel do Coolify e ao repositorio.

## 2. Arquitetura de Deploy

O `coolify.yaml` sobe os servicos:

- `postgres`: banco PostgreSQL com volume persistente.
- `redis`: cache Redis com volume persistente.
- `migrate`: job one-shot que executa migration + seed.
- `app`: Next.js (sobe apenas depois do `migrate` concluir com sucesso).

Ordem esperada:

1. `postgres` e `redis` sobem e ficam healthy.
2. `migrate` roda `prisma migrate deploy` e `prisma db seed`.
3. `app` inicia com `depends_on` do `migrate`.

## 3. Configuracao no Coolify

1. Crie um novo `Project` (environment: `production`).
2. Adicione uma `Application` apontando para este repositorio/branch.
3. Em `Build Pack`, selecione `Docker Compose`.
4. Defina `Compose File Path` como `/coolify.yaml`.
5. Defina `Base Directory` como `/` (raiz do repo).
6. Em `Build Arguments`, configure:
   - `NEXT_PUBLIC_APP_URL=https://crm.seudominio.com`
7. Em `Domains`, adicione `crm.seudominio.com` e habilite SSL.

## 4. Variaveis de Ambiente (Production)

Configure no painel do Coolify:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<senha-forte>
POSTGRES_DB=hiperfarma_crm
DATABASE_URL=postgresql://postgres:<senha-forte>@postgres:5432/hiperfarma_crm?schema=public

# Cache
REDIS_URL=redis://redis:6379

# Auth
AUTH_SECRET=<segredo-forte>
NEXTAUTH_SECRET=<mesmo-valor-do-AUTH_SECRET>
NEXTAUTH_URL=https://crm.seudominio.com
NEXT_PUBLIC_APP_URL=https://crm.seudominio.com
AUTH_TRUST_HOST=true

# Email
RESEND_API_KEY=<chave-resend>
RESEND_FROM_EMAIL=naoresponda@seudominio.com

# Microsoft Teams (opcional — usa SDK Microsoft Graph)
# Nomes alternativos aceitos: MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET
MS_TEAMS_CLIENT_ID=
MS_TEAMS_CLIENT_SECRET=
MS_TEAMS_TENANT_ID=
MS_TEAMS_GRAPH_SCOPE=https://graph.microsoft.com/.default
MS_TEAMS_WEBHOOK_URL=https://crm.seudominio.com/api/integrations/teams/webhook
MS_TEAMS_WEBHOOK_CLIENT_STATE=<segredo-forte-unico>
TEAMS_SYNC_CRON_TOKEN=<token-forte>

# Seed (obrigatoria no migrate em producao)
SEED_DEFAULT_PASSWORD=<senha-forte-12+-chars>
```

Notas importantes:

- Em `DATABASE_URL`, use host `postgres` (nao `localhost`).
- `NEXT_PUBLIC_APP_URL` precisa existir tanto no runtime quanto em Build Argument.
- `SEED_DEFAULT_PASSWORD` e obrigatoria em producao e deve ter no minimo 12 caracteres.
- Nao versione `.env` real no Git.

## 5. Fluxo de Deploy

1. Clique em `Deploy`.
2. Acompanhe os logs do deployment.
3. Status esperado:
   - `postgres`: healthy
   - `redis`: healthy
   - `migrate`: exited (0) - normal para one-shot
   - `app`: running/healthy

## 6. Validacao Pos-Deploy

1. Health check:
   - `GET https://crm.seudominio.com/api/health`
2. Login:
   - acessar `/login` e validar autenticacao.
3. Banco e seed:
   - confirmar no log do `migrate` que migration e seed finalizaram.
4. Email:
   - validar envio (se `RESEND_API_KEY` estiver configurada).
5. Agendamento:
   - validar criacao de reuniao e link de lead no CRM.

Sobre o `/api/health`:

- `status: "ok"` quando DB/Redis estao saudaveis.
- `status: "degraded"` quando algum servico opcional esta degradado.
- `status: "down"` retorna HTTP `503`.

## 7. Auto-Deploy

Para deploy automatico a cada push na branch:

1. Abra a aplicacao no Coolify.
2. Habilite `Auto Deploy`.
3. Salve.

## 8. Job Agendado (Teams Subscriptions)

Se usar integracao Teams, crie Scheduled Job no Coolify (ex.: a cada 6 horas):

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer $TEAMS_SYNC_CRON_TOKEN" \
  https://crm.seudominio.com/api/integrations/teams/subscriptions/sync
```

Respostas esperadas:

- `401`: token invalido.
- `503`: token nao configurado.

## 9. Troubleshooting Rapido

### Build sem `NEXT_PUBLIC_*`

- Garanta `NEXT_PUBLIC_APP_URL` em `Build Arguments`.
- Redeploy apos ajustar.

### App nao conecta no banco

- Verifique `DATABASE_URL`.
- Host deve ser `postgres`.
- Usuario/senha devem bater com `POSTGRES_USER` e `POSTGRES_PASSWORD`.

### Migrate falha

- Verifique se `DATABASE_URL` esta correta.
- Verifique se `SEED_DEFAULT_PASSWORD` existe e possui 12+ chars.
- O `prisma.config.ts` deve estar presente na raiz (o Dockerfile ja o copia para o estagio `migrator`).
- Consulte logs do servico `migrate`.

### SSL nao provisiona

- Verifique DNS do dominio.
- Verifique portas 80/443 no servidor.

## 10. Checklist Final

- Health endpoint responde.
- Login funcionando.
- `migrate` terminou com sucesso.
- App rodando sem erro de conexao com DB/Redis.
- SSL ativo no dominio.
- Auto-deploy configurado.
- Secrets apenas no painel do Coolify.

## 11. Comandos Uteis (local)

- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:setup`
