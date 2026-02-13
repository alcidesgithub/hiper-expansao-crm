# Sistema de Qualificação Ultra-Robusto v7.0
## Hiperfarma - Precisão de 87%+ com Mensalidades Dinâmicas

---

## 🎯 Filosofia do Sistema

**Princípio:** "Melhor perder um lead duvidoso do que desperdiçar tempo do SDR com perfil errado"

O sistema funciona como um **funil de altíssima precisão** que:
1. ✅ **Elimina** 40% dos leads sem fit no gate inicial
2. ✅ **Valida** capacidade de arcar com as mensalidades vigentes
3. ✅ **Classifica** com 87%+ de precisão
4. ✅ **Prioriza** por urgência e potencial real
5. ✅ **Permite agendamento self-service** via calendário nativo com Teams

> **Modelo de negócio:** A Hiperfarma é uma rede associativista. O investimento do associado consiste em **mensalidades recorrentes** (marketing e administrativa), configuradas dinamicamente via CRUD interno. Não há taxa de adesão nem cálculo de ROI — a qualificação financeira mede exclusivamente se o lead consegue arcar com as mensalidades cadastradas.

---

## 📊 Resultados Esperados

| Métrica | Antes | Depois v7.0 |
|---------|-------|-------------|
| Taxa de aprovação gate | N/A | 60% (40% eliminados) |
| Precisão qualificação | ~70% | 87%+ |
| Leads inaptos ao SDR | ~25% | <5% |
| Tempo desperdiçado SDR | Alto | Redução 60% |
| Conversão Grade A | ~50% | 70%+ |
| **Reuniões agendadas auto** | 0% | 80%+ |

---

## 🚪 ETAPA 0: Gate de Pré-Qualificação

### Objetivo
Eliminar **40%** dos leads que não têm poder de decisão **antes** do formulário principal.

### Implementação

**Tela de Gate:**

```
┌────────────────────────────────────────────┐
│                                            │
│  🎯 FAÇA PARTE DA REDE HIPERFARMA          │
│                                            │
│  Antes de começar, precisamos confirmar:   │
│                                            │
│  Você é o(a) decisor(a) na farmácia?       │
│  (Proprietário, Sócio, Farmacêutico        │
│   Responsável ou Gerente Geral)            │
│                                            │
│  ○ SIM, sou decisor                        │
│  ○ NÃO, mas posso influenciar a decisão    │
│  ○ NÃO, estou apenas pesquisando           │
│                                            │
│  [Continuar]                               │
│                                            │
└────────────────────────────────────────────┘
```

**Lógica de Roteamento:**

```typescript
if (resposta === 'SIM') {
  redirect('/formulario/etapa-1')
} else if (resposta === 'NAO_INFLUENCIAR') {
  redirect('/conteudo/como-influenciar-decisao')
  saveToDatabase({ tipo: 'influenciador' })
} else {
  redirect('/conteudo/conheca-hiperfarma')
  saveToDatabase({ tipo: 'pesquisador' })
}
```

---

## 📝 FORMULÁRIO MULTI-ETAPA (5 Etapas)

- **Progressivo:** Baixa fricção inicial, aumenta comprometimento
- **Auto-save:** localStorage salva progresso a cada campo
- **Validação real-time:** Feedback imediato
- **Mobile-first:** Responsivo completo

```
┌────────────────────────────────────────┐
│  ●━━━━━ ○━━━━━ ○━━━━━ ○━━━━━ ○        │
│  Você   Perfil  Dores   Urgên  Mensalid│
│  20% completo                          │
└────────────────────────────────────────┘
```

---

## ETAPA 1: Identificação (10 pontos)

```typescript
interface Etapa1 {
  nome: string      // mínimo 3 palavras, sem números
  email: string     // validação MX + blocklist temporários
  telefone: string  // DDD válido, cruzamento com estado
  empresa: string   // nome da farmácia
}
```

**Score Etapa 1:** +10 pontos base

---

## ETAPA 2: Perfil Empresarial (155 pontos)

