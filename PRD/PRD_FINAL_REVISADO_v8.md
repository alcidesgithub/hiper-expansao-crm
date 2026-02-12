# PRD - Sistema de Funil Digital de Expansão Hiperfarma
## Product Requirements Document v8.0

**Data:** 12 de Fevereiro de 2026  
**Projeto:** Estruturação do Funil Digital de Expansão  
**Autor:** Alcides Cursino | Analista de Marketing  
**Stack:** Next.js 15 | Prisma | PostgreSQL | TypeScript 5

---

## 📋 Sumário Executivo

Este PRD detalha a implementação técnica do **Projeto Estratégico de Estruturação do Funil Digital de Expansão** apresentado à diretoria da Rede Hiperfarma. O sistema visa criar um processo **previsível, escalável e mensurável** para atrair e converter farmácias independentes em associados, com **qualificação ultra-robusta** e **agendamento automático de reuniões**.

**Diferenciais da v8.0:**
- ✅ Sistema de qualificação com **87%+ de precisão**
- ✅ **Agendamento self-service nativo** após qualificação
- ✅ **Integração com Microsoft Teams** para videoconferências
- ✅ **Sistema de calendário interno** com slots customizáveis
- ✅ **CRUD de mensalidades** dinâmico — formulário sempre usa valores vigentes
- ✅ Qualificação financeira baseada em **capacidade de pagar as mensalidades**
- ✅ Hospedagem em **VPS via Coolify** (auto-hospedado)
- ✅ Storage **local** (sem AWS)
- ✅ Stack **moderna e atualizada** (Next.js 15, React 19)
- ✅ Eliminação automática de **40%** dos leads sem fit
- ✅ **Controle de acesso por role** com escopo de leads por hierarquia

---

## 🎯 1. Contexto e Justificativa

### 1.1 Cenário Atual

**🔴 O Problema:**
O mercado farmacêutico vive alta competitividade, com expansão acelerada de grandes redes, pressão sobre margens e elevação de custos operacionais para PMEs.

**🟡 A Força Hiperfarma:**
Modelo associativista que possibilita crescimento estruturado sem perda de autonomia. Fortalece o empreendedor local via cooperação, escala e boas práticas.

### 1.2 A Necessidade

Estruturar o setor de expansão como um processo **previsível, escalável e mensurável** para:

✅ Reduzir dependência de ações pontuais  
✅ Aumentar eficiência comercial  
✅ Garantir alinhamento com DNA da rede  
✅ Eliminar desperdício de tempo com leads sem capacidade financeira  
✅ Permitir agendamento automático após qualificação  
✅ Preservar o SDR como responsável pela apresentação de valor na reunião

---

## 🎯 2. Objetivos do Projeto

### Objetivos Primários

1. **🎯 Atrair farmácias com perfil alinhado**
   - Segmentação de leads por perfil ideal
   - Redução de desperdício com leads não qualificados
   - **Meta:** Taxa de aprovação de 60%+ (40% descartados no gate)

2. **⚡ Qualificar leads antes do contato**
   - Filtragem automática por perfil
   - Lead scoring inteligente com 87%+ de precisão
   - Priorização interna por score e capacidade financeira
   - **Meta:** 87% de acurácia na qualificação

3. **💰 Validar capacidade de pagar as mensalidades**
   - Mensalidades (marketing + administrativa) gerenciadas via CRUD interno
   - Formulário busca dinamicamente os valores vigentes cadastrados
   - Lead responde perguntas de capacidade com os valores reais exibidos
   - Eliminação automática de leads financeiramente inaptos
   - **Meta:** menos de 5% de leads inaptos chegando ao SDR
   - **Modelo:** rede associativista — sem taxa de adesão, sem cálculo de ROI

4. **📅 Permitir agendamento self-service nativo**
   - Sistema de calendário interno com slots customizáveis
   - Lead qualificado escolhe dia/hora disponível
   - Criação automática de reunião no Microsoft Teams
   - Confirmação automática por email ao lead e ao consultor
   - **Meta:** 80% dos leads Grade A/B agendam reunião

5. **⚙️ Padronizar o processo de expansão**
   - Pipeline visual e padronizado
   - Etapas claras e mensuráveis

6. **⏱️ Reduzir tempo de decisão e retrabalho**
   - Automação de tarefas repetitivas
   - **Meta:** Redução de 60% no tempo desperdiçado

7. **📊 Gerar indicadores claros para diretoria**
   - Dashboards executivos em tempo real
   - ROI de campanhas e análise de capacidade financeira dos leads por grade

8. **📈 Garantir crescimento sustentável**
   - Processo escalável
   - Previsibilidade de resultados

### Metas Quantitativas (12 meses)

| Métrica | Meta Atual | Meta v8.0 |
|---------|------------|-----------|
| Taxa conversão landing | >3% | >5% |
| Leads qualificados (Grade A+B) | >60% | >65% |
| Precisão da qualificação | ~70% | >87% |
| **Reuniões agendadas auto** | 0% | >80% |
| Conversão em associados | >15% | >20% |
| CAC | Redução 30% | Redução 45% |
| Tempo médio decisão | <45 dias | <35 dias |
| Leads inaptos ao SDR | ~25% | <5% |

---

## 🔍 3. Visão Geral da Solução

### Funil Digital Estruturado em 7 Etapas

```
┌─────────────────┐
│  PRÉ-QUALIFICAÇÃO│ → Gate: Elimina 40% (sem poder decisão)
├─────────────────┤
│    AQUISIÇÃO    │ → Atração de potenciais associados
├─────────────────┤
│  QUALIFICAÇÃO   │ → Filtragem automática + validação de capacidade financeira
├─────────────────┤
│  AGENDAMENTO    │ → Lead escolhe dia/hora (sistema nativo + Teams) ⭐
├─────────────────┤
│   DIAGNÓSTICO   │ → SDR apresenta benefícios e diferenciais na reunião
├─────────────────┤
│   FECHAMENTO    │ → Decisão consciente e alinhada
├─────────────────┤
│     GESTÃO      │ → Acompanhamento e análise
└─────────────────┘
```

**Plataforma Única:** Controle de dados, histórico, agendamento nativo, integração Teams, visão gerencial e gestão de mensalidades centralizados.

---

## 🏗️ 4. Arquitetura da Solução

### 4.1 Infraestrutura Técnica

| Componente | Tecnologia | Versão | Função |
|------------|-----------|--------|---------|
| **Hospedagem** | VPS via Coolify | Latest | Auto-hospedagem com deploy automático |
| **Framework** | Next.js | 15.1.0 | App Router, Server Components, Actions |
| **Runtime** | Node.js | 22 LTS | Ambiente de execução |
| **Banco de Dados** | PostgreSQL | 17.x | Dados relacionais |
| **ORM** | Prisma | 6.x | Query builder type-safe |
| **Storage** | Local (VPS) | - | Upload de arquivos local |
| **Cache** | Redis | 7.x | Cache e sessões |
| **UI Framework** | React | 19.x | Biblioteca de componentes |
| **Estilização** | Tailwind CSS | 4.x | Utility-first CSS |
| **Componentes** | shadcn/ui | Latest | Componentes reutilizáveis |
| **Formulários** | React Hook Form | 7.x | Gerenciamento de forms |
| **Validação** | Zod | 3.x | Schema validation |
| **State** | Zustand | 5.x | Estado global |
| **Data Fetching** | TanStack Query | 5.x | Server state management |
| **Email** | Resend | Latest | Envio de emails transacionais |
| **Videoconferência** | Microsoft Teams | Graph API | Criação automática de reuniões online |

