# HiperFarma CRM

Sistema de captacao, qualificacao e operacao comercial para o processo de expansao da rede Hiperfarma.

## Visao Geral

Este repositorio concentra:

- Funnel publico de qualificacao (`/funnel/*`) com gate de perfil e score de lead.
- CRM interno (`/dashboard/*`) para acompanhamento comercial, agenda e operacao.
- Agendamento de reunioes com suporte a integracao opcional com Microsoft Teams.
- Controle de acesso por papel (RBAC) para proteger dados e acoes sensiveis.
- Pipeline de deploy com migracao + seed automatizados via Docker Compose/Coolify.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Prisma ORM + PostgreSQL
- Redis
- NextAuth (Auth.js v5 beta)
- Playwright (E2E) + testes de integracao/unidade em `tsx --test`

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL disponivel na `DATABASE_URL`
- Redis disponivel na `REDIS_URL`

## Setup Local

1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Ajuste no `.env` os valores minimos para ambiente local:

- `DATABASE_URL` (ex.: `postgresql://postgres:postgres@localhost:5432/hiperfarma_crm?schema=public`)
- `REDIS_URL` (ex.: `redis://localhost:6379`)
- `AUTH_SECRET` e `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` e `NEXT_PUBLIC_APP_URL` (ex.: `http://localhost:3000`)
- `SEED_DEFAULT_PASSWORD` (recomendado para definir a senha inicial dos usuarios seed)

3. Instale dependencias:

```bash
npm install
```

4. Rode migrations e seed:

```bash
npm run db:setup
```

5. Suba a aplicacao:

```bash
npm run dev
```

6. Acesse `http://localhost:3000`.

## Credenciais de Seed

O seed cria usuarios padrao:

- `admin@hiperfarma.com.br`
- `sdr@hiperfarma.com.br`
- `consultor@hiperfarma.com.br`

Senha:

- Usa `SEED_DEFAULT_PASSWORD` quando definido.
- Em desenvolvimento (`NODE_ENV != production`), cai para `admin123` se a variavel nao existir.
- Em producao, `SEED_DEFAULT_PASSWORD` e obrigatoria (minimo de 12 caracteres).

## Scripts Principais

- `npm run dev`: servidor local
- `npm run build`: build de producao
- `npm run start`: sobe app em modo producao
- `npm run db:migrate`: aplica migrations (`prisma migrate deploy`)
- `npm run db:seed`: executa seed
- `npm run db:setup`: migrate + seed
- `npm run lint`: lint
- `npm run test`: suite principal (unit + integracao focada)
- `npm run test:roles`: testes de autorizacao por papel
- `npm run test:teams`: testes de integracao Teams
- `npm run test:e2e`: testes E2E Playwright
- `npm run test:critical`: gate critico para release
- `npm run release:check`: lint + typecheck + testes criticos + status de migration
- `npm run release:check:full`: inclui E2E no gate

## Health Check

Endpoint: `GET /api/health`

Comportamento:

- `status: "ok"`: banco e redis saudaveis
- `status: "degraded"`: servico opcional degradado (ex.: `REDIS_URL` ausente)
- `status: "down"` (HTTP 503): dependencia critica indisponivel

## Deploy

Deploy alvo em Coolify com Docker Compose e servicos:

- `postgres`
- `redis`
- `migrate` (job one-shot para migration + seed)
- `app`

Documentacao detalhada:

- `DEPLOY.md`
- `RELEASE_CHECKLIST.md`
- `coolify.yaml`

## Variaveis de Ambiente

Use `.env.example` como referencia unica de variaveis obrigatorias e opcionais.

Observacoes:

- Nao versione `.env` real com secrets.
- Em producao, configure secrets no painel do provedor (Coolify).
- Para integracao Teams, preencha `MS_TEAMS_*` e `TEAMS_SYNC_CRON_TOKEN`.

## Estrutura do Projeto

- `src/app`: paginas, layouts e rotas API
- `src/lib`: regras de negocio, auth, validacao, permissao e integracoes
- `src/components`: componentes de interface
- `prisma`: schema, migrations e seed
- `e2e`: testes Playwright
- `scripts`: utilitarios e rotinas auxiliares

## Fluxo de Release Recomendado

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run test:critical`
4. `npm run test:e2e` (quando aplicavel)
5. `npx prisma migrate status`

Ou execute tudo com:

```bash
npm run release:check:full
```
