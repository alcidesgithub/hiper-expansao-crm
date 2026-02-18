# HiperFarma CRM - Documentacao Completa para Usuarios

## 1. Objetivo deste documento
Este guia explica, de ponta a ponta, como usar o sistema HiperFarma CRM no dia a dia.

Publico-alvo:
- Leads externos (jornada publica de qualificacao e agendamento)
- Equipe interna (Consultor, Gerente, Diretor, Admin)

---

## 2. Visao geral do sistema
O sistema tem dois ambientes principais:

1. Jornada publica de qualificacao (`/funnel/*`)
- Usada por farmacias interessadas em associacao.
- Coleta dados, calcula score/grade e direciona o proximo passo.

2. CRM interno (`/dashboard/*`)
- Usado pela equipe HiperFarma para operar leads, agenda, relatorios e configuracoes.

Atalhos importantes:
- Site institucional: `/`
- Entrada da jornada publica: `/associar` (redireciona para `/funnel/gate`)
- Login interno: `/login`
- Dashboard: `/dashboard`

---

## 3. Perfis e permissoes
As permissoes podem ser customizadas por Admin na tela de matriz de permissoes. Abaixo esta o comportamento padrao.

### 3.1 Perfis padrao
- `ADMIN`: acesso total (operacao, configuracoes, usuarios, permissoes, mensalidades)
- `DIRECTOR`: foco executivo/gestao (leituras amplas e indicadores)
- `MANAGER`: foco tatico-operacional com atuacao em pipeline
- `CONSULTANT`: foco operacional de carteira e agenda

### 3.2 Modulos mais usados por perfil (padrao)
- Dashboard executivo: Admin, Director, Manager
- Leads CRM: todos os perfis internos
- Agenda: todos os perfis internos
- Disponibilidade: Admin e Consultant (por menu)
- Relatorios: Admin, Director, Manager
- Mensalidades: Admin, Director, Manager (leitura; escrita depende da permissao)
- Gestao de usuarios: Admin
- Configuracoes de scoring/automacoes/pipeline: Admin
- Matriz de permissoes: Admin

Observacao importante:
- A matriz de permissoes pode liberar ou restringir funcionalidades alem do menu lateral.

---

## 4. Acesso e autenticacao

## 4.1 Login
Tela: `/login`

Campos:
- E-mail
- Senha

Regras:
- Senha minima: 12 caracteres
- Apenas usuarios com status `ACTIVE` conseguem entrar
- Existe limite de tentativas por IP e por conta (protecao anti-forca-bruta)

Comportamento:
- Credenciais invalidas retornam erro de autenticacao
- Usuario autenticado indo para `/login` e redirecionado para `/dashboard`

Observacao:
- O link "Esqueci minha senha" esta presente na UI, mas nao existe fluxo de recuperacao implementado no sistema atual.

---

## 5. Jornada publica (lead externo)

## 5.1 Gate de decisao (`/funnel/gate`)
Primeiro passo da jornada. O usuario escolhe:
- `Sim, sou decisor`
- `Nao, mas influencio`
- `Nao, estou pesquisando`

Comportamento:
- Decisor segue para o formulario principal
- Influenciador/Pesquisador vai para trilha educativa (`/funnel/educacao?perfil=...`)
- A escolha fica registrada para analytics

## 5.2 Etapa 1 - Identificacao (`/funnel`)
Campos:
- Nome completo
- Email corporativo
- WhatsApp/Telefone
- Nome da farmacia/rede

Regras:
- Validacao de contato
- Criacao do lead no CRM com token de sessao do funil

## 5.3 Etapa 2 - Perfil empresarial (`/funnel/business-info`)
Coleta:
- Cargo/função
- Numero de lojas
- Faturamento
- Localizacao
- Tempo de mercado

## 5.4 Etapa 3 - Desafios e motivacao (`/funnel/desafios`)
Coleta:
- Ate 3 desafios principais
- Motivacao principal

## 5.5 Etapa 4 - Urgencia e historico (`/funnel/urgencia`)
Coleta:
- Prazo de decisao
- Historico com redes associativas

## 5.6 Etapa 5 - Investimento (`/funnel/investimento`)
Fluxo:
- Carrega mensalidades ativas (marketing + administrativa)
- Pergunta consciencia de investimento
- Reacao aos valores
- Capacidade de pagamento (inclusive total)
- Nivel de compromisso