### 4.2 Coolify - Deploy e Gerenciamento

**Estratégia de Deploy:**
- Next.js App via Dockerfile (build otimizado standalone)
- PostgreSQL e Redis como recursos separados no Coolify
- Variáveis de ambiente gerenciadas pelo Coolify
- Volumes persistentes para uploads

**Configuração no Coolify:**

1. **Aplicação Next.js:**
   - Build Pack: `Dockerfile`
   - Ports Exposes: `3000`
   - Base Directory: `/` (raiz do projeto)
   - Dockerfile: `/Dockerfile` (arquivo na raiz)

2. **PostgreSQL:**
   - Adicionar como recurso separado (PostgreSQL 17)
   - Configurar credenciais via variáveis de ambiente
   - Volume persistente automático

3. **Redis:**
   - Adicionar como recurso separado (Redis 7)
   - Volume persistente automático

**Dockerfile (Next.js Standalone):**

Criar arquivo `Dockerfile` na raiz do projeto com o conteúdo oficial do Next.js:

```dockerfile
# syntax=docker.io/docker/dockerfile:1
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create uploads directory with correct permissions
RUN mkdir -p /app/uploads
RUN chown -R nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

**next.config.js - Habilitar Standalone Output:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Outras configurações...
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  }
}

module.exports = nextConfig
```

**.dockerignore:**

```
# dependencies
node_modules
.pnp
.pnp.js

# testing
coverage

# next.js
.next/
out/

# production
build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# git
.git
.gitignore

# IDE
.vscode
.idea

# uploads (são montados via volume)
uploads/
```

### 4.3 Storage Local

**Estrutura de Diretórios:**

```
/app/uploads/
├── leads/
│   ├── documents/
│   └── avatars/
├── users/
│   └── avatars/
└── temp/
```

**Configuração de Volume Persistente no Coolify:**

1. Na aplicação Next.js, adicionar **Persistent Storage**:
   - Source Path: `/app/uploads` (dentro do container)
   - Destination Path: `/var/lib/coolify/uploads/hiperfarma-crm` (no host)
   - Isso garante que os uploads persistem entre deploys

2. Permissões:
   - O Dockerfile já configura o diretório com as permissões corretas para o usuário `nextjs`
   - Não é necessário configuração adicional

**Backup Automático:**

Configurar backup periódico do diretório de uploads via cron no host:

```bash
# Adicionar ao crontab do servidor
0 2 * * * tar -czf /backups/uploads-$(date +\%Y\%m\%d).tar.gz /var/lib/coolify/uploads/hiperfarma-crm
```

---

## 🎯 5. Sistema de Qualificação Ultra-Robusto

### 5.1 Fluxo Completo

```
1. Lead chega → Landing Page
2. Gate: "Você é decisor?"
   ├─ NÃO → Redireciona (40% descartados)
   └─ SIM → Formulário 5 etapas
3. Etapas 1-4: perfil, desafios, urgência
4. Etapa 5: exibe mensalidades vigentes (buscadas dinamicamente)
           → lead responde perguntas de capacidade de pagamento
5. Classifica A-F
6. SE Grade A ou B:
   ├─ Mostra tela de aprovação
   ├─ Convida para agendamento self-service ⭐
   ├─ Lead escolhe dia/hora no calendário nativo
   ├─ Sistema cria reunião no Microsoft Teams
   ├─ Envia confirmação por email com link do Teams
   └─ Notifica SDR/Consultor com dados de qualificação
7. SENÃO:
   └─ Envia para nurturing
```

### 5.2 CRUD de Mensalidades

> **Modelo de negócio:** A Hiperfarma é uma rede associativista. O investimento do associado consiste em mensalidades recorrentes — mensalidade de marketing e mensalidade administrativa. Não há taxa de adesão nem cálculo de ROI.

O ADMIN gerencia tabelas de mensalidades via painel interno. O formulário exibe sempre os valores da tabela **ativa no momento do acesso** — ao atualizar a tabela, o próximo lead já vê os novos valores, sem alteração de código.

**Telas do CRUD (acesso: ADMIN only):**

```
┌──────────────────────────────────────────────────┐
│  GERENCIAR MENSALIDADES                          │
├──────────────────────────────────────────────────┤
│                                                  │
│  📊 Tabela Ativa                                 │
│  ┌──────────────────────────────────────────┐   │
│  │ Tabela 2026                              │   │
│  │ Vigência: 01/01/2026                     │   │
│  │                                          │   │
│  │ Marketing:   R$ 2.500,00/mês             │   │
│  │ Admin:       R$ 1.800,00/mês             │   │
│  │ Total:       R$ 4.300,00/mês             │   │
│  │                                          │   │
│  │ [Desativar] [Editar]                     │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  [+ Nova Tabela de Mensalidades]                │
│                                                  │
│  📚 Histórico                                    │
│  └─ Tabela 2025 (arquivada em 31/12/2025)       │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Formulário de criação/edição:**

```typescript
interface AssociationPricingForm {
  name: string                    // "Tabela 2026"
  effectiveDate: Date             // data de início
  
  marketingMonthly: number        // R$ 2.500
  marketingDescription: string    // "Mensalidade de Marketing"
  marketingBullets: string[]      // ["Assessoria de marketing", "Campanhas digitais", ...]
  
  adminMonthly: number            // R$ 1.800
  adminDescription: string        // "Mensalidade Administrativa"
  adminBullets: string[]          // ["Suporte jurídico", "Consultoria financeira", ...]
}
```

**Endpoint público:**

```typescript
// GET /api/pricing/active
// Retorna APENAS campos necessários para o formulário
{
  id: string
  name: string
  effectiveDate: string
  marketingMonthly: number
  marketingDescription: string
  marketingBullets: string[]
  adminMonthly: number
  adminDescription: string
  adminBullets: string[]
  totalMonthly: number
}
```

### 5.3 Etapa 5 do Formulário — Capacidade Financeira

O lead vê os valores reais das mensalidades e responde perguntas sobre sua capacidade de pagamento:

```
┌────────────────────────────────────────────────┐
│  ETAPA 5: Investimento Necessário              │
├────────────────────────────────────────────────┤
│                                                │
│  Como associado Hiperfarma, você terá dois     │
│  investimentos mensais recorrentes:            │
│                                                │
│  💰 Mensalidade de Marketing                   │
│     R$ 2.500,00/mês                            │
│     • Assessoria de marketing especializada    │
│     • Campanhas digitais coordenadas           │
│     • Material promocional personalizado       │
│                                                │
│  💰 Mensalidade Administrativa                 │
│     R$ 1.800,00/mês                            │
│     • Suporte jurídico e contábil             │
│     • Consultoria financeira e gestão          │
│     • Acesso a sistemas e tecnologia           │
│                                                │
│  📊 Total: R$ 4.300,00/mês                     │
│                                                │
│  ────────────────────────────────────────────  │
│                                                │
│  Sua farmácia consegue arcar com a             │
│  mensalidade de marketing (R$ 2.500/mês)?     │
│                                                │
│  ○ Sim, tranquilamente                         │
│  ○ Sim, com planejamento                       │
│  ○ Seria apertado                              │
│  ○ Não consigo no momento                      │
│                                                │
│  Sua farmácia consegue arcar com a             │
│  mensalidade administrativa (R$ 1.800/mês)?   │
│                                                │
│  ○ Sim, tranquilamente                         │
│  ○ Sim, com planejamento                       │
│  ○ Seria apertado                              │
│  ○ Não consigo no momento                      │
│                                                │
│  [⬅ Voltar]  [Finalizar →]                    │
│                                                │
└────────────────────────────────────────────────┘
```

**Lógica de classificação de capacidade:**

```typescript
type CapacityAnswer = 'COMFORTABLE' | 'POSSIBLE' | 'LIMITED' | 'INSUFFICIENT'

