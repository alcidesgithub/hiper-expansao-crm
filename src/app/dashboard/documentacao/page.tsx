import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    Calendar,
    CheckCircle2,
    Mail,
    Phone,
    Settings,
    ShieldCheck,
    Users,
} from 'lucide-react';

const ROLE_CARDS = [
    {
        role: 'ADMIN',
        focus: 'Governanca, configuracao e controle de acesso',
        highlights: [
            'Acesso completo aos modulos',
            'Matriz de permissoes',
            'Gestao de usuarios e mensalidades',
        ],
    },
    {
        role: 'DIRECTOR',
        focus: 'Visao executiva e acompanhamento de performance',
        highlights: [
            'Dashboard e relatorios',
            'Leitura ampla de operacao',
            'Apoio a decisao estrategica',
        ],
    },
    {
        role: 'MANAGER',
        focus: 'Atuacao tatico-operacional na carteira e agenda',
        highlights: [
            'Operacao de leads e pipeline',
            'Gestao de agenda comercial',
            'Acompanhamento de gargalos do funil',
        ],
    },
    {
        role: 'CONSULTANT',
        focus: 'Execucao comercial da carteira',
        highlights: [
            'Atendimento e follow-up',
            'Registro de notas e tarefas',
            'Gestao da propria disponibilidade',
        ],
    },
] as const;

const PUBLIC_JOURNEY = [
    'Gate de decisao',
    'Etapa 1: identificacao',
    'Etapa 2: perfil empresarial',
    'Etapa 3: desafios e motivacao',
    'Etapa 4: urgencia e historico',
    'Etapa 5: investimento',
    'Resultado por grade (A/B/C/D/F)',
    'Agendamento para leads aptos',
] as const;

const INTERNAL_MODULES = [
    {
        name: 'Dashboard',
        route: '/dashboard',
        description: 'Metricas gerais, funil, fontes, grades e reunioes futuras.',
        icon: BarChart3,
    },
    {
        name: 'Leads CRM',
        route: '/dashboard/leads',
        description: 'Kanban, detalhe do lead, notas, tarefas e evolucao de etapa.',
        icon: Users,
    },
    {
        name: 'Agenda',
        route: '/dashboard/agenda',
        description: 'Calendario operacional em mes/semana/dia, com criacao e cancelamento.',
        icon: Calendar,
    },
    {
        name: 'Configuracoes',
        route: '/dashboard/config',
        description: 'Scoring, automacoes e configuracao de pipeline.',
        icon: Settings,
    },
] as const;

const BUSINESS_RULES = [
    'Score e grade do lead dependem dos criterios ativos de scoring.',
    'Automacoes podem mover etapa, atribuir responsavel e notificar equipe.',
    'Agendamento publico aceita apenas dias uteis e exige antecedencia minima.',
    'Escopo de visualizacao e edicao depende das permissoes do perfil.',
    'Eventos criticos de operacao ficam registrados em auditoria.',
] as const;

const PLAYBOOK = [
    {
        role: 'Consultor',
        flow: [
            'Monitorar novos leads no Kanban.',
            'Atualizar etapa do pipeline conforme andamento.',
            'Registrar notas e tarefas no detalhe do lead.',
            'Gerenciar agenda de reunioes e proximos passos.',
            'Manter disponibilidade atualizada.',
        ],
    },
    {
        role: 'Gerente',
        flow: [
            'Operar carteira e agenda junto ao time.',
            'Analisar gargalos por etapa do funil.',
            'Priorizar leads por score/grade e urgencia.',
            'Acompanhar indicadores e apoiar execucao.',
            'Ajustar operacao com base em relatorios.',
        ],
    },
    {
        role: 'Admin',
        flow: [
            'Gerenciar usuarios, papeis e permissoes.',
            'Ajustar scoring, automacoes e pipeline.',
            'Configurar tabela ativa de mensalidades.',
            'Garantir consistencia operacional do sistema.',
            'Acompanhar trilhas de auditoria.',
        ],
    },
] as const;

const COMMON_ERRORS = [
    {
        error: 'Credenciais invalidas no login',
        fix: 'Confirmar email/senha e status ACTIVE do usuario.',
    },
    {
        error: 'Sem permissao para acessar tela',
        fix: 'Solicitar ajuste na matriz de permissoes.',
    },
    {
        error: 'Horario indisponivel no agendamento',
        fix: 'Selecionar outro slot valido para o consultor.',
    },
    {
        error: 'Lead ja possui reuniao agendada',
        fix: 'Reagendar ou cancelar a reuniao ativa antes de criar outra.',
    },
    {
        error: 'Falha ao excluir usuario',
        fix: 'Inativar usuario quando houver vinculos operacionais.',
    },
] as const;