### 2.1 Cargo/Função (0-30 pts)

```typescript
const cargos = [
  { value: 'proprietario',    label: 'Proprietário/Sócio',                    score: 30 },
  { value: 'farmaceutico_rt', label: 'Farmacêutico Responsável Técnico',       score: 25 },
  { value: 'gerente_geral',   label: 'Gerente Geral',                          score: 20 },
  { value: 'gerente_comercial',label: 'Gerente Comercial/Compras',             score: 15 },
  { value: 'farmaceutico',    label: 'Farmacêutico (não responsável)',          score: 0, descarta: true },
  { value: 'outro',           label: 'Outro cargo',                            score: 0, descarta: true }
]
```

### 2.2 Número de Lojas (0-40 pts)

```typescript
const lojas = [
  { value: '1',   label: '1 loja',             score: 10 },
  { value: '2-3', label: '2 a 3 lojas',         score: 25, tag: 'IDEAL' },
  { value: '4-5', label: '4 a 5 lojas',         score: 30, tag: 'IDEAL' },
  { value: '6-10',label: '6 a 10 lojas',        score: 35, tag: 'PREMIUM' },
  { value: '11+', label: 'Mais de 10 lojas',    score: 40, tag: 'VIP', multiplicador: 1.3 },
  { value: '0',   label: 'Ainda não tenho',     score: 0,  descarta: true }
]
```

### 2.3 Faturamento Mensal/Loja (0-40 pts)

```typescript
const faturamento = [
  { value: '0-50k',    label: 'Até R$ 50.000',           score: 5  },
  { value: '50-100k',  label: 'R$ 50.001 a R$ 100.000',  score: 15 },
  { value: '100-200k', label: 'R$ 100.001 a R$ 200.000', score: 25, tag: 'IDEAL' },
  { value: '200-500k', label: 'R$ 200.001 a R$ 500.000', score: 35, tag: 'PREMIUM' },
  { value: '500k+',    label: 'Acima de R$ 500.000',     score: 40, tag: 'PREMIUM' },
  {
    value: 'nao-informar',
    label: 'Prefiro não informar',
    score: -10,
    bloqueiaAvanco: true,
    mensagem: 'Este dado é necessário para entendermos seu perfil'
  }
]
```

### 2.4 Localização (0-20 pts)

```typescript
const localizacao = [
  { estado: 'PR', score: 20, tag: 'PRIORITÁRIO' },
  { estado: 'SC', score: 20, tag: 'PRIORITÁRIO' },
  { estado: 'SP', score: 10, tag: 'EXPANSÃO' },
  { estado: 'RS', score: 10, tag: 'EXPANSÃO' },
  { estado: 'MG', score: 8 },
  { estado: 'RJ', score: 8 },
  { value: 'outros', score: 3 }
]
```

### 2.5 Tempo no Mercado (0-25 pts)

```typescript
const tempoMercado = [
  { value: '<1a',  label: 'Menos de 1 ano',  score: 5  },
  { value: '1-3a', label: '1 a 3 anos',       score: 10 },
  { value: '3-5a', label: '3 a 5 anos',       score: 15 },
  { value: '5-10a',label: '5 a 10 anos',      score: 20, tag: 'IDEAL' },
  { value: '10a+', label: 'Mais de 10 anos',  score: 25 }
]
```

**Score Etapa 2:** 0-155 pontos

---

## ETAPA 3: Desafios e Motivações (105 pontos)

### 3.1 Principais Desafios (0-75 pts) — marcar até 3