function calculateFinancialCapacity(
  marketingCapacity: CapacityAnswer,
  adminCapacity: CapacityAnswer
): FinancialCapacity {
  // Se NÃO CONSEGUE arcar com qualquer uma → ELIMINADO
  if (marketingCapacity === 'INSUFFICIENT' || adminCapacity === 'INSUFFICIENT') {
    return 'INSUFFICIENT'
  }
  
  // Se APERTADO em qualquer uma → LIMITADO
  if (marketingCapacity === 'LIMITED' || adminCapacity === 'LIMITED') {
    return 'LIMITED'
  }
  
  // Se ambas TRANQUILAMENTE → CONFORTÁVEL
  if (marketingCapacity === 'COMFORTABLE' && adminCapacity === 'COMFORTABLE') {
    return 'COMFORTABLE'
  }
  
  // Demais casos (planejamento necessário) → POSSÍVEL
  return 'POSSIBLE'
}
```

**Regra eliminatória:**

```typescript
// Lead com capacidade INSUFFICIENT não pode prosseguir
if (financialCapacity === 'INSUFFICIENT') {
  grade = 'F'
  status = 'ARCHIVED'
  // Tela de agradecimento genérica, sem agendamento
}
```

---

## 📅 6. Sistema de Agendamento Nativo com Microsoft Teams

### 6.1 Visão Geral

O sistema possui um **calendário nativo** onde consultores/SDRs configuram sua disponibilidade através de **slots de horários**. Leads qualificados (Grade A/B) podem escolher dia e horário disponível de forma self-service. Ao confirmar, o sistema:

1. Cria o agendamento no banco de dados
2. Gera reunião online via **Microsoft Teams** (Graph API)
3. Envia emails de confirmação com link do Teams
4. Notifica o consultor

### 6.2 Configuração de Disponibilidade (Consultores/SDRs)

**Interface interna para gerenciar slots:**

```
┌──────────────────────────────────────────────────┐
│  MINHA DISPONIBILIDADE                           │
├──────────────────────────────────────────────────┤
│                                                  │
│  📅 Configurar Horários Disponíveis              │
│                                                  │
│  Segunda a Sexta                                 │
│  ┌────────────────────────────────────────┐     │
│  │ Manhã:  09:00 - 12:00  [Ativo ✓]      │     │
│  │ Tarde:  14:00 - 18:00  [Ativo ✓]      │     │
│  └────────────────────────────────────────┘     │
│                                                  │
│  Intervalo entre reuniões: 60 minutos           │
│  Duração padrão reunião: 60 minutos              │
│                                                  │
│  🚫 Bloqueios Específicos                        │
│  └─ 15/02/2026 - 14:00 às 16:00 (Reunião)       │
│  └─ 20/02/2026 - Todo o dia (Treinamento)       │
│                                                  │
│  [+ Adicionar Bloqueio]                          │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Schema no banco:**

```typescript
model AvailabilitySlot {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  dayOfWeek   Int      // 0=domingo, 1=segunda, ... 6=sábado
  startTime   String   // "09:00"
  endTime     String   // "12:00"
  isActive    Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([userId, dayOfWeek])
}

model AvailabilityBlock {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  startDate   DateTime
  endDate     DateTime
  reason      String?
  
  createdAt   DateTime @default(now())
  
  @@index([userId, startDate])
}
```

### 6.3 Interface de Agendamento (Lead)

**Tela após qualificação aprovada (Grade A/B):**

```
┌──────────────────────────────────────────────────┐
│  🎉 PARABÉNS!                                    │
│                                                  │
│  Seu perfil é exatamente o tipo de parceiro     │
│  que a Hiperfarma busca.                         │
│                                                  │
│  📅 AGENDE SUA REUNIÃO                           │
│                                                  │
│  Escolha o melhor dia e horário:                 │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │  Fevereiro 2026                        │     │
│  │  ─────────────────────────────────     │     │
│  │  DOM SEG TER QUA QUI SEX SAB          │     │
│  │       12  13  14  15  16  17          │     │
│  │       19  20  21  22  23  24          │     │
│  │       ●   ●       ●   ●               │     │
│  │  (● = dias com horários disponíveis)  │     │
│  └────────────────────────────────────────┘     │
│                                                  │
│  Dia selecionado: Quinta, 15/02/2026             │
│                                                  │
│  Horários disponíveis:                           │
│  ○ 09:00 - 10:00                                 │
│  ○ 10:00 - 11:00                                 │
│  ○ 14:00 - 15:00                                 │
│  ● 15:00 - 16:00  ← selecionado                  │
│  ○ 16:00 - 17:00                                 │
│                                                  │
│  Consultor: João Silva                           │
│  Formato: Reunião online (Microsoft Teams)       │
│                                                  │
│  [Confirmar Agendamento]                         │
│  [Pular por enquanto]                            │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 6.4 Integração com Microsoft Teams

**Setup da integração:**

1. Criar app no Azure AD (Microsoft Entra)
2. Configurar permissões necessárias:
   - `OnlineMeetings.ReadWrite`
   - `Calendars.ReadWrite`
3. Obter credenciais (Tenant ID, Client ID, Client Secret)

**Fluxo de criação de reunião:**

```typescript
import { Client } from '@microsoft/microsoft-graph-client'

async function createTeamsMeeting(params: {
  leadName: string
  leadEmail: string
  consultantEmail: string
  startTime: DateTime
  duration: number // minutos
}) {
  const client = Client.init({
    authProvider: async (done) => {
      const token = await getTeamsAccessToken()
      done(null, token)
    }
  })

  // Criar evento no calendário do consultor
  const event = await client.api(`/users/${params.consultantEmail}/events`).post({
    subject: `Reunião Hiperfarma - ${params.leadName}`,
    start: {
      dateTime: params.startTime.toISO(),
      timeZone: 'America/Sao_Paulo'
    },
    end: {
      dateTime: params.startTime.plus({ minutes: params.duration }).toISO(),
      timeZone: 'America/Sao_Paulo'
    },
    attendees: [
      {
        emailAddress: {
          address: params.leadEmail,
          name: params.leadName
        },
        type: 'required'
      }
    ],
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness'
  })

  return {
    eventId: event.id,
    teamsJoinUrl: event.onlineMeeting.joinUrl,
    teamsConferenceId: event.onlineMeeting.conferenceId
  }
}
```

**Atualização do schema Meeting:**

```typescript
model Meeting {
  id       String @id @default(cuid())
  leadId   String
  lead     Lead   @relation(fields: [leadId], references: [id])
  userId   String
  user     User   @relation(fields: [userId], references: [id])

  title       String
  description String?
  startTime   DateTime
  endTime     DateTime
  location    String?
  status      MeetingStatus @default(SCHEDULED)

  // Microsoft Teams
  teamsEventId      String? @unique
  teamsJoinUrl      String?
  teamsConferenceId String?

  // Campos removidos (Google)
  // googleEventId  ❌
  // googleMeetLink ❌

  notes       String?
  nextSteps   String?
  outcome     String?

  selfScheduled Boolean @default(false)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  completedAt DateTime?
  cancelledAt DateTime?

  @@index([leadId])
  @@index([userId])
  @@index([startTime])
  @@index([status])
  @@index([teamsEventId])
}
```

### 6.5 Emails de Confirmação

**Email para o Lead:**

```
Assunto: Reunião Confirmada - Hiperfarma