Ao finalizar:
- Sistema calcula score e grade
- Executa regras de automacao
- Define prioridade e etapa de pipeline

## 5.7 Resultado (`/funnel/resultado`)
Saidas por grade:
- Grade `A/B`: aprovado, convite para agendar reuniao
- Grade `C/D`: retorno comercial posterior
- Grade `F`: sem fit no momento

## 5.8 Agendamento publico (`/funnel/calendar`)
Disponivel para leads aptos (A/B) com sessao valida.

Regras de agendamento:
- Somente dias uteis
- Minimo de 2 horas de antecedencia
- Slot precisa estar livre
- Nao pode haver sobreposicao para o consultor
- Nao pode existir outra reuniao ativa para o mesmo lead

Resultado:
- Reuniao criada no CRM
- Integracao com Teams quando configurada
- Emails de confirmacao enviados para lead e consultor

---

## 6. CRM interno (operacao)

## 6.1 Dashboard (`/dashboard`)
Visao consolidada:
- Total de leads, qualificados, convertidos
- Taxa de conversao
- Reunioes pendentes
- Funil por etapa
- Distribuicao por grade
- Fontes de lead
- Analytics do gate (decisor/influenciador/pesquisador)
- Proximas reunioes
- Tabela de leads recentes

Filtro por periodo:
- 7 dias, 30 dias, 90 dias, 12 meses

## 6.2 Leads CRM (`/dashboard/leads`)
Visao Kanban por etapas do pipeline.

Acoes principais:
- Buscar lead por nome/empresa
- Criar lead manual
- Arrastar e soltar entre etapas (se tiver permissao)
- Abrir detalhe do lead

Criacao manual de lead:
- Formulario com dados de contato, perfil, urgencia e capacidade
- Sistema calcula score/grade e posiciona no pipeline

## 6.3 Detalhe do lead (`/dashboard/leads/[id]`)

### Bloco lateral
- Dados principais do lead
- Score e grade
- Acoes rapidas: agendar reuniao, email, ligacao
- Metricas: dias no funil, interacoes, probabilidade

### Pipeline
- Exibe progresso da etapa
- Permite trocar etapa
- Permite marcar como perdido (se permitido)

### Abas
1. `Timeline`
- Atividades e historico de reunioes

2. `Dados da farmacia`
- Visualizacao e edicao de dados cadastrais

3. `Notas`
- Criar nota
- Fixar/desafixar
- Excluir

4. `Tarefas`
- Criar tarefa com prioridade e vencimento
- Atualizar status
- Cancelar

## 6.4 Agenda (`/dashboard/agenda`)
Calendario operacional com modos:
- Mes
- Semana
- Dia

Funcionalidades:
- Filtro por tipo de reuniao (diagnostico, apresentacao, fechamento, follow-up)
- Busca por lead/empresa
- Criar nova reuniao
- Visualizar detalhe da reuniao
- Cancelar reuniao
- Abrir link Teams quando houver

## 6.5 Disponibilidade (`/dashboard/disponibilidade`)
Configura a disponibilidade usada no agendamento publico.

Componentes:
- Slots recorrentes por dia da semana
- Bloqueios especificos (intervalos de data/hora)

Regras:
- Slot inicial deve ser menor que o final
- Nao pode haver sobreposicao de slots no mesmo dia
- Bloqueio exige data inicial < data final

Escopo:
- Consultor: gerencia propria disponibilidade
- Admin: pode gerenciar disponibilidade de consultores

## 6.6 Relatorios (`/dashboard/relatorios`)
Indicadores e analiticos:
- Receita total (leads ganhos)
- Ticket medio
- Taxa de conversao
- Novos leads
- Graficos de volume, origem e funil

Exportacao:
- Exporta CSV com dados de leads no periodo selecionado

## 6.7 Mensalidades (`/dashboard/pricing`)
Gestao de tabelas de investimento do funil publico.

Operacoes:
- Criar tabela
- Editar tabela
- Ativar tabela
- Excluir tabela inativa

Regras criticas:
- Sempre deve existir tabela ativa
- Nao e possivel excluir tabela ativa
- Nao e possivel excluir a unica tabela existente
- Total mensal = marketing + administrativa