const SUPPORT_CONTACTS = [
    { label: 'Telefone', value: '(41) 3330-1300', icon: Phone },
    { label: 'Email', value: 'expansao@redehiperfarma.com.br', icon: Mail },
] as const;

export default function DocumentacaoPage() {
    return (
        <div className="w-full bg-slate-50 min-h-full font-sans text-slate-800 space-y-6">
            <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <BookOpen size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Documentacao do Sistema</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Referencia oficial para usuarios logados do CRM de Expansao.
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                        <p className="text-gray-500">Ambiente publico</p>
                        <p className="font-semibold text-gray-900 mt-1">/funnel/*</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                        <p className="text-gray-500">Ambiente interno</p>
                        <p className="font-semibold text-gray-900 mt-1">/dashboard/*</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                        <p className="text-gray-500">Acesso</p>
                        <p className="font-semibold text-gray-900 mt-1">Usuarios autenticados</p>
                    </div>
                </div>
            </section>

            <section id="perfis" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="text-primary" size={18} />
                    <h2 className="text-lg font-bold text-slate-900">Perfis e responsabilidades</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ROLE_CARDS.map((item) => (
                        <div key={item.role} className="border border-gray-200 rounded-lg p-4 bg-white">
                            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{item.role}</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{item.focus}</p>
                            <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
                                {item.highlights.map((text) => (
                                    <li key={text} className="flex items-start gap-2">
                                        <CheckCircle2 className="text-primary mt-0.5 shrink-0" size={14} />
                                        <span>{text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            <section id="jornada" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="text-primary" size={18} />
                    <h2 className="text-lg font-bold text-slate-900">Jornada publica de qualificacao</h2>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    Fluxo utilizado pelo lead externo antes da entrada na operacao comercial interna.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {PUBLIC_JOURNEY.map((step, index) => (
                        <div key={step} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Passo {index + 1}</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{step}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section id="modulos" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="text-primary" size={18} />
                    <h2 className="text-lg font-bold text-slate-900">Modulos principais do CRM</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {INTERNAL_MODULES.map((module) => {
                        const Icon = module.icon;
                        return (
                            <div key={module.name} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <Icon size={16} className="text-primary" />
                                    <p className="font-semibold text-gray-900">{module.name}</p>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{module.route}</p>
                                <p className="text-sm text-gray-600 mt-2">{module.description}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section id="regras" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Settings className="text-primary" size={18} />
                    <h2 className="text-lg font-bold text-slate-900">Regras de negocio criticas</h2>
                </div>

                <ul className="space-y-2 text-sm text-gray-700">
                    {BUSINESS_RULES.map((rule) => (
                        <li key={rule} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                            {rule}
                        </li>
                    ))}
                </ul>
            </section>

            <section id="fluxos" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="text-primary" size={18} />
                    <h2 className="text-lg font-bold text-slate-900">Fluxo recomendado por perfil</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {PLAYBOOK.map((item) => (
                        <div key={item.role} className="border border-gray-200 rounded-lg p-4">
                            <p className="font-semibold text-gray-900">{item.role}</p>
                            <ol className="mt-3 space-y-2 text-sm text-gray-600">
                                {item.flow.map((step, index) => (
                                    <li key={step} className="flex items-start gap-2">
                                        <span className="text-xs font-semibold text-primary mt-0.5">{index + 1}.</span>
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ))}
                </div>
            </section>

            <section id="erros" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="text-primary" size={18} />
                    <h2 className="text-lg font-bold text-slate-900">Erros comuns e resolucao</h2>
                </div>

                <div className="space-y-3">
                    {COMMON_ERRORS.map((item) => (
                        <div key={item.error} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                            <p className="text-sm font-semibold text-amber-900">{item.error}</p>
                            <p className="text-sm text-amber-800 mt-1">{item.fix}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section id="suporte" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-3">Suporte</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Em caso de duvidas operacionais, use os canais oficiais de atendimento:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SUPPORT_CONTACTS.map((contact) => {
                        const Icon = contact.icon;
                        return (
                            <div key={contact.label} className="border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <Icon size={16} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">{contact.label}</p>
                                    <p className="text-sm font-semibold text-gray-900">{contact.value}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