```typescript
const desafios = [
  { value: 'negociacao', label: 'Negociação com fornecedores',        score: 25, categoria: 'CORE' },
  { value: 'competicao', label: 'Competição com grandes redes',       score: 25, categoria: 'CORE' },
  { value: 'margens',    label: 'Margens apertadas / Preços',         score: 25, categoria: 'CORE' },
  { value: 'estoque',    label: 'Gestão de estoque / Ruptura',        score: 20, categoria: 'RESOLVE' },
  { value: 'captacao',   label: 'Captação/Retenção de clientes',      score: 20, categoria: 'RESOLVE' },
  { value: 'tecnologia', label: 'Tecnologia / Sistemas defasados',    score: 15, categoria: 'RESOLVE' },
  { value: 'marketing',  label: 'Marketing e divulgação',             score: 15, categoria: 'RESOLVE' },
  { value: 'financeiro', label: 'Gestão financeira / Fluxo de caixa', score: 15, categoria: 'RESOLVE' },
  { value: 'rh',         label: 'Equipe / RH',                       score: 10, categoria: 'AJUDA' },
  { value: 'compliance', label: 'Compliance / Regulamentações',       score: 10, categoria: 'AJUDA' },
  { value: 'logistica',  label: 'Logística / Distribuição',           score: 10, categoria: 'AJUDA' },
  { value: 'nenhum',     label: 'Não tenho desafios significativos',  score: -30, categoria: 'SEM_FIT' }
]
```

### 3.2 Motivação (0-30 pts)

```typescript
const motivacoes = [
  { value: 'poder-compra',  label: 'Aumentar poder de compra',     score: 30, tag: 'IDEAL' },
  { value: 'reduzir-custos',label: 'Reduzir custos operacionais',  score: 25, tag: 'IDEAL' },
  { value: 'suporte',       label: 'Ter suporte de gestão',        score: 25, tag: 'IDEAL' },
  { value: 'marca',         label: 'Fortalecer marca',             score: 15 },
  { value: 'networking',    label: 'Networking com outros',        score: 10 },
  { value: 'pesquisando',   label: 'Só estou pesquisando',         score: 5,  tag: 'FRIO' },
  { value: 'nao-sei',       label: 'Ainda não sei se quero',       score: 0,  tag: 'MUITO_FRIO' }
]
```

**Score Etapa 3:** 0-105 pontos

---

## ETAPA 4: Timing e Urgência (80 pontos)

### 4.1 Quando Pretende Associar-se (0-50 pts)

```typescript
const timing = [
  { value: 'imediato',  label: 'Imediatamente (próximos 7 dias)',     score: 50, tag: 'HOT' },
  { value: '15-dias',   label: 'Próximos 15 dias',                    score: 40, tag: 'HOT' },
  { value: '30-dias',   label: 'Próximo mês',                         score: 30, tag: 'WARM' },
  { value: '2-3-meses', label: 'Em 2-3 meses',                        score: 20, tag: 'WARM' },
  { value: '6-meses',   label: 'Em até 6 meses',                      score: 10, tag: 'COLD' },
  { value: 'sem-prazo', label: 'Sem prazo definido / só pesquisando', score: 0,  tag: 'VERY_COLD' }
]
```

### 4.2 Situação Atual (0-30 pts)

```typescript
const situacao = [
  { value: 'decidido',         label: 'Já estou decidido a associar',             score: 30 },
  { value: 'avaliando',        label: 'Avaliando a Hiperfarma especificamente',   score: 25 },
  { value: 'comparando',       label: 'Comparando entre várias opções',           score: 15 },
  { value: 'pesquisa-inicial', label: 'Pesquisa inicial',                         score: 5  },
  { value: 'so-curiosidade',   label: 'Só curiosidade',                           score: 0  }
]
```

**Score Etapa 4:** 0-80 pontos

---

## ETAPA 5: Capacidade Financeira (80 pontos + eliminação)

### 5.1 Busca Dinâmica de Mensalidades

Antes de renderizar a etapa 5, o formulário faz uma chamada ao endpoint público:

