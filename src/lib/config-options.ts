export type ConfigFieldType = 'number' | 'string' | 'enum' | 'date' | 'boolean';

export interface SelectOption {
    value: string;
    label: string;
}

export interface ConfigFieldOption {
    key: string;
    label: string;
    type: ConfigFieldType;
    source: 'lead' | 'qualification' | 'system';
    options?: SelectOption[];
}

export interface DefaultScoringCriterion {
    id: string;
    name: string;
    subtitle: string;
    category: 'PROFILE' | 'FINANCIAL' | 'BEHAVIOR';
    fieldKey: string;
    operator: string;
    expectedValue: string;
    value: number;
    min: number;
    max: number;
}

export interface DefaultAutomationRule {
    id: string;
    name: string;
    enabled: boolean;
    triggerField: string;
    operator: string;
    triggerValue: string;
    actionType: string;
    actionTarget: string;
}

export interface DefaultPipelineStageLike {
    id: string;
    name: string;
    order: number;
    isWon: boolean;
    isLost: boolean;
}

const LEAD_GRADE_OPTIONS: SelectOption[] = [
    { value: 'A', label: 'Grade A' },
    { value: 'B', label: 'Grade B' },
    { value: 'C', label: 'Grade C' },
    { value: 'D', label: 'Grade D' },
    { value: 'F', label: 'Grade F' },
];

const LEAD_STATUS_OPTIONS: SelectOption[] = [
    { value: 'NEW', label: 'Novo' },
    { value: 'CONTACTED', label: 'Contato iniciado' },
    { value: 'QUALIFIED', label: 'Qualificado' },
    { value: 'PROPOSAL', label: 'Proposta' },
    { value: 'NEGOTIATION', label: 'Negociacao' },
    { value: 'WON', label: 'Ganho' },
    { value: 'LOST', label: 'Perdido' },
    { value: 'ARCHIVED', label: 'Arquivado' },
];

const LEAD_PRIORITY_OPTIONS: SelectOption[] = [
    { value: 'LOW', label: 'Baixa' },
    { value: 'MEDIUM', label: 'Media' },
    { value: 'HIGH', label: 'Alta' },
    { value: 'URGENT', label: 'Urgente' },
];

const GATE_PROFILE_OPTIONS: SelectOption[] = [
    { value: 'DECISOR', label: 'Decisor' },
    { value: 'INFLUENCIADOR', label: 'Influenciador' },
    { value: 'PESQUISADOR', label: 'Pesquisador' },
];

const CARGO_OPTIONS: SelectOption[] = [
    { value: 'proprietario', label: 'Proprietario/Socio' },
    { value: 'farmaceutico_rt', label: 'Farmaceutico RT' },
    { value: 'gerente_geral', label: 'Gerente geral' },
    { value: 'gerente_comercial', label: 'Gerente comercial' },
    { value: 'farmaceutico', label: 'Farmaceutico' },
    { value: 'outro', label: 'Outro' },
];

const LOJAS_OPTIONS: SelectOption[] = [
    { value: '0', label: 'Ainda nao possui loja' },
    { value: '1', label: '1 loja' },
    { value: '2-3', label: '2 a 3 lojas' },
    { value: '4-5', label: '4 a 5 lojas' },
    { value: '6-10', label: '6 a 10 lojas' },
    { value: '11+', label: '11 ou mais lojas' },
];

const FATURAMENTO_OPTIONS: SelectOption[] = [
    { value: '0-50k', label: 'Ate R$ 50 mil' },
    { value: '50-100k', label: 'R$ 50 mil a R$ 100 mil' },
    { value: '100-200k', label: 'R$ 100 mil a R$ 200 mil' },
    { value: '200-500k', label: 'R$ 200 mil a R$ 500 mil' },
    { value: '500k+', label: 'Acima de R$ 500 mil' },
    { value: 'nao-informar', label: 'Nao informar' },
];

const LOCALIZACAO_OPTIONS: SelectOption[] = [
    { value: 'PR', label: 'Parana' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'Sao Paulo' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'outros', label: 'Outros estados' },
];