Olá [Nome do Lead],

Sua reunião está confirmada! 🎉

📅 Data: Quinta-feira, 15 de Fevereiro de 2026
🕐 Horário: 15:00 - 16:00 (horário de Brasília)
👤 Consultor: João Silva
💻 Formato: Online via Microsoft Teams

[Entrar na Reunião do Teams]
(link do Teams)

Caso precise reagendar, acesse: [link para gerenciar]

Até breve!
Equipe Hiperfarma
```

**Email para o Consultor:**

```
Assunto: Nova Reunião Agendada - [Nome do Lead]

Nova reunião agendada via sistema:

📋 Lead: [Nome] - Grade A
📧 Email: [email]
📞 Telefone: [telefone]
📅 Data/Hora: 15/02/2026 às 15:00
💻 Teams: [link]

Informações de Qualificação:
• Score: 380 pontos
• Capacidade Financeira: Confortável
• Lojas: 3
• Faturamento: R$ 100-200k/mês
• Principais desafios: Negociação, Competição, Margens

[Ver Detalhes Completos no CRM]
```

### 6.6 API Endpoints

```typescript
// GET /api/availability/slots
// Retorna dias/horários disponíveis para agendamento
// Params: ?consultantId=xxx&startDate=2026-02-12&endDate=2026-03-12
Response: {
  slots: Array<{
    date: string        // "2026-02-15"
    times: string[]     // ["09:00", "10:00", "14:00", "15:00"]
  }>
}

// POST /api/meetings/schedule
// Cria agendamento (público, acessível pelo lead após qualificação)
Body: {
  leadId: string
  consultantId: string
  startTime: string      // ISO datetime
  duration: number       // minutos
}
Response: {
  meetingId: string
  teamsJoinUrl: string
  confirmation: {
    sentToLead: boolean
    sentToConsultant: boolean
  }
}

// GET /api/crm/availability (interno)
// Consultor gerencia sua disponibilidade
// POST /api/crm/availability/slots
// PUT /api/crm/availability/blocks
```

### 6.7 Regras de Negócio

```typescript
// Validações antes de criar agendamento
function validateScheduling(params) {
  // 1. Lead deve ser Grade A ou B
  if (!['A', 'B'].includes(lead.grade)) {
    throw new Error('Apenas leads Grade A/B podem agendar')
  }

  // 2. Horário deve estar disponível
  const isAvailable = await checkSlotAvailability(
    params.consultantId,
    params.startTime
  )
  if (!isAvailable) {
    throw new Error('Horário não disponível')
  }

  // 3. Não pode ter reunião já agendada para este lead
  const existingMeeting = await prisma.meeting.findFirst({
    where: {
      leadId: params.leadId,
      status: { in: ['SCHEDULED', 'CONFIRMED'] }
    }
  })
  if (existingMeeting) {
    throw new Error('Lead já possui reunião agendada')
  }

  // 4. Horário mínimo de antecedência (ex: 2 horas)
  const minAdvanceTime = DateTime.now().plus({ hours: 2 })
  if (DateTime.fromISO(params.startTime) < minAdvanceTime) {
    throw new Error('Agendamento deve ser feito com no mínimo 2 horas de antecedência')
  }

  return true
}
```

---

## 🎨 7. Interfaces e Fluxos de Usuário

### 7.1 Landing Page Pública

**Objetivo:** Capturar interesse e direcionar para qualificação

```
┌────────────────────────────────────────────────┐
│  [LOGO HIPERFARMA]    [Sobre] [Benefícios]     │
├────────────────────────────────────────────────┤
│                                                │
│   Transforme Sua Farmácia com o Poder          │
│   da Maior Rede Associativista do Sul          │
│                                                │
│   ✓ Poder de negociação                        │
│   ✓ Suporte completo                           │
│   ✓ Crescimento estruturado                    │
│                                                │
│   [QUERO FAZER PARTE →]                        │
│                                                │
│   Mais de 200 farmácias associadas             │
│   em PR, SC e SP                               │
│                                                │
└────────────────────────────────────────────────┘
```

### 7.2 Dashboard CRM Interno

**Visão por Role:**

```
┌──────────────────────────────────────────────────┐
│  ADMIN                                           │
│  ├─ Todos os leads                               │
│  ├─ Dashboard executivo                          │
│  ├─ Gerenciar usuários                           │
│  ├─ Gerenciar mensalidades                       │
│  └─ AuditLog                                     │
├──────────────────────────────────────────────────┤
│  DIRECTOR                                        │
│  ├─ Todos os leads (somente leitura)             │
│  ├─ Dashboard executivo                          │
│  └─ Visualizar mensalidades ativas               │
├──────────────────────────────────────────────────┤
│  MANAGER                                         │
│  ├─ Leads da equipe                              │
│  ├─ Dashboard operacional                        │
│  ├─ Atribuir leads na equipe                     │
│  └─ Visualizar mensalidades ativas               │
├──────────────────────────────────────────────────┤
│  SDR                                             │
│  ├─ Meus leads                                   │
│  ├─ Dashboard SDR                                │
│  ├─ Gerenciar reuniões                           │
│  └─ Configurar disponibilidade                   │
├──────────────────────────────────────────────────┤
│  CONSULTANT                                      │
│  ├─ Meus leads                                   │
│  ├─ Gerenciar reuniões                           │
│  └─ Configurar disponibilidade                   │
└──────────────────────────────────────────────────┘
```

---

## 📊 8. Dashboards e Métricas

### 8.1 Dashboard Executivo (ADMIN, DIRECTOR)

```
┌──────────────────────────────────────────────────────────┐
│  OVERVIEW - ÚLTIMOS 30 DIAS                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📊 LEADS                                                │
│  Total: 847      Novos: +127 (+18%)                     │
│  Grade A: 212    Grade B: 339    Grade C: 189           │
│                                                          │
│  📅 AGENDAMENTOS                                         │
│  Total: 423      Self-service: 341 (80.6%)              │
│  Taxa conversão A/B→Reunião: 83%                         │
│                                                          │
│  💰 CAPACIDADE FINANCEIRA                                │
│  Confortável: 65%    Possível: 21%    Limitado: 10%     │
│                                                          │
│  💵 CAC MÉDIO                                            │
│  R$ 3.847 (-23% vs mês anterior)                         │
│                                                          │
│  ⏱️ TEMPO MÉDIO ATÉ CONVERSÃO                            │
│  32 dias (-8 dias vs mês anterior)                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 8.2 Dashboard Operacional (ADMIN, DIRECTOR, MANAGER)

