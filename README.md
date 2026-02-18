# HiperFarma CRM

Sistema de captacao, qualificacao e operacao comercial para o processo de expansao da rede Hiperfarma.

## Visao Geral

Este repositorio concentra:

- **Funnel de Expansao**: Publico (`/funnel/*`) com gate de perfil, score de lead e automacao de estagios.
- **CRM Interno**: Dashboard administrativo (`/dashboard/*`) para acompanhamento de leads, agenda e operacao.
- **Autenticacao & RBAC**: Controle de acesso granular (Admin, Consultor) via NextAuth.
- **Agendamento**: Gestao de reunioes e integracao com Microsoft Teams.
- **Infraestrutura**: Pipeline de deploy com migracao + seed automatizados (Docker/Coolify).

## Stack

- **Framework**: Next.js 16.1 (App Router) + React 19
- **Linguagem**: TypeScript 5
- **Banco de Dados**: PostgreSQL + Prisma ORM 6
- **Cache/Fila**: Redis (IoRedis)
- **Auth**: NextAuth (Auth.js v5 beta)
- **Testes**: Playwright (E2E) + Node Test Runner (`tsx --test`)
- **Estilizacao**: Tailwind CSS 4 + Shadcn/ui

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL disponivel na `DATABASE_URL`
- Redis disponivel na `REDIS_URL` (obrigatorio em producao)

## Setup Local

1. Copie o arquivo de ambiente de desenvolvimento:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Ou use os scripts:

```bash
npm run env:dev
```

Templates disponiveis:

- `.env.example`: desenvolvimento/local
- `.env.production.example`: producao/Coolify

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

O seed cria usuarios padrao para o ambiente de desenvolvimento/teste:

- `admin@hiperfarma.com.br` (Perfil: Admin)
- `consultor@hiperfarma.com.br` (Perfil: Consultor)

**Senha:**

- Usa `SEED_DEFAULT_PASSWORD` quando definido no `.env`.
- Em desenvolvimento (`NODE_ENV != production`), o fallback e `admin12345678` se a variavel nao existir.
- Em producao, `SEED_DEFAULT_PASSWORD` e obrigatoria (minimo de 12 caracteres).

## Scripts Principais

- `npm run dev`: Inicia servidor de desenvolvimento
- `npm run build`: Build de producao
- `npm run start`: Inicia servidor de producao
- `npm run db:setup`: Reset, migrate e seed do banco de dados
- `npm run db:migrate`: Aplica migrations pendentes
- `npm run db:seed`: Executa o script de seed
- `npm run env:dev`: Copia `.env.example` para `.env` (falha se `.env` existir)
- `npm run env:prod`: Copia `.env.production.example` para `.env` (falha se `.env` existir)
- `npm run env:dev:force`: Sobrescreve `.env` com `.env.example`
- `npm run env:prod:force`: Sobrescreve `.env` com `.env.production.example`
- `npm run lint`: Verifica padroes de codigo (ESLint)
- `npm run test`: Executa suite principal de testes (unitarios + integracao)
- `npm run test:roles`: Executa testes de autorizacao e permissoes (RBAC)
- `npm run test:teams`: Executa testes de integracao com MS Teams
- `npm run test:e2e`: Executa testes E2E (headless)
- `npm run test:e2e:ui`: Executa testes E2E com interface grafica interativa
- `npm run test:critical`: Suite rapida para verificação critica antes de commits
- `npm run release:check`: Check completo para release (lint + types + testes criticos + migrations)
- `npm run release:check:full`: `release:check` + testes E2E

## Health Check

Endpoint: `GET /api/health`

Comportamento:
- `status: "ok"`: Banco e Redis saudaveis
- `status: "degraded"`: Configuracao invalida/ambiente incompleto (ex.: `REDIS_URL` ausente)
- `status: "down"` (HTTP 503): Dependencia critica indisponivel
- Sem `Authorization: Bearer <HEALTHCHECK_TOKEN>`, o endpoint retorna apenas status resumido.
- Com token valido (ou em ambiente nao-producao sem token configurado), retorna detalhes de servicos.

Observacao: em producao, Redis deve ser tratado como dependencia obrigatoria para rate limit distribuido.

## Deploy

O projeto conta com configuracao para deploy via Docker Compose (ex: Coolify/Portainer).
Servicos inclusos:
- `postgres`
- `redis`
- `migrate` (Job efemero para migration + seed)
- `app`

Consulte `DEPLOY.md` e `coolify.yaml` para mais detalhes.

## Estrutura do Projeto

- `src/app`: Paginas, layouts e rotas API (App Router)
- `src/lib`: Nucleo da logica (regras de negocio, auth, validacoes)
- `src/components`: Componentes React reutilizaveis (UI)
- `src/services`: Servicos de integracao e logica complexa
- `src/types`: Definicoes de tipos TypeScript globais/compartilhados
- `prisma`: Schema do banco de dados, migrations e seed
- `e2e`: Testes E2E com Playwright
- `scripts`: Utilitarios de manutencao e CI/CD

## Fluxo de Release Recomendado

Para garantir a estabilidade antes de subir alteracoes:

1. `npm run release:check` (Rapido)
2. `npm run release:check:full` (Completo, inclui E2E)