```typescript
// GET /api/pricing/active
const pricing = await fetch('/api/pricing/active').then(r => r.json())

// Retorna:
{
  id: "clx123",
  name: "Tabela 2026",
  effectiveDate: "2026-01-01T00:00:00.000Z",
  marketingMonthly: 2500.00,
  marketingDescription: "Mensalidade de Marketing",
  marketingBullets: [
    "Assessoria de marketing especializada",
    "Campanhas digitais coordenadas",
    "Material promocional personalizado"
  ],
  adminMonthly: 1800.00,
  adminDescription: "Mensalidade Administrativa",
  adminBullets: [
    "Suporte jurídico e contábil",
    "Consultoria financeira e gestão",
    "Acesso a sistemas e tecnologia"
  ],
  totalMonthly: 4300.00
}
```

### 5.2 Interface da Etapa 5

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
│  ○ Sim, tranquilamente (50 pts)                │
│  ○ Sim, com planejamento (30 pts)              │
│  ○ Seria apertado (15 pts)                     │
│  ○ Não consigo no momento (0 pts, ELIMINA)     │
│                                                │
│  Sua farmácia consegue arcar com a             │
│  mensalidade administrativa (R$ 1.800/mês)?   │
│                                                │
│  ○ Sim, tranquilamente (30 pts)                │
│  ○ Sim, com planejamento (20 pts)              │
│  ○ Seria apertado (10 pts)                     │
│  ○ Não consigo no momento (0 pts, ELIMINA)     │
│                                                │
│  [⬅ Voltar]  [Finalizar →]                    │
│                                                │
└────────────────────────────────────────────────┘
```

### 5.3 Cálculo de Score e Capacidade

```typescript
type CapacityAnswer = 'COMFORTABLE' | 'POSSIBLE' | 'LIMITED' | 'INSUFFICIENT'

interface Etapa5 {
  marketingCapacity: CapacityAnswer
  adminCapacity: CapacityAnswer
}

function calculateEtapa5Score(data: Etapa5): number {
  const scoreMap = {
    COMFORTABLE: { marketing: 50, admin: 30 },
    POSSIBLE:    { marketing: 30, admin: 20 },
    LIMITED:     { marketing: 15, admin: 10 },
    INSUFFICIENT:{ marketing: 0,  admin: 0  }
  }
  
  return scoreMap[data.marketingCapacity].marketing +
         scoreMap[data.adminCapacity].admin
}

function calculateFinancialCapacity(data: Etapa5): FinancialCapacity {
  // REGRA ELIMINATÓRIA: se não consegue arcar com qualquer uma → INSUFFICIENT
  if (data.marketingCapacity === 'INSUFFICIENT' || data.adminCapacity === 'INSUFFICIENT') {
    return 'INSUFFICIENT'
  }
  
  // Se APERTADO em qualquer uma → LIMITED
  if (data.marketingCapacity === 'LIMITED' || data.adminCapacity === 'LIMITED') {
    return 'LIMITED'
  }
  
  // Se ambas TRANQUILAMENTE → COMFORTABLE
  if (data.marketingCapacity === 'COMFORTABLE' && data.adminCapacity === 'COMFORTABLE') {
    return 'COMFORTABLE'
  }
  
  // Demais casos (planejamento necessário) → POSSIBLE
  return 'POSSIBLE'
}
```

**Score Etapa 5:** 0-80 pontos (mas pode ELIMINAR)

---

## 🎯 SISTEMA DE SCORING FINAL

### Score Total

```
Score Máximo = 430 pontos