const URGENCIA_OPTIONS: SelectOption[] = [
    { value: 'imediato', label: 'Imediato' },
    { value: 'este-mes', label: 'Este mes' },
    { value: 'proximo-mes', label: 'Proximo mes' },
    { value: '2-3-meses', label: 'Em 2-3 meses' },
    { value: '4-6-meses', label: 'Em 4-6 meses' },
    { value: 'sem-prazo', label: 'Sem prazo' },
];

const HISTORICO_OPTIONS: SelectOption[] = [
    { value: 'nunca', label: 'Nunca participou' },
    { value: 'conheco', label: 'Conhece o modelo' },
    { value: 'ja-participei', label: 'Ja participou' },
    { value: 'atualmente', label: 'Participa atualmente' },
];

const CAPACIDADE_TOTAL_OPTIONS: SelectOption[] = [
    { value: 'sim-tranquilo', label: 'Consegue tranquilamente' },
    { value: 'sim-planejamento', label: 'Consegue com planejamento' },
    { value: 'apertado-possivel', label: 'Apertado, mas possivel' },
    { value: 'precisaria-ajustes', label: 'Precisa de ajustes' },
    { value: 'dificil-agora', label: 'Dificil agora' },
    { value: 'nao-consigo', label: 'Nao consegue' },
];

const COMPROMISSO_OPTIONS: SelectOption[] = [
    { value: 'faz-sentido', label: 'Faz sentido avancar' },
    { value: 'interessante', label: 'Interessante' },
    { value: 'curiosidade', label: 'Apenas curiosidade' },
    { value: 'duvidas', label: 'Com duvidas' },
    { value: 'nao-momento', label: 'Nao e o momento' },
];

export const SCORING_FIELD_OPTIONS: ConfigFieldOption[] = [
    { key: 'qualificationData.gateProfile', label: 'Gate: perfil no pre-filtro', type: 'enum', source: 'qualification', options: GATE_PROFILE_OPTIONS },
    { key: 'qualificationData.step2CompletedAt', label: 'Etapa 2 concluida', type: 'date', source: 'qualification' },
    { key: 'qualificationData.cargo', label: 'Cargo no negocio', type: 'enum', source: 'qualification', options: CARGO_OPTIONS },
    { key: 'qualificationData.numeroLojas', label: 'Numero de lojas', type: 'enum', source: 'qualification', options: LOJAS_OPTIONS },
    { key: 'qualificationData.faturamento', label: 'Faturamento mensal por loja', type: 'enum', source: 'qualification', options: FATURAMENTO_OPTIONS },
    { key: 'qualificationData.localizacao', label: 'Estado principal', type: 'enum', source: 'qualification', options: LOCALIZACAO_OPTIONS },
    { key: 'qualificationData.step3CompletedAt', label: 'Etapa 3 concluida', type: 'date', source: 'qualification' },
    { key: 'qualificationData.urgencia', label: 'Urgencia de associacao', type: 'enum', source: 'qualification', options: URGENCIA_OPTIONS },
    { key: 'qualificationData.historicoRedes', label: 'Historico com redes', type: 'enum', source: 'qualification', options: HISTORICO_OPTIONS },
    { key: 'qualificationData.capacidadePagamentoTotal', label: 'Capacidade de pagamento total', type: 'enum', source: 'qualification', options: CAPACIDADE_TOTAL_OPTIONS },
    { key: 'qualificationData.compromisso', label: 'Compromisso declarado', type: 'enum', source: 'qualification', options: COMPROMISSO_OPTIONS },
    { key: 'qualificationData.step5CompletedAt', label: 'Etapa 5 concluida', type: 'date', source: 'qualification' },
    { key: 'score', label: 'Score do lead', type: 'number', source: 'lead' },
    { key: 'grade', label: 'Grade do lead', type: 'enum', source: 'lead', options: LEAD_GRADE_OPTIONS },
    { key: 'status', label: 'Status do lead', type: 'enum', source: 'lead', options: LEAD_STATUS_OPTIONS },
    { key: 'priority', label: 'Prioridade do lead', type: 'enum', source: 'lead', options: LEAD_PRIORITY_OPTIONS },
];