```
┌──────────────────────────────────────────────────────────┐
│  PIPELINE - TEMPO REAL                                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  NEW          CONTACTED    QUALIFIED    PROPOSAL         │
│  127 leads    89 leads     156 leads    67 leads         │
│    ↓            ↓            ↓            ↓              │
│   [→]         [→]          [→]          [→]              │
│                                                          │
│  NEGOTIATION  WON          LOST         ARCHIVED         │
│  34 leads     45 leads     23 leads     12 leads         │
│                                                          │
│  ────────────────────────────────────────────────────    │
│                                                          │
│  🎯 CONVERSÕES (MÊS)                                     │
│  Meta: 20 | Atual: 16 | Projeção: 22 ✓                  │
│                                                          │
│  📈 PRÓXIMAS AÇÕES                                       │
│  • 23 reuniões agendadas próximos 7 dias                 │
│  • 12 follow-ups atrasados                               │
│  • 45 leads sem atribuição                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 8.3 Dashboard SDR (ADMIN, MANAGER, SDR)

```
┌──────────────────────────────────────────────────────────┐
│  MEUS LEADS - João Silva (SDR)                           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📋 ATIVOS                                               │
│  Total: 23 leads                                         │
│  Grade A: 8    Grade B: 12    Grade C: 3                │
│                                                          │
│  📅 REUNIÕES                                             │
│  Hoje: 2    Amanhã: 1    Próximos 7 dias: 6             │
│                                                          │
│  ✅ TAREFAS                                              │
│  Pendentes: 12    Vencidas: 2    Hoje: 4                │
│                                                          │
│  🎯 METAS DO MÊS                                         │
│  Reuniões: 18/20    Conversões: 3/4                      │
│                                                          │
│  ────────────────────────────────────────────────────    │
│                                                          │
│  PRÓXIMAS REUNIÕES                                       │
│  ┌──────────────────────────────────────────┐           │
│  │ 15:00 - Farmácia São João (Grade A)      │           │
│  │ [Entrar no Teams] [Ver Detalhes]         │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🔧 9. Stack Técnico Detalhado

### 9.1 Estrutura de Pastas

```
hiperfarma-crm/
├── src/
│   ├── app/                      # Next.js 15 App Router
│   │   ├── (public)/
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── qualificacao/     # Formulário multi-etapa
│   │   │   │   ├── gate/
│   │   │   │   ├── etapa-1/
│   │   │   │   ├── etapa-2/
│   │   │   │   ├── etapa-3/
│   │   │   │   ├── etapa-4/
│   │   │   │   └── etapa-5/
│   │   │   └── agendamento/      # Calendário público
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── esqueci-senha/
│   │   ├── dashboard/            # CRM Interno
│   │   │   ├── leads/
│   │   │   ├── reunioes/
│   │   │   ├── disponibilidade/  # Gerenciar slots
│   │   │   ├── mensalidades/     # CRUD pricing (ADMIN)
│   │   │   ├── usuarios/
│   │   │   └── analytics/
│   │   ├── api/
│   │   │   ├── pricing/
│   │   │   │   └── active/       # Público
│   │   │   ├── availability/
│   │   │   │   └── slots/        # Público
│   │   │   ├── meetings/
│   │   │   │   └── schedule/     # Público (pós-qualificação)
│   │   │   └── crm/              # Interno (autenticado)
│   │   │       ├── leads/
│   │   │       ├── meetings/
│   │   │       ├── pricing/
│   │   │       └── availability/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                   # shadcn/ui
│   │   ├── forms/
│   │   ├── calendar/             # Componente de calendário nativo
│   │   ├── dashboards/
│   │   └── shared/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── permissions.ts        # Sistema de permissões
│   │   ├── lead-scope.ts         # Filtro de escopo
│   │   ├── lead-select.ts        # Select seguro
│   │   ├── teams.ts              # Microsoft Teams SDK
│   │   ├── email.ts              # Resend
│   │   └── utils.ts
│   ├── services/
│   │   ├── qualification.ts      # Algoritmo de scoring
│   │   ├── scheduling.ts         # Lógica de agendamento
│   │   └── teams-integration.ts  # Integração Teams
│   └── types/
│       └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
└── uploads/                      # Storage local
```

### 9.2 Microsoft Teams Integration

```typescript
// lib/teams.ts
import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'

let _client: Client | null = null

async function getAccessToken(): Promise<string> {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  })

  const response = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    }
  )

  const data = await response.json()
  return data.access_token
}

export function getTeamsClient(): Client {
  if (!_client) {
    _client = Client.init({
      authProvider: async (done) => {
        try {
          const token = await getAccessToken()
          done(null, token)
        } catch (error) {
          done(error as Error, null)
        }
      }
    })
  }
  return _client
}
```

### 9.3 Serviço de Agendamento

```typescript
// services/scheduling.ts
import { getTeamsClient } from '@/lib/teams'
import { sendEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { DateTime } from 'luxon'

export async function createMeeting(params: {
  leadId: string
  consultantId: string
  startTime: string
  duration: number
}) {
  // Validar disponibilidade
  const isAvailable = await checkAvailability(
    params.consultantId,
    params.startTime,
    params.duration
  )
  
  if (!isAvailable) {
    throw new Error('Horário não disponível')
  }

  // Buscar dados
  const lead = await prisma.lead.findUnique({
    where: { id: params.leadId },
    include: { assignedUser: true }
  })

  const consultant = await prisma.user.findUnique({
    where: { id: params.consultantId }
  })

  if (!lead || !consultant) {
    throw new Error('Lead ou consultor não encontrado')
  }

  // Criar evento no Teams
  const client = getTeamsClient()
  const startDT = DateTime.fromISO(params.startTime)
  const endDT = startDT.plus({ minutes: params.duration })

  const event = await client
    .api(`/users/${consultant.email}/events`)
    .post({
      subject: `Reunião Hiperfarma - ${lead.name}`,
      body: {
        contentType: 'HTML',
        content: `
          <h3>Informações do Lead</h3>
          <p><strong>Nome:</strong> ${lead.name}</p>
          <p><strong>Empresa:</strong> ${lead.company}</p>
          <p><strong>Email:</strong> ${lead.email}</p>
          <p><strong>Telefone:</strong> ${lead.phone}</p>
          <p><strong>Grade:</strong> ${lead.grade}</p>
        `
      },
      start: {
        dateTime: startDT.toISO(),
        timeZone: 'America/Sao_Paulo'
      },
      end: {
        dateTime: endDT.toISO(),
        timeZone: 'America/Sao_Paulo'
      },
      attendees: [
        {
          emailAddress: {
            address: lead.email,
            name: lead.name
          },
          type: 'required'
        }
      ],
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness'
    })

  // Salvar no banco
  const meeting = await prisma.meeting.create({
    data: {
      leadId: params.leadId,
      userId: params.consultantId,
      title: `Reunião Hiperfarma - ${lead.name}`,
      startTime: startDT.toJSDate(),
      endTime: endDT.toJSDate(),
      teamsEventId: event.id,
      teamsJoinUrl: event.onlineMeeting.joinUrl,
      teamsConferenceId: event.onlineMeeting.conferenceId,
      selfScheduled: true,
      status: 'SCHEDULED'
    }
  })

  // Enviar emails
  await sendEmail({
    to: lead.email,
    subject: 'Reunião Confirmada - Hiperfarma',
    template: 'meeting-confirmation-lead',
    data: {
      leadName: lead.name,
      consultantName: consultant.name,
      startTime: startDT.toFormat('dd/MM/yyyy HH:mm'),
      teamsJoinUrl: event.onlineMeeting.joinUrl
    }
  })

  await sendEmail({
    to: consultant.email,
    subject: `Nova Reunião Agendada - ${lead.name}`,
    template: 'meeting-notification-consultant',
    data: {
      leadName: lead.name,
      leadEmail: lead.email,
      leadPhone: lead.phone,
      leadGrade: lead.grade,
      startTime: startDT.toFormat('dd/MM/yyyy HH:mm'),
      teamsJoinUrl: event.onlineMeeting.joinUrl,
      crmLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/leads/${lead.id}`
    }
  })

  return meeting
}