## 6.8 Gestao de usuarios (`/dashboard/usuarios`)
Operacoes:
- Listar com filtros (nome/email, status, funcao)
- Criar usuario
- Editar usuario
- Ativar/Inativar
- Excluir (hard delete)

Regras criticas:
- Senha minima: 12 caracteres
- Usuario nao pode desativar/excluir a propria conta
- Nao e possivel remover o ultimo admin ativo
- Exclusao pode falhar se houver registros vinculados (neste caso, inative)

## 6.9 Configuracoes (`/dashboard/config`)

Modulos:
1. Matriz de pontuacao (scoring)
- Define criterios, operadores e pesos

2. Regras de automacao
- Gatilhos por campo/operador/valor
- Acoes: notificar gestor/usuario, mover etapa, atribuir responsavel, adicionar tag

3. Etapas do pipeline
- Adicionar, editar, ordenar, definir ganho/perdido

Regras criticas:
- Pipeline precisa ter pelo menos 2 etapas
- Maximo de uma etapa marcada como ganho e uma como perdido
- Estagios reservados nao podem ser removidos
- Estagios com leads vinculados nao podem ser removidos

## 6.10 Matriz de permissoes (`/dashboard/admin/settings/permissions`)
- Exibe recursos x funcoes
- Permite ligar/desligar permissoes granularmente
- Alteracoes refletem nas proximas requisicoes/autenticacoes

## 6.11 Meu perfil (`/dashboard/profile`)
- Atualiza nome, email, telefone
- Permite troca de senha (minimo 12 caracteres)

---

## 7. Regras de negocio importantes

1. Scoring e grade
- Score dinamico baseado em criterios configurados
- Grade final: `A`, `B`, `C`, `D`, `F`

2. Lead com grade F
- Pode ser marcado como sem fit/perdido

3. Escopo de visualizacao de leads
- Controlado por permissoes (todos vs carteira propria)

4. Auditoria
- Acoes criticas geram logs de auditoria (usuarios, reunioes, gate, etc.)

5. Integracao Teams
- Reunioes podem ser criadas/canceladas no Teams quando integrado

---

## 8. Fluxo operacional recomendado por perfil

## 8.1 Consultor
1. Acompanhar novos leads no Kanban
2. Atualizar etapa do pipeline
3. Registrar notas e tarefas no detalhe do lead
4. Gerenciar agenda e concluir reunioes
5. Manter disponibilidade atualizada

## 8.2 Gerente/Diretor
1. Monitorar dashboard e relatorios
2. Acompanhar gargalos do funil
3. Revisar desempenho por origem e grade
4. Ajustar operacao comercial

## 8.3 Admin
1. Gerenciar usuarios e acessos
2. Ajustar scoring, automacoes e pipeline
3. Atualizar mensalidades ativas
4. Manter matriz de permissoes alinhada a politica interna

---

## 9. Erros comuns e como resolver

1. "Invalid credentials" no login
- Verifique email/senha
- Confirme se usuario esta `ACTIVE`
- Verifique bloqueio temporario por excesso de tentativas

2. "Sem permissao" ao abrir tela
- Perfil nao possui permissao necessaria
- Solicite ajuste na matriz de permissoes

3. "Horario indisponivel" no agendamento
- Slot ja foi ocupado, bloqueado ou fora das regras
- Tente outro horario

4. "Este lead ja possui reuniao agendada"
- Existe reuniao ativa para o mesmo lead
- Reagende/cancele a reuniao atual antes de criar outra

5. Falha ao excluir usuario
- Usuario possui vinculos (leads, atividades, etc.)
- Inative em vez de excluir

6. Nao consigo desativar/excluir tabela de preco
- Pode ser a unica tabela ativa/existente
- Ative outra antes

---

## 10. Glossario rapido
- `Lead`: farmacia/oportunidade em avaliacao
- `Pipeline`: etapas comerciais do lead
- `Score`: pontuacao numerica da qualificacao
- `Grade`: classificacao final (A a F)
- `Slot`: horario disponivel de atendimento
- `Bloqueio`: indisponibilidade pontual de agenda
- `Automacao`: regra que reage a condicoes e executa acao

---

## 11. Contatos de apoio (canal publico)
Conforme site institucional:
- Telefone: `(41) 3330-1300`
- Email: `expansao@redehiperfarma.com.br`
- WhatsApp comercial: botao "Falar com Expansao" na landing page