export const AUTOMATION_TRIGGER_FIELD_OPTIONS: ConfigFieldOption[] = [
    { key: 'score', label: 'Score do lead', type: 'number', source: 'lead' },
    { key: 'grade', label: 'Grade do lead', type: 'enum', source: 'lead', options: LEAD_GRADE_OPTIONS },
    { key: 'status', label: 'Status do lead', type: 'enum', source: 'lead', options: LEAD_STATUS_OPTIONS },
    { key: 'priority', label: 'Prioridade do lead', type: 'enum', source: 'lead', options: LEAD_PRIORITY_OPTIONS },
    { key: 'qualificationData.gateProfile', label: 'Gate: perfil no pre-filtro', type: 'enum', source: 'qualification', options: GATE_PROFILE_OPTIONS },
    { key: 'qualificationData.cargo', label: 'Cargo no negocio', type: 'enum', source: 'qualification', options: CARGO_OPTIONS },
    { key: 'qualificationData.urgencia', label: 'Urgencia de associacao', type: 'enum', source: 'qualification', options: URGENCIA_OPTIONS },
    { key: 'qualificationData.capacidadePagamentoTotal', label: 'Capacidade de pagamento total', type: 'enum', source: 'qualification', options: CAPACIDADE_TOTAL_OPTIONS },
    { key: 'qualificationData.step5CompletedAt', label: 'Etapa 5 concluida', type: 'date', source: 'qualification' },
];

export const SCORING_OPERATORS: SelectOption[] = [
    { value: 'exists', label: 'Existe' },
    { value: 'not_exists', label: 'Nao existe' },
    { value: '=', label: 'Igual a' },
    { value: '!=', label: 'Diferente de' },
    { value: 'contains', label: 'Contem' },
    { value: 'in', label: 'Em lista (a,b,c)' },
    { value: 'not_in', label: 'Nao esta na lista' },
    { value: '>', label: 'Maior que' },
    { value: '>=', label: 'Maior ou igual' },
    { value: '<', label: 'Menor que' },
    { value: '<=', label: 'Menor ou igual' },
];

export const AUTOMATION_OPERATORS: SelectOption[] = SCORING_OPERATORS;

export const AUTOMATION_ACTION_TYPES: SelectOption[] = [
    { value: 'notify_manager', label: 'Notificar gestor' },
    { value: 'notify_user', label: 'Notificar usuario' },
    { value: 'move_stage', label: 'Mover para estagio' },
    { value: 'assign_user', label: 'Atribuir responsavel' },
    { value: 'add_tag', label: 'Adicionar tag' },
];