async function checkAvailability(
  consultantId: string,
  startTime: string,
  duration: number
): Promise<boolean> {
  const startDT = DateTime.fromISO(startTime)
  const endDT = startDT.plus({ minutes: duration })
  const dayOfWeek = startDT.weekday % 7 // 0=domingo

  // Verificar se há slot configurado para esse dia/horário
  const slots = await prisma.availabilitySlot.findMany({
    where: {
      userId: consultantId,
      dayOfWeek,
      isActive: true
    }
  })

  const hasSlot = slots.some(slot => {
    const slotStart = DateTime.fromFormat(slot.startTime, 'HH:mm')
    const slotEnd = DateTime.fromFormat(slot.endTime, 'HH:mm')
    const meetingStart = DateTime.fromFormat(startDT.toFormat('HH:mm'), 'HH:mm')
    const meetingEnd = DateTime.fromFormat(endDT.toFormat('HH:mm'), 'HH:mm')
    
    return meetingStart >= slotStart && meetingEnd <= slotEnd
  })

  if (!hasSlot) return false

  // Verificar bloqueios específicos
  const blocks = await prisma.availabilityBlock.findMany({
    where: {
      userId: consultantId,
      startDate: { lte: endDT.toJSDate() },
      endDate: { gte: startDT.toJSDate() }
    }
  })

  if (blocks.length > 0) return false

  // Verificar conflito com reuniões existentes
  const existingMeetings = await prisma.meeting.findMany({
    where: {
      userId: consultantId,
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      OR: [
        {
          startTime: { lte: startDT.toJSDate() },
          endTime: { gt: startDT.toJSDate() }
        },
        {
          startTime: { lt: endDT.toJSDate() },
          endTime: { gte: endDT.toJSDate() }
        }
      ]
    }
  })

  return existingMeetings.length === 0
}
```

---

---

## 🚀 9.4 Setup Passo-a-Passo no Coolify

### Pré-requisitos
- VPS com Ubuntu 22.04+ ou 24.04
- Coolify instalado e configurado
- Domínio configurado (crm.hiperfarma.com.br)

### Passo 1: Criar PostgreSQL

1. No Coolify, ir em **Resources** → **+ Add Resource**
2. Selecionar **PostgreSQL**
3. Configurar:
   - Name: `hiperfarma-postgres`
   - Version: `17`
   - Database Name: `hiperfarma_crm`
   - Username: `hiperfarma_user`
   - Password: [gerar senha segura]
4. Clicar em **Deploy**
5. Anotar a **Connection String** gerada

### Passo 2: Criar Redis

1. No Coolify, ir em **Resources** → **+ Add Resource**
2. Selecionar **Redis**
3. Configurar:
   - Name: `hiperfarma-redis`
   - Version: `7-alpine`
4. Clicar em **Deploy**
5. Anotar a **Connection String** gerada

### Passo 3: Criar Aplicação Next.js

1. No Coolify, ir em **Projects** → **+ New Project**
2. Selecionar **Git Repository**
3. Conectar ao repositório (GitHub/GitLab/Bitbucket)
4. Configurar:
   - **Build Pack:** `Dockerfile`
   - **Ports Exposes:** `3000`
   - **Base Directory:** `/` (deixar vazio ou `/`)
   - **Dockerfile Location:** `Dockerfile`

### Passo 4: Configurar Domínio

1. Na aba **Domains** da aplicação
2. Adicionar domínio: `crm.hiperfarma.com.br`
3. Habilitar **SSL/TLS** (Let's Encrypt automático)
4. Aguardar certificado ser gerado

### Passo 5: Configurar Variáveis de Ambiente

Na aba **Environment Variables** da aplicação, adicionar:

```bash
# Database (usar Connection String do PostgreSQL criado)
DATABASE_URL=postgresql://hiperfarma_user:senha@hiperfarma-postgres:5432/hiperfarma_crm

# Redis (usar Connection String do Redis criado)
REDIS_URL=redis://hiperfarma-redis:6379

# Auth
NEXTAUTH_URL=https://crm.hiperfarma.com.br
NEXTAUTH_SECRET=[gerar com: openssl rand -base64 32]

# Microsoft Teams (obter do Azure AD)
MICROSOFT_TENANT_ID=seu-tenant-id
MICROSOFT_CLIENT_ID=seu-client-id
MICROSOFT_CLIENT_SECRET=seu-client-secret

# Email (obter do Resend)
RESEND_API_KEY=re_sua_api_key
RESEND_FROM_EMAIL=noreply@hiperfarma.com.br

# Storage
UPLOAD_DIR=/app/uploads

# General
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://crm.hiperfarma.com.br
```

### Passo 6: Configurar Volume Persistente

1. Na aba **Storages** da aplicação
2. Clicar em **+ Add Storage**
3. Configurar:
   - **Name:** `uploads`
   - **Mount Path:** `/app/uploads`
   - **Host Path:** (Coolify gerencia automaticamente)
4. Salvar

### Passo 7: Build e Deploy Inicial

1. Garantir que os arquivos estão no repositório:
   - `Dockerfile` (conforme seção 4.2)
   - `.dockerignore`
   - `next.config.js` com `output: 'standalone'`
   - `package.json` com script de build

2. Fazer push para o repositório

3. No Coolify, clicar em **Deploy**

4. Acompanhar logs de build em tempo real

### Passo 8: Executar Migrations do Prisma

Após o primeiro deploy bem-sucedido:

1. Na aplicação no Coolify, ir em **Terminal**
2. Executar:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

### Passo 9: Verificar Saúde da Aplicação

1. Acessar `https://crm.hiperfarma.com.br`
2. Verificar se a landing page carrega
3. Testar login com usuário criado no seed
4. Verificar conexão com PostgreSQL e Redis

### Passo 10: Configurar Webhooks (Opcional)

Para deploys automáticos:

1. Na aba **Webhooks** da aplicação
2. Copiar **Webhook URL**
3. Adicionar no GitHub/GitLab:
   - Settings → Webhooks
   - Payload URL: [colar URL do Coolify]
   - Content type: `application/json`
   - Events: `Push events`, `Pull request events`

### Troubleshooting

**Build falha com erro de memória:**
- Aumentar limite de memória do container de build
- No Coolify: Settings → Build → Build Memory Limit: `2048` MB

**Migrations não executam:**
- Conectar via terminal e executar manualmente
- Verificar se DATABASE_URL está correto

**Uploads não persistem:**
- Verificar se volume foi criado corretamente
- Checar permissões do diretório `/app/uploads`

**SSL não funciona:**
- Verificar se DNS está apontando corretamente para o servidor
- Aguardar propagação DNS (pode levar até 48h)
- Verificar logs do Coolify para erros do Let's Encrypt

---

## 🔐 10. Variáveis de Ambiente

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/hiperfarma_crm"

# Auth
NEXTAUTH_URL="https://crm.hiperfarma.com.br"
NEXTAUTH_SECRET="your-secret-key"