Etapa 1:  10 pts  (2.3%)
Etapa 2: 155 pts (36.0%)
Etapa 3: 105 pts (24.4%)
Etapa 4:  80 pts (18.6%)
Etapa 5:  80 pts (18.6%)
```

### Classificação por Grade

```typescript
function calculateGrade(score: number, financialCapacity: FinancialCapacity): LeadGrade {
  // ELIMINAÇÃO AUTOMÁTICA: capacidade financeira insuficiente
  if (financialCapacity === 'INSUFFICIENT') {
    return 'F'
  }
  
  // Ajuste de score baseado em capacidade financeira
  let adjustedScore = score
  
  if (financialCapacity === 'LIMITED') {
    adjustedScore *= 0.85  // reduz 15%
  } else if (financialCapacity === 'COMFORTABLE') {
    adjustedScore *= 1.1   // aumenta 10%
  }
  
  // Classificação por faixas
  if (adjustedScore >= 350) {
    return 'A'  // 70-85% conversão
  } else if (adjustedScore >= 280) {
    return 'B'  // 45-70% conversão
  } else if (adjustedScore >= 200) {
    return 'C'  // 20-45% conversão
  } else if (adjustedScore >= 120) {
    return 'D'  // 5-20% conversão
  } else {
    return 'F'  // <5% conversão
  }
}
```

### Detalhamento por Grade

```typescript
function getGradeDetails(grade: LeadGrade) {
  const details = {
    A: {
      label: 'GRADE A - PRIORITÁRIO',
      tag: '🏆',
      cor: '#10B981',
      prioridade: 'URGENTE',
      sla_horas: 2,
      probabilidade_conversao: '70-85%',
      acoes: [
        '📅 Agendamento automático disponível',
        '📞 Contato imediato se não agendar',
        '👔 Alocar melhor consultor',
        '🎁 Oferecer bônus de boas-vindas'
      ]
    },
    B: {
      label: 'GRADE B - ALTO POTENCIAL',
      tag: '⭐',
      cor: '#3B82F6',
      prioridade: 'ALTA',
      sla_horas: 24,
      probabilidade_conversao: '45-70%',
      acoes: [
        '📅 Agendamento automático disponível',
        '📧 Sequência nurturing + follow-up',
        '📚 Enviar materiais educativos',
        '💬 WhatsApp de boas-vindas'
      ]
    },
    C: {
      label: 'GRADE C - NUTRIR',
      tag: '🌱',
      cor: '#F59E0B',
      prioridade: 'MÉDIA',
      sla_horas: 72,
      probabilidade_conversao: '20-45%',
      acoes: [
        '📧 Sequência de emails educativos',
        '📱 Adicionar a fluxo de nurturing',
        '🎯 Campanhas remarketing',
        '📞 Contato em 7 dias'
      ]
    },
    D: {
      label: 'GRADE D - BAIXO FIT',
      tag: '⚠️',
      cor: '#EF4444',
      prioridade: 'BAIXA',
      sla_horas: null,
      probabilidade_conversao: '5-20%',
      acoes: [
        '📧 Newsletter geral',
        '📚 Conteúdo educativo básico',
        '🔄 Reavaliar em 90 dias',
        '🚫 NÃO alocar SDR'
      ]
    },
    F: {
      label: 'SEM FIT',
      tag: '❌',
      cor: '#EF4444',
      prioridade: 'NENHUMA',
      sla_horas: null,
      probabilidade_conversao: '<5%',
      acoes: [
        '📧 Email de agradecimento',
        '📚 Newsletter genérica',
        '🚫 NÃO alocar SDR'
      ]
    }
  }
  
  return details[grade]
}
```

---

## 🎉 TELA DE RESULTADO PÓS-QUALIFICAÇÃO

### Variante A: Aprovado (Grade A ou B)

```
┌─────────────────────────────────────────────────┐
│  🎉 PARABÉNS!                                   │
│                                                 │
│  Seu perfil é exatamente o tipo de parceiro     │
│  que a Hiperfarma busca.                        │
│                                                 │
│  Nosso time está pronto para conversar sobre    │
│  como a rede pode transformar sua farmácia.     │
│                                                 │
│  📅 AGENDE SUA REUNIÃO                          │
│                                                 │
│  Escolha o melhor dia e horário para conversar  │
│  com um de nossos consultores:                  │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  Fevereiro 2026                           │ │
│  │  ───────────────────────────────────      │ │
│  │  DOM SEG TER QUA QUI SEX SAB             │ │
│  │       12  13  14  15  16  17             │ │
│  │       19  20  21  22  23  24             │ │
│  │       ●   ●       ●   ●                  │ │
│  │  (● = dias com horários disponíveis)     │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [Agendar Agora →]                              │
│                                                 │
│  [Pular por enquanto]                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Interface de Seleção de Horário

