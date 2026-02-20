import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    Calendar,
    CheckCircle2,
    Settings,
    ShieldCheck,
    Users,
    LayoutDashboard,
    UserCog,
    Clock,
    PieChart,
} from 'lucide-react';

const ROLE_CARDS = [
    {
        role: 'ADMIN',
        focus: 'Governança, configuração e controle de acesso',
        highlights: [
            'Acesso completo aos modulos',
            'Matriz de permissoes',
            'Gestao de usuarios e mensalidades',
        ],
    },
    {
        role: 'DIRECTOR',
        focus: 'Visão executiva e acompanhamento de performance',
        highlights: [
            'Dashboard e relatorios',
            'Leitura ampla de operacao',
            'Apoio à decisão estratégica',
        ],
    },
    {
        role: 'MANAGER',
        focus: 'Atuação tático-operacional na carteira e agenda',
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
    'Gate de decisão',
    'Etapa 1: identificação',
    'Etapa 2: perfil empresarial',
    'Etapa 3: desafios e motivação',
    'Etapa 4: urgência e histórico',
    'Etapa 5: investimento',
    'Resultado por grade (A a F)',
    'Agendamento para leads aptos',
] as const;

const INTERNAL_MODULES = [
    {
        name: 'Dashboard',
        route: '/dashboard',
        description: 'Métricas gerais, funil, fontes, grades e reuniões futuras.',
        icon: LayoutDashboard,
    },
    {
        name: 'Leads CRM',
        route: '/dashboard/leads',
        description: 'Kanban, detalhe do lead, notas, tarefas e evolução de etapa.',
        icon: Users,
    },
    {
        name: 'Agenda',
        route: '/dashboard/agenda',
        description: 'Calendário operacional em mês/semana/dia, com criação e cancelamento.',
        icon: Calendar,
    },
    {
        name: 'Disponibilidade',
        route: '/dashboard/disponibilidade',
        description: 'Gestão de horários de atendimento dos consultores.',
        icon: Clock,
    },
    {
        name: 'Relatórios',
        route: '/dashboard/relatorios',
        description: 'Análise detalhada de performance, conversão e SLA.',
        icon: PieChart,
    },
    {
        name: 'Gestão de Usuários',
        route: '/dashboard/usuarios',
        description: 'Criação, edição e inativação de contas de acesso.',
        icon: UserCog,
    },
    {
        name: 'Configurações',
        route: '/dashboard/config',
        description: 'Scoring, automações, pipeline, mensalidades e matriz de permissões.',
        icon: Settings,
    },
] as const;

const BUSINESS_RULES = [
    'Score e grade do lead dependem dos critérios ativos de scoring.',
    'Automações podem mover etapa, atribuir responsável e notificar equipe.',
    'Agendamento público aceita apenas dias úteis e exige antecedência mínima.',
    'Escopo de visualização e edição depende das permissões do perfil.',
    'Eventos críticos de operação ficam registrados em auditoria.',
] as const;

const PLAYBOOK = [
    {
        role: 'Consultor',
        flow: [
            'Monitorar novos leads no Kanban.',
            'Atualizar etapa do pipeline conforme o andamento.',
            'Registrar notas e tarefas no detalhe do lead.',
            'Gerenciar agenda de reuniões e próximos passos.',
            'Manter disponibilidade atualizada.',
        ],
    },
    {
        role: 'Gerente',
        flow: [
            'Operar carteira e agenda junto ao time.',
            'Analisar gargalos por etapa do funil.',
            'Priorizar leads por score/grade e urgência.',
            'Acompanhar indicadores e apoiar execucao.',
            'Ajustar operação com base em relatórios.',
        ],
    },
    {
        role: 'Admin',
        flow: [
            'Gerenciar usuários, papéis e permissões.',
            'Ajustar scoring, automacoes e pipeline.',
            'Configurar tabela ativa de mensalidades.',
            'Garantir consistência operacional do sistema.',
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
        error: 'Sem permissão para acessar tela',
        fix: 'Solicitar ajuste na matriz de permissões.',
    },
    {
        error: 'Horário indisponível no agendamento',
        fix: 'Selecionar outro slot valido para o consultor.',
    },
    {
        error: 'Lead já possui reunião agendada',
        fix: 'Reagendar ou cancelar a reunião ativa antes de criar outra.',
    },
    {
        error: 'Falha ao excluir usuário',
        fix: 'Inativar usuário quando houver vínculos operacionais.',
    },
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
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Documentação do Sistema</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Referência oficial para usuários logados do CRM de Expansão.
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
                    <h2 className="text-lg font-bold text-slate-900">Perfis e Responsabilidades</h2>
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
                    <h2 className="text-lg font-bold text-slate-900">Jornada Pública de Qualificação</h2>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    Fluxo utilizado pelo lead externo antes da entrada na operação comercial interna.
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
                    <h2 className="text-lg font-bold text-slate-900">Módulos Principais do CRM</h2>
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
                    <h2 className="text-lg font-bold text-slate-900">Regras de Negócio Críticas</h2>
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
                    <h2 className="text-lg font-bold text-slate-900">Fluxo Recomendado por Perfil</h2>
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
                    <h2 className="text-lg font-bold text-slate-900">Erros Comuns e Resolução</h2>
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
        </div>
    );
}