# Microsoft Teams / Graph API
MICROSOFT_TENANT_ID="your-tenant-id"
MICROSOFT_CLIENT_ID="your-client-id"
MICROSOFT_CLIENT_SECRET="your-client-secret"

# Email
RESEND_API_KEY="re_your_api_key"
RESEND_FROM_EMAIL="noreply@hiperfarma.com.br"

# Storage
UPLOAD_DIR="./uploads"

# General
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://crm.hiperfarma.com.br"
```

---

## 🔒 11. Segurança, Controle de Acesso e Performance

### 11.1 Níveis de Acesso por Role

O sistema possui cinco roles internos. Cada role tem escopo de leitura de leads e conjunto de ações distintos.

**Escopo de leitura de leads:**

| Role | Leads visíveis |
|------|---------------|
| ADMIN | Todos os leads do sistema |
| DIRECTOR | Todos os leads (somente leitura) |
| MANAGER | Leads da própria equipe (TeamMember) |
| SDR | Apenas leads atribuídos a si |
| CONSULTANT | Apenas leads atribuídos a si |

**Matriz de permissões por recurso:**

| Recurso | ADMIN | DIRECTOR | MANAGER | SDR | CONSULTANT |
|---------|:-----:|:--------:|:-------:|:---:|:----------:|
| Ver leads (todos) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver leads (equipe) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver leads (próprios) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editar leads | ✅ | ❌ | ✅* | ✅* | ✅* |
| Excluir leads | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver score / grade / qualifData | ✅ | ✅ | ✅* | ✅* | ✅* |
| Redistribuir / atribuir leads | ✅ | ❌ | ✅ | ❌ | ❌ |
| Avançar lead no pipeline | ✅ | ❌ | ✅ | ✅ | ❌ |
| Configurar pipeline e etapas | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver pricing ativo | ✅ | ✅ | ✅ | ❌ | ❌ |
| Configurar pricing | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dashboard executivo | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dashboard operacional | ✅ | ✅ | ✅ | ❌ | ❌ |
| Dashboard SDR | ✅ | ❌ | ✅ | ✅ | ❌ |
| Gerenciar usuários | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerenciar integrações | ✅ | ❌ | ❌ | ❌ | ❌ |
| AuditLog | ✅ | ❌ | ❌ | ❌ | ❌ |
| Notas e tarefas | ✅ | ❌ | ✅* | ✅* | ✅* |
| Agendar reuniões | ✅ | ❌ | ✅* | ✅* | ✅* |
| Gerenciar disponibilidade | ✅ | ❌ | ❌ | ✅ | ✅ |

*restrito ao escopo de leads permitido para o role

### 11.2 Implementação de Controle de Acesso

**Middleware de autenticação** — protege todas as rotas internas:

```typescript
// middleware.ts
export { auth as middleware } from '@/auth'
export const config = {
  matcher: ['/dashboard/:path*', '/api/crm/:path*']
}
```

**Sistema de permissões** — helper central (`lib/permissions.ts`):

```typescript
type Permission =
  | 'leads:read:all'        // ADMIN, DIRECTOR
  | 'leads:read:team'       // MANAGER
  | 'leads:read:own'        // SDR, CONSULTANT
  | 'leads:write:own'       // SDR, CONSULTANT, MANAGER
  | 'leads:delete'          // ADMIN
  | 'leads:assign'          // ADMIN, MANAGER
  | 'leads:score:read'      // todos (dentro do escopo de cada role)
  | 'pipeline:advance'      // SDR, MANAGER, ADMIN
  | 'pipeline:configure'    // ADMIN
  | 'pricing:read'          // ADMIN, DIRECTOR, MANAGER
  | 'pricing:write'         // ADMIN
  | 'users:manage'          // ADMIN
  | 'dashboard:executive'   // ADMIN, DIRECTOR
  | 'dashboard:operational' // ADMIN, DIRECTOR, MANAGER
  | 'dashboard:sdr'         // ADMIN, MANAGER, SDR
  | 'integrations:manage'   // ADMIN
  | 'audit:read'            // ADMIN
  | 'availability:manage'   // SDR, CONSULTANT

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'leads:read:all', 'leads:read:team', 'leads:read:own',
    'leads:write:own', 'leads:delete', 'leads:assign', 'leads:score:read',
    'pipeline:advance', 'pipeline:configure',
    'pricing:read', 'pricing:write', 'users:manage',
    'dashboard:executive', 'dashboard:operational', 'dashboard:sdr',
    'integrations:manage', 'audit:read', 'availability:manage'
  ],
  DIRECTOR: [
    'leads:read:all', 'leads:score:read',
    'pricing:read',
    'dashboard:executive', 'dashboard:operational'
  ],
  MANAGER: [
    'leads:read:team', 'leads:read:own', 'leads:write:own',
    'leads:assign', 'leads:score:read',
    'pipeline:advance',
    'pricing:read',
    'dashboard:operational', 'dashboard:sdr'
  ],
  SDR: [
    'leads:read:own', 'leads:write:own', 'leads:score:read',
    'pipeline:advance',
    'dashboard:sdr', 'availability:manage'
  ],
  CONSULTANT: [
    'leads:read:own', 'leads:write:own', 'leads:score:read',
    'availability:manage'
  ]
}

export function can(user: User, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.role].includes(permission)
}
```

**Filtro de escopo de leads** — aplicado em todas as queries CRM:

```typescript
// lib/lead-scope.ts
export async function buildLeadScope(session: Session) {
  if (can(session.user, 'leads:read:all')) {
    return {}  // ADMIN, DIRECTOR — sem filtro
  }
  if (can(session.user, 'leads:read:team')) {
    // MANAGER — apenas leads da equipe
    const members = await prisma.teamMember.findMany({
      where: { team: { managerId: session.user.id } },
      select: { userId: true }
    })
    return { assignedUserId: { in: members.map(m => m.userId) } }
  }
  // SDR, CONSULTANT — apenas leads próprios
  return { assignedUserId: session.user.id }
}