```
┌─────────────────────────────────────────────────┐
│  📅 ESCOLHA SEU HORÁRIO                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  Dia selecionado: Quinta, 15/02/2026            │
│                                                 │
│  Horários disponíveis:                          │
│  ○ 09:00 - 10:00                                │
│  ○ 10:00 - 11:00                                │
│  ○ 14:00 - 15:00                                │
│  ● 15:00 - 16:00  ← selecionado                 │
│  ○ 16:00 - 17:00                                │
│                                                 │
│  Consultor: João Silva                          │
│  Formato: Reunião online (Microsoft Teams)      │
│  Duração: 60 minutos                            │
│                                                 │
│  [Confirmar Agendamento]                        │
│  [⬅ Voltar para Calendário]                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Confirmação de Agendamento

```
┌─────────────────────────────────────────────────┐
│  ✅ REUNIÃO CONFIRMADA!                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  Sua reunião foi agendada com sucesso.          │
│                                                 │
│  📅 Quinta-feira, 15 de Fevereiro de 2026       │
│  🕐 15:00 - 16:00 (horário de Brasília)         │
│  👤 Consultor: João Silva                       │
│  💻 Microsoft Teams                             │
│                                                 │
│  Você receberá um email de confirmação com:     │
│  • Link para entrar na reunião                  │
│  • Lembretes antes do horário                   │
│  • Informações do consultor                     │
│                                                 │
│  [Ir para a Página Inicial]                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Variante B: Nurturing (Grade C/D)

```
┌─────────────────────────────────────────┐
│  ✅ Recebemos suas informações!         │
│                                         │
│  Nosso time vai analisar seu perfil     │
│  e entrará em contato em breve.         │
│                                         │
│  Enquanto isso, conheça mais sobre a    │
│  Hiperfarma:                            │
│                                         │
│  [📚 Ver Conteúdos]                     │
│  [📰 Assinar Newsletter]                │
│                                         │
└─────────────────────────────────────────┘
```

### Variante C: Descartado (Grade F)

