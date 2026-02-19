export interface LeadFormOption {
    value: string;
    label: string;
}

export const LEAD_CARGO_OPTIONS: LeadFormOption[] = [
    { value: 'proprietario', label: 'Proprietario' },
    { value: 'farmaceutico_rt', label: 'Farmaceutico RT / Socio' },
    { value: 'gerente_geral', label: 'Gerente Geral' },
    { value: 'gerente_comercial', label: 'Gerente Comercial' },
    { value: 'farmaceutico', label: 'Farmaceutico (nao socio)' },
    { value: 'outro', label: 'Outro' },
];

export const LEAD_TEMPO_MERCADO_OPTIONS: LeadFormOption[] = [
    { value: '<1a', label: 'Menos de 1 ano' },
    { value: '1-3a', label: '1 a 3 anos' },
    { value: '3-5a', label: '3 a 5 anos' },
    { value: '5-10a', label: '5 a 10 anos' },
    { value: '10a+', label: 'Mais de 10 anos' },
];

export const LEAD_LOJAS_OPTIONS: LeadFormOption[] = [
    { value: '0', label: 'Nenhuma (ainda vai abrir)' },
    { value: '1', label: '1 loja' },
    { value: '2-3', label: '2 a 3 lojas' },
    { value: '4-5', label: '4 a 5 lojas' },
    { value: '6-10', label: '6 a 10 lojas' },
    { value: '11+', label: '11 ou mais lojas' },
];

export const LEAD_FATURAMENTO_OPTIONS: LeadFormOption[] = [
    { value: '0-50k', label: 'Ate R$ 50k' },
    { value: '50-100k', label: 'R$ 50k - R$ 100k' },
    { value: '100-200k', label: 'R$ 100k - R$ 200k' },
    { value: '200-500k', label: 'R$ 200k - R$ 500k' },
    { value: '500k+', label: 'Acima de R$ 500k' },
    { value: 'nao-informar', label: 'Prefiro nao informar' },
];

export const LEAD_MOTIVACAO_OPTIONS: LeadFormOption[] = [
    { value: 'poder-compra', label: 'Poder de Compra' },
    { value: 'reduzir-custos', label: 'Reduzir Custos' },
    { value: 'suporte', label: 'Suporte de Gestao' },
    { value: 'marca', label: 'Fortalecer Marca' },
    { value: 'networking', label: 'Networking' },
    { value: 'pesquisando', label: 'So pesquisando' },
    { value: 'nao-sei', label: 'Ainda nao sabe' },
];

export const LEAD_URGENCIA_OPTIONS: LeadFormOption[] = [
    { value: 'imediato', label: 'Imediato' },
    { value: 'este-mes', label: 'Este mes' },
    { value: 'proximo-mes', label: 'Proximo mes' },
    { value: '2-3-meses', label: 'Em 2-3 meses' },
    { value: '4-6-meses', label: 'Em 4-6 meses' },
    { value: 'sem-prazo', label: 'Sem prazo' },
];

export const LEAD_CAPACIDADE_TOTAL_OPTIONS: LeadFormOption[] = [
    { value: 'sim-tranquilo', label: 'Sim, tranquilo' },
    { value: 'sim-planejamento', label: 'Sim, com planejamento' },
    { value: 'apertado-possivel', label: 'Apertado, mas possivel' },
    { value: 'precisaria-ajustes', label: 'Precisaria de ajustes' },
    { value: 'dificil-agora', label: 'Dificil no momento' },
    { value: 'nao-consigo', label: 'Nao consigo agora' },
];

export const LEAD_COMPROMISSO_OPTIONS: LeadFormOption[] = [
    { value: 'faz-sentido', label: 'Faz total sentido' },
    { value: 'interessante', label: 'Achei interessante' },
    { value: 'curiosidade', label: 'Apenas curiosidade' },
    { value: 'duvidas', label: 'Ainda com duvidas' },
    { value: 'nao-momento', label: 'Nao e o momento' },
];

export const LEAD_PRIORITY_OPTIONS: LeadFormOption[] = [
    { value: 'LOW', label: 'Baixa' },
    { value: 'MEDIUM', label: 'Media' },
    { value: 'HIGH', label: 'Alta' },
    { value: 'URGENT', label: 'Urgente' },
];

export const LEAD_SOURCE_OPTIONS: LeadFormOption[] = [
    { value: 'WEBSITE', label: 'Website' },
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'INSTAGRAM', label: 'Instagram' },
    { value: 'GOOGLE_ADS', label: 'Google Ads' },
    { value: 'LINKEDIN', label: 'LinkedIn' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Telefone' },
    { value: 'REFERRAL', label: 'Indicacao' },
    { value: 'EVENT', label: 'Evento' },
    { value: 'OTHER', label: 'Outro' },
];

export const LEAD_UF_OPTIONS: string[] = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO', 'outros',
];

export function getOptionLabel(options: LeadFormOption[], value: string | null | undefined): string {
    if (!value) return '-';
    const option = options.find((item) => item.value === value);
    return option?.label || value;
}