export const DEFAULT_SCORING_CRITERIA: DefaultScoringCriterion[] = [
    {
        id: 'gate-decisor',
        name: 'Gate aprovado como decisor',
        subtitle: 'Alinhado ao gate de pre-qualificacao',
        category: 'PROFILE',
        fieldKey: 'qualificationData.gateProfile',
        operator: '=',
        expectedValue: 'DECISOR',
        value: 10,
        min: 0,
        max: 20,
    },
    {
        id: 'perfil-cargo-decisor',
        name: 'Cargo com poder de decisao',
        subtitle: 'Proprietario, RT ou gerente geral',
        category: 'PROFILE',
        fieldKey: 'qualificationData.cargo',
        operator: 'in',
        expectedValue: 'proprietario,farmaceutico_rt,gerente_geral',
        value: 15,
        min: 0,
        max: 25,
    },
    {
        id: 'perfil-escala-lojas',
        name: 'Perfil de escala de lojas',
        subtitle: 'Duas ou mais unidades',
        category: 'PROFILE',
        fieldKey: 'qualificationData.numeroLojas',
        operator: 'in',
        expectedValue: '2-3,4-5,6-10,11+',
        value: 10,
        min: 0,
        max: 20,
    },
    {
        id: 'financeiro-faturamento-fit',
        name: 'Faturamento aderente ao modelo',
        subtitle: 'Faixas a partir de 100k',
        category: 'FINANCIAL',
        fieldKey: 'qualificationData.faturamento',
        operator: 'in',
        expectedValue: '100-200k,200-500k,500k+',
        value: 10,
        min: 0,
        max: 20,
    },
    {
        id: 'financeiro-capacidade-total',
        name: 'Capacidade de pagar mensalidades',
        subtitle: 'Etapa 5 - pagamento total',
        category: 'FINANCIAL',
        fieldKey: 'qualificationData.capacidadePagamentoTotal',
        operator: 'in',
        expectedValue: 'sim-tranquilo,sim-planejamento,apertado-possivel',
        value: 20,
        min: 0,
        max: 30,
    },
    {
        id: 'comportamento-etapa3',
        name: 'Avanco na etapa de desafios',
        subtitle: 'Lead concluiu etapa 3',
        category: 'BEHAVIOR',
        fieldKey: 'qualificationData.step3CompletedAt',
        operator: 'exists',
        expectedValue: '',
        value: 8,
        min: 0,
        max: 15,
    },
    {
        id: 'comportamento-urgencia',
        name: 'Urgencia comercial alta',
        subtitle: 'Timing de curto prazo',
        category: 'BEHAVIOR',
        fieldKey: 'qualificationData.urgencia',
        operator: 'in',
        expectedValue: 'imediato,este-mes,proximo-mes',
        value: 12,
        min: 0,
        max: 20,
    },
    {
        id: 'comportamento-historico',
        name: 'Historico favoravel com redes',
        subtitle: 'Conhecimento previo do modelo',
        category: 'BEHAVIOR',
        fieldKey: 'qualificationData.historicoRedes',
        operator: 'in',
        expectedValue: 'nunca,conheco,ja-participei',
        value: 7,
        min: 0,
        max: 15,
    },
    {
        id: 'comportamento-compromisso',
        name: 'Compromisso declarado no fechamento',
        subtitle: 'Etapa final de qualificacao',
        category: 'BEHAVIOR',
        fieldKey: 'qualificationData.compromisso',
        operator: 'in',
        expectedValue: 'faz-sentido,interessante',
        value: 13,
        min: 0,
        max: 20,
    },
    {
        id: 'comportamento-etapa5',
        name: 'Formulario completo',
        subtitle: 'Etapa 5 concluida',
        category: 'BEHAVIOR',
        fieldKey: 'qualificationData.step5CompletedAt',
        operator: 'exists',
        expectedValue: '',
        value: 10,
        min: 0,
        max: 20,
    },
];

function getFirstOpenStage(stages: DefaultPipelineStageLike[]): DefaultPipelineStageLike | null {
    return stages.find((stage) => !stage.isWon && !stage.isLost) || null;
}

function getSecondOpenStage(stages: DefaultPipelineStageLike[]): DefaultPipelineStageLike | null {
    const openStages = stages.filter((stage) => !stage.isWon && !stage.isLost).sort((a, b) => a.order - b.order);
    return openStages[1] || openStages[0] || null;
}

function getLostStage(stages: DefaultPipelineStageLike[]): DefaultPipelineStageLike | null {
    return stages.find((stage) => stage.isLost) || null;
}

export function buildDefaultAutomationRules(stages: DefaultPipelineStageLike[]): DefaultAutomationRule[] {
    const firstOpenStage = getFirstOpenStage(stages);
    const secondOpenStage = getSecondOpenStage(stages);
    const lostStage = getLostStage(stages);

    return [
        {
            id: 'notify-grade-a',
            name: 'Notificar gestor para Grade A',
            enabled: true,
            triggerField: 'grade',
            operator: '=',
            triggerValue: 'A',
            actionType: 'notify_manager',
            actionTarget: 'all_managers',
        },
        {
            id: 'advance-high-score',
            name: 'Avancar lead de alto score',
            enabled: true,
            triggerField: 'score',
            operator: '>=',
            triggerValue: '70',
            actionType: 'move_stage',
            actionTarget: secondOpenStage?.id || firstOpenStage?.id || '',
        },
        {
            id: 'discard-sem-fit',
            name: 'Mover sem fit para perdido',
            enabled: true,
            triggerField: 'grade',
            operator: '=',
            triggerValue: 'F',
            actionType: 'move_stage',
            actionTarget: lostStage?.id || '',
        },
    ];
}