```
┌─────────────────────────────────────────┐
│  Obrigado pelo interesse!               │
│                                         │
│  No momento, nosso modelo está          │
│  focado em perfis específicos.          │
│                                         │
│  Fique à vontade para acompanhar        │
│  nossos conteúdos e novidades:          │
│                                         │
│  [📰 Assinar Newsletter]                │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔍 VALIDAÇÕES CRUZADAS

```typescript
function validarCoerenciaCompleta(lead: Lead): ValidationResult {
  const flags: Flag[] = []

  // Tamanho × faturamento
  if (lead.lojas >= 10 && lead.faturamento < 100000) {
    flags.push({ tipo: 'INCOERENCIA', severidade: 'ALTA', score: -20 })
  }

  // Urgência sem desafios
  if (lead.urgencia === 'Imediato' && lead.desafios.length === 0) {
    flags.push({ tipo: 'CONTRADIÇÃO', severidade: 'ALTA', score: -15 })
  }

  // Preenchimento muito rápido (possível bot)
  if (lead.tempoPreenchimento < 30) {
    flags.push({ tipo: 'FRAUDE', severidade: 'CRÍTICA', score: -100 })
  }

  // DDD × estado declarado
  const dddEstado = mapearDDDEstado(lead.telefone)
  if (dddEstado && !lead.estados.includes(dddEstado)) {
    flags.push({ tipo: 'DIVERGENCIA', severidade: 'MÉDIA', score: -5 })
  }

  // Capacidade financeira × faturamento
  // Lead com faturamento alto mas capacidade limitada é suspeito
  if (lead.faturamento > 200000 && lead.financialCapacity === 'LIMITED') {
    flags.push({ tipo: 'INCOERENCIA_FINANCEIRA', severidade: 'MÉDIA', score: -10 })
  }

  return {
    valido: flags.filter(f => f.severidade === 'CRÍTICA').length === 0,
    flags,
    scoreAjuste: flags.reduce((acc, f) => acc + (f.score || 0), 0)
  }
}
```

---

## 🚨 RED FLAGS

```typescript
const redFlags = {
  email_descartavel:          { severidade: 'CRÍTICA', acao: 'BLOQUEAR',       score: -100 },
  dados_fraudulentos:         { severidade: 'CRÍTICA', acao: 'BLOQUEAR',       score: -100 },
  telefone_invalido:          { severidade: 'ALTA',    acao: 'VALIDAR_MANUAL', score: -50  },
  multiplas_tentativas:       { severidade: 'ALTA',    acao: 'RATE_LIMIT',     score: -50  },
  preenchimento_rapido:       { severidade: 'MÉDIA',   acao: 'CAPTCHA',        score: -20  },
  respostas_contraditórias:   { severidade: 'MÉDIA',   acao: 'REVISAR',        score: -30  },
  email_generico:             { severidade: 'BAIXA',   acao: 'OBSERVAR',       score: -5   },
  capacidade_incompativel:    { severidade: 'MÉDIA',   acao: 'REVISAR',        score: -10  }
}
```

---

## 📊 DASHBOARD DE QUALIFICAÇÃO (time interno)

> **Acesso:** ADMIN e DIRECTOR — visão completa | MANAGER — apenas equipe | SDR — apenas próprios leads

```
┌─────────────────────────────────────────────────────┐
│  SISTEMA DE QUALIFICAÇÃO - TEMPO REAL               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  GATE INICIAL:                                      │
│  ├─ Visitantes: 1.247                               │
│  ├─ Aprovados: 748 (60%) ✅                         │
│  └─ Descartados: 499 (40%) ❌                       │
│                                                     │
│  FORMULÁRIO COMPLETO:                               │
│  ├─ Iniciados: 748  │  Concluídos: 614 (82%) ✅     │
│  └─ Tempo Médio: 2m 47s                             │
│                                                     │
│  DISTRIBUIÇÃO POR GRADE:                            │
│  ┌────┬─────┬──────┬──────────┬──────────────────┐ │
│  │Grd │ Qtd │  %   │   Prob   │  Capacidade      │ │
│  ├────┼─────┼──────┼──────────┼──────────────────┤ │
│  │ A  │ 156 │ 25%  │  70-85%  │  Confortável     │ │
│  │ B  │ 245 │ 40%  │  45-70%  │  Confortável     │ │
│  │ C  │ 129 │ 21%  │  20-45%  │  Possível        │ │
│  │ D  │  62 │ 10%  │   5-20%  │  Limitado        │ │
│  │ F  │  22 │  4%  │   <5%    │  Insuficiente    │ │
│  └────┴─────┴──────┴──────────┴──────────────────┘ │
│                                                     │
│  📈 CAPACIDADE FINANCEIRA (por acesso autorizado):  │
│  • Confortável: 401 (65%) ✅                        │
│  • Possível: 129 (21%) ⚠️                           │
│  • Limitado: 62 (10%) 🔴                            │
│  • Insuficiente: 22 (4%) ❌                         │
│                                                     │
│  📅 AGENDAMENTOS:                                   │
│  • Leads A/B: 401                                   │
│  • Agendaram: 341 (85%) ✅                          │
│  • Pendentes: 60 (15%)                              │
│  • Taxa conversão: 85% (meta: 80%)                  │
│                                                     │
│  MENSALIDADE VIGENTE (Tabela 2026):                 │
│  Marketing: R$ 2.500 | Admin: R$ 1.800              │
│  Total: R$ 4.300/mês                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Base
- [ ] Schema Prisma — model `AssociationPricing` (sem campos de ROI)
- [ ] Schema Prisma — models `AvailabilitySlot` e `AvailabilityBlock`
- [ ] Schema Prisma — model `Meeting` com campos Teams
- [ ] Seed da tabela inicial de mensalidades
- [ ] API `GET /api/pricing/active` — campos públicos apenas
- [ ] CRUD interno: `GET/POST/PUT /api/crm/pricing`
- [ ] Endpoint `POST /api/crm/pricing/:id/activate`