// Uso em API Route:
const leads = await prisma.lead.findMany({
  where: await buildLeadScope(session),
  select: buildLeadSelect(session) // inclui/exclui qualificationData conforme role
})
```

**Select seguro para qualificationData:**

```typescript
// lib/lead-select.ts
export function buildLeadSelect(session: Session) {
  const base = {
    id: true, name: true, email: true, phone: true,
    company: true, status: true, priority: true,
    grade: true, source: true, createdAt: true,
    assignedUser: { select: { id: true, name: true } }
  }

  // qualificationData acessível apenas para usuários autenticados dentro do escopo
  if (can(session.user, 'leads:score:read')) {
    return { ...base, score: true, grade: true, financialCapacity: true, qualificationData: true }
  }

  return base
}
```

### 11.3 Segurança Geral

- ✅ HTTPS obrigatório (SSL via Coolify)
- ✅ CSRF protection (NextAuth)
- ✅ Rate limiting (Redis)
- ✅ Input sanitization (Zod)
- ✅ SQL injection prevention (Prisma)
- ✅ **score, grade, financialCapacity e qualificationData nunca retornados por endpoints públicos**
- ✅ **Endpoint `/api/pricing/active` retorna apenas campos lead-facing (sem dados internos)**
- ✅ **Escopo de leads aplicado por role em todas as queries CRM**
- ✅ File upload validation
- ✅ Passwords hashed (bcrypt salt 12)
- ✅ AuditLog de todas as ações sensíveis
- ✅ **Microsoft Teams credentials criptografadas e armazenadas com segurança**

### 11.4 Performance

- ✅ Server Components (padrão Next.js 15)
- ✅ Streaming SSR + Partial Prerendering
- ✅ Caching agressivo (Redis)
- ✅ Database indexing (Prisma)
- ✅ Cache de slots de disponibilidade (15min TTL)

---

## ✅ 12. Critérios de Sucesso

### Técnicos
- ✅ Uptime > 99.5%
- ✅ Tempo resposta < 500ms
- ✅ Zero data loss
- ✅ **score, grade e qualificationData nunca expostos em APIs públicas**
- ✅ **Integração Teams funcionando com 99%+ de sucesso**

### Negócio
- ✅ 100+ leads qualificados/mês
- ✅ 87%+ precisão qualificação
- ✅ 65%+ leads Grade A+B
- ✅ **80%+ reuniões agendadas automaticamente**
- ✅ CAC < R$ 4.500
- ✅ <5% leads inviáveis ao SDR

### Experiência
- ✅ NPS > 8/10
- ✅ Satisfação equipe > 85%
- ✅ **Taxa conclusão agendamento > 90%**
- ✅ **Zero falhas em criação de reuniões Teams**

---

## 📝 13. Próximos Passos

### Imediato (Semana 1)
1. ✅ Aprovação diretoria
2. ✅ Setup VPS + Coolify
3. ✅ Configurar domínio e SSL
4. ✅ Configurar Microsoft Teams App no Azure
5. ✅ Obter credenciais (Tenant ID, Client ID, Secret)

### Curto Prazo (Mês 1)
1. ✅ Desenvolvimento MVP
2. ✅ Implementar sistema de calendário nativo
3. ✅ Integração Microsoft Teams
4. ✅ Testes internos
5. ✅ Configurar valores de investimento
6. ✅ Cadastrar tabela inicial de mensalidades

### Médio Prazo (Mês 2-3)
1. ✅ Soft launch 10%
2. ✅ Ajustar sistema agendamento
3. ✅ Monitorar integração Teams
4. ✅ Launch gradual 100%

### Longo Prazo (Mês 4-12)
1. ✅ Machine Learning scoring
2. ✅ Automações avançadas
3. ✅ Predição de conversão
4. ✅ Análise de padrões de agendamento
5. ✅ Sugestões inteligentes de horários

---

**Versão:** 8.0  
**Última atualização:** 12/02/2026  
**Status:** Pronto para implementação

> **"Sistema de funil digital com qualificação ultra-robusta, agendamento nativo com Microsoft Teams e mensalidades dinâmicas — SDR focado em apresentar valor, não em filtrar leads financeiramente inaptos."**

---

## 📎 APÊNDICE A: Configuração Microsoft Teams (Azure AD)

### Pré-requisitos
- Conta Microsoft 365 Business ou Enterprise
- Permissões de administrador no Azure AD
- Email corporativo (@hiperfarma.com.br)

### Passo 1: Acessar Azure Portal

1. Acessar https://portal.azure.com
2. Fazer login com conta de administrador
3. Ir em **Microsoft Entra ID** (antigo Azure Active Directory)

### Passo 2: Registrar Aplicação

1. No menu lateral, clicar em **App registrations**
2. Clicar em **+ New registration**
3. Preencher:
   - **Name:** `Hiperfarma CRM - Teams Integration`
   - **Supported account types:** `Accounts in this organizational directory only`
   - **Redirect URI:** Deixar em branco por enquanto
4. Clicar em **Register**
5. **Anotar:**
   - **Application (client) ID** → `MICROSOFT_CLIENT_ID`
   - **Directory (tenant) ID** → `MICROSOFT_TENANT_ID`

### Passo 3: Criar Client Secret

1. Na aplicação criada, ir em **Certificates & secrets**
2. Clicar em **+ New client secret**
3. Configurar:
   - **Description:** `CRM Production Secret`
   - **Expires:** `24 months` (recomendado)
4. Clicar em **Add**
5. **IMPORTANTE:** Copiar o **Value** imediatamente → `MICROSOFT_CLIENT_SECRET`
   - ⚠️ Este valor só é mostrado uma vez!
   - Guarde em local seguro (gerenciador de senhas)

### Passo 4: Configurar Permissões da API

1. No menu lateral da aplicação, ir em **API permissions**
2. Clicar em **+ Add a permission**
3. Selecionar **Microsoft Graph**
4. Selecionar **Application permissions** (não Delegated)
5. Adicionar as seguintes permissões:
   - `Calendars.ReadWrite` - Criar e gerenciar eventos
   - `OnlineMeetings.ReadWrite.All` - Criar reuniões Teams
   
6. Clicar em **Add permissions**
7. **CRÍTICO:** Clicar em **Grant admin consent for [sua organização]**
   - Confirmar clicando em **Yes**
   - Aguardar status mudar para "Granted"

### Passo 5: Verificar Configuração

Conferir se a tela de permissões está assim:

```
Permission                        Type         Status
─────────────────────────────────────────────────────
Calendars.ReadWrite               Application  ✓ Granted
OnlineMeetings.ReadWrite.All      Application  ✓ Granted
```

### Passo 6: Testar Autenticação

Criar script de teste `test-teams-auth.js`:

```javascript
const fetch = require('node-fetch')

const TENANT_ID = 'seu-tenant-id'
const CLIENT_ID = 'seu-client-id'
const CLIENT_SECRET = 'seu-client-secret'

async function testAuth() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  })

  const response = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    }
  )

  const data = await response.json()
  
  if (data.access_token) {
    console.log('✅ Autenticação bem-sucedida!')
    console.log('Token expira em:', data.expires_in, 'segundos')
  } else {
    console.error('❌ Erro na autenticação:', data)
  }
}

testAuth()
```

Executar:
```bash
node test-teams-auth.js
```

### Passo 7: Adicionar Email dos Consultores

Para que o sistema possa criar eventos nos calendários:

1. Garantir que todos os consultores/SDRs têm:
   - Email corporativo Microsoft 365
   - Licença do Microsoft Teams
   - Calendário ativo no Outlook

2. No CRM, cadastrar usuários com os **emails exatos** do Microsoft 365

### Resumo das Credenciais

Ao final, você terá três valores para adicionar nas variáveis de ambiente:

```bash
MICROSOFT_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
MICROSOFT_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
MICROSOFT_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Troubleshooting

**Erro: "Admin consent required"**
- Voltar ao passo 4 e garantir que clicou em "Grant admin consent"
- Verificar se está logado como administrador

**Erro: "Insufficient privileges"**
- Verificar se as permissões são **Application** e não Delegated
- Confirmar que as permissões foram aprovadas (status "Granted")

**Erro: "Invalid client secret"**
- Gerar novo client secret (o anterior expirou ou foi copiado incorretamente)
- Lembrar de copiar o Value, não o Secret ID

**Reuniões não aparecem no Teams do consultor**
- Verificar se o email no CRM é exatamente igual ao email Microsoft 365
- Confirmar que o consultor tem licença ativa do Teams
- Checar se o calendário do consultor está acessível

### Referências

- [Microsoft Graph API Documentation](https://learn.microsoft.com/en-us/graph/)
- [Create Online Meeting](https://learn.microsoft.com/en-us/graph/api/application-post-onlinemeetings)
- [Create Event](https://learn.microsoft.com/en-us/graph/api/user-post-events)
