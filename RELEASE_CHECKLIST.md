# Release Checklist - HiperFarma CRM

## 1) Pre-flight

- [ ] Variaveis obrigatorias configuradas em producao:
  - `DATABASE_URL`
  - `AUTH_SECRET` (canonico)
  - `NEXTAUTH_SECRET` (mesmo valor durante transicao)
  - `NEXTAUTH_URL`
  - `REDIS_URL`
  - `MS_TEAMS_CLIENT_ID`
  - `MS_TEAMS_CLIENT_SECRET`
  - `MS_TEAMS_TENANT_ID`
  - `MS_TEAMS_WEBHOOK_URL`
  - `MS_TEAMS_WEBHOOK_CLIENT_STATE`
  - `TEAMS_SYNC_CRON_TOKEN`
- [ ] Volumes persistentes ativos: Postgres, Redis, Uploads.
- [ ] `coolify.yaml` apontando para build `runner` e job `migrate`.

## 2) Quality Gates

- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run test:critical`
- [ ] `npm run test:e2e`
- [ ] `npx prisma migrate status` (esperado: up to date)

Opcional (gate unico):

- [ ] `npm run release:check:full`

## 3) Infra and Ops Validation

- [ ] Deploy concluido sem erro no servico `migrate`.
- [ ] `GET /api/health` responde `ok` ou `degraded` (nunca `down`).
- [ ] Endpoint de webhook Teams validado (`GET` com `validationToken`).
- [ ] Renovacao automatica de subscriptions ativa:
  - Scheduled job chamando `POST /api/integrations/teams/subscriptions/sync` com bearer token.

## 4) CRM/Funnel Smoke

- [ ] Fluxo publico:
  - `/funnel/gate` -> escolha decisor -> `/funnel?gate=decisor`
  - `/funnel/resultado` grade A/B -> `/funnel/calendar`
  - agendamento concluido com reuniao criada.
- [ ] CRM interno:
  - usuario sem permissao recebe 403/401 nos endpoints protegidos;
  - lead fora de escopo retorna 404/403 conforme regra atual;
  - payloads nao vazam campos sensiveis para roles restritas.

## 5) Post-release

- [ ] Revisar logs de erro 15-30 minutos apos deploy.
- [ ] Confirmar eventos de auditoria para:
  - `GATE_SELECT`
  - `TEAMS_SYNC`
  - `CRON_SYNC`
- [ ] Registrar versao publicada e data/hora do release.