### Fase 2: Gate
- [ ] Página gate pré-qualificação
- [ ] Roteamento condicional (decisor / influenciador / pesquisador)
- [ ] Analytics gate

### Fase 3: Formulário
- [ ] Multi-step com auto-save (etapas 1-4)
- [ ] Validações em tempo real
- [ ] Etapa 5: busca dinâmica de mensalidades via `/api/pricing/active`
- [ ] Etapa 5: perguntas de capacidade com valores interpolados
- [ ] Regra eliminatória de capacidade
- [ ] **API route de submissão nunca retorna score ou qualificationData ao lead**

### Fase 4: Scoring
- [ ] Algoritmo completo (etapas 1-5)
- [ ] Validações cruzadas
- [ ] Detecção red flags
- [ ] Classificação A-F (baseada em score + capacidade, sem ROI)
- [ ] API de qualificação (server-side)

### Fase 5: Microsoft Teams Integration
- [ ] Configurar app no Azure AD
- [ ] Obter credenciais (Tenant ID, Client ID, Secret)
- [ ] Implementar serviço de autenticação Teams
- [ ] Criar função de criação de eventos/reuniões
- [ ] Testes de integração

### Fase 6: Sistema de Calendário Nativo
- [ ] CRUD de slots de disponibilidade (consultores/SDRs)
- [ ] CRUD de bloqueios específicos
- [ ] Algoritmo de verificação de disponibilidade
- [ ] Componente de calendário (UI)
- [ ] API pública: `GET /api/availability/slots`
- [ ] API interna: `GET/POST /api/crm/availability`

### Fase 7: Agendamento Self-Service
- [ ] Interface de seleção de dia (calendário)
- [ ] Interface de seleção de horário
- [ ] API pública: `POST /api/meetings/schedule`
- [ ] Validações de agendamento
- [ ] Criação de reunião Teams
- [ ] Emails de confirmação (lead + consultor)

### Fase 8: Tela de Resultado
- [ ] Variante aprovado (A/B) — com botão de agendamento
- [ ] Fluxo completo de agendamento
- [ ] Tela de confirmação
- [ ] Variante nurturing (C/D)
- [ ] Variante descartado (F)

### Fase 9: Admin — Gestão de Mensalidades
- [ ] Listagem de tabelas de mensalidades (ADMIN only)
- [ ] Formulário criar/editar tabela com bullets dinâmicos
- [ ] Ação "Ativar tabela" com confirmação
- [ ] Histórico de tabelas arquivadas
- [ ] Preview: "Como ficará no formulário"

### Fase 10: Gerenciamento de Disponibilidade (SDR/Consultant)
- [ ] Interface de configuração de slots
- [ ] Interface de bloqueios
- [ ] Visualização de reuniões agendadas
- [ ] Edição/cancelamento de reuniões

### Fase 11: Controle de Acesso
- [ ] `lib/permissions.ts` com ROLE_PERMISSIONS completo
- [ ] `lib/lead-scope.ts` — escopo por role
- [ ] `proxy.ts` — proteger rotas internas
- [ ] Guards nas API routes CRM
- [ ] Testes: SDR não vê leads de outros | DIRECTOR não edita | CONSULTANT não avança pipeline

### Fase 12: Analytics
- [ ] Dashboard executivo (ADMIN, DIRECTOR)
- [ ] Dashboard operacional (ADMIN, DIRECTOR, MANAGER)
- [ ] Dashboard SDR (ADMIN, MANAGER, SDR)
- [ ] Métricas de capacidade financeira por grade
- [ ] Métricas de agendamento (taxa conversão, horários mais populares)

---

**Sistema de qualificação ultra-robusto com 87%+ de precisão, agendamento nativo com Microsoft Teams e qualificação financeira baseada em capacidade de arcar com mensalidades dinâmicas — sem cálculo de ROI. 🎯**
