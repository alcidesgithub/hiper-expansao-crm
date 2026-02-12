# Deployment Guide - HiperFarma CRM (Coolify + Docker Compose)

Este projeto esta preparado para deploy em producao no Coolify com PostgreSQL + Redis + job automatico de migration/seed.

## Arquitetura

O arquivo `coolify.yaml` sobe os servicos abaixo:

- `postgres`: banco PostgreSQL com volume persistente.
- `redis`: cache com volume persistente.
- `migrate`: job one-shot que executa `prisma migrate deploy` e `prisma db seed`.
- `app`: Next.js (inicia somente depois do `migrate` finalizar com sucesso).

## Fluxo de deploy

1. Coolify faz clone e build das imagens.
2. `postgres` e `redis` sobem e passam nos healthchecks.
3. `migrate` roda migrations e seed.
4. `app` sobe apenas apos `migrate` concluir com sucesso.

Esse fluxo e idempotente desde que o seed continue usando `upsert` (como ja esta no projeto).

## Coolify (passo a passo)

1. Crie um recurso apontando para este repositorio.
2. Selecione **Build Pack: Docker Compose**.
3. Defina **Compose file path** como `/coolify.yaml`.
4. Configure os secrets/variaveis no painel.
5. Execute o deploy.

## Variaveis recomendadas (production)

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<senha-forte>
POSTGRES_DB=hiperfarma_crm
DATABASE_URL=postgresql://postgres:<senha-forte>@postgres:5432/hiperfarma_crm?schema=public
REDIS_URL=redis://redis:6379

AUTH_SECRET=<segredo-forte>
NEXTAUTH_SECRET=<segredo-forte>
NEXTAUTH_URL=https://crm.seudominio.com
NEXT_PUBLIC_APP_URL=https://crm.seudominio.com
AUTH_TRUST_HOST=true

RESEND_API_KEY=<chave-resend>
RESEND_FROM_EMAIL=naoresponda@seudominio.com

MS_TEAMS_CLIENT_ID=
MS_TEAMS_CLIENT_SECRET=
MS_TEAMS_TENANT_ID=
MS_TEAMS_GRAPH_SCOPE=https://graph.microsoft.com/.default
```

Notas:
- Em deploy com o `coolify.yaml`, o host do banco e `postgres` (nao use `localhost` em `DATABASE_URL`).
- `NODE_ENV` e `UPLOAD_DIR` ja sao definidos pelo compose para o servico `app`.
- Guarde secrets apenas no painel do Coolify (nao versione `.env` real no git).

## Execucao local com Compose

```bash
docker compose -f coolify.yaml up --build
```

Para rerodar somente migration/seed localmente:

```bash
docker compose -f coolify.yaml run --rm migrate
```

## Validacao pos-deploy

1. Verifique os logs do servico `migrate` (deve finalizar com sucesso).
2. Verifique os logs do servico `app` (startup sem erros).
3. Acesse `/login` e valide autenticacao.
4. Teste envio de email transacional (Resend), se habilitado.

## Comandos uteis

- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:setup`
