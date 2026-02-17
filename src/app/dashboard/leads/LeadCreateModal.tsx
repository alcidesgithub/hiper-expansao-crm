'use client';

import React, { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { createLead } from '../actions';

interface Lead {
    id: string;
    name: string;
    company: string | null;
    score: number;
    grade: string | null;
    pipelineStageId: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    status: string;
}

interface NewLeadForm {
    name: string;
    email: string;
    whatsapp: string;
    pharmacyName: string;
    position: string;
    cargoSub?: string;
    tempoMercado: string;
    stores: string;
    lojasSub?: string;
    revenue: string;
    state: string;
    city: string;
    desafios: string[];
    motivacao: string;
    urgencia: string;
    historicoRedes: string;
    conscienciaInvestimento: string;
    reacaoValores: string;
    capacidadeMarketing: string;
    capacidadeAdmin: string;
    capacidadePagamentoTotal: string;
    compromisso: string;
    source: string;
    priority: string;
    expectedCloseDate: string;
}

interface LeadCreateModalProps {
    onClose: () => void;
    onCreated: (lead: Lead) => void;
}

const EMPTY_NEW_LEAD: NewLeadForm = {
    name: '',
    email: '',
    whatsapp: '',
    pharmacyName: '',
    position: '',
    cargoSub: '',
    tempoMercado: '',
    stores: '1',
    lojasSub: '',
    revenue: '0-50k',
    state: '',
    city: '',
    desafios: [],
    motivacao: '',
    urgencia: 'sem-prazo',
    historicoRedes: 'nunca',
    conscienciaInvestimento: 'quero-conhecer',
    reacaoValores: 'alto-saber-mais',
    capacidadeMarketing: 'planejamento',
    capacidadeAdmin: 'planejamento',
    capacidadePagamentoTotal: 'precisaria-ajustes',
    compromisso: 'curiosidade',
    source: 'PHONE',
    priority: 'MEDIUM',
    expectedCloseDate: '',
};

const CARGOS_OPTIONS = [
    { value: 'proprietario', label: 'Proprietário' },
    { value: 'farmaceutico_rt', label: 'Farmacêutico RT / Sócio' },
    { value: 'gerente_geral', label: 'Gerente Geral' },
    { value: 'gerente_comercial', label: 'Gerente Comercial' },
    { value: 'farmaceutico', label: 'Farmacêutico (não sócio)' },
    { value: 'outro', label: 'Outro' },
];

const TEMPO_OPTIONS = [
    { value: '<1a', label: 'Menos de 1 ano' },
    { value: '1-3a', label: '1 a 3 anos' },
    { value: '3-5a', label: '3 a 5 anos' },
    { value: '5-10a', label: '5 a 10 anos' },
    { value: '10a+', label: 'Mais de 10 anos' },
];

const LOJAS_OPTIONS = [
    { value: '1', label: '1 loja' },
    { value: '2-3', label: '2 a 3 lojas' },
    { value: '4-5', label: '4 a 5 lojas' },
    { value: '6-10', label: '6 a 10 lojas' },
    { value: '11+', label: '11 ou mais lojas' },
];

const FATURAMENTO_OPTIONS = [
    { value: '0-50k', label: 'Até R$ 50k' },
    { value: '50-100k', label: 'R$ 50k - R$ 100k' },
    { value: '100-200k', label: 'R$ 100k - R$ 200k' },
    { value: '200-500k', label: 'R$ 200k - R$ 500k' },
    { value: '500k+', label: 'Acima de R$ 500k' },
];

const MOTIVACAO_OPTIONS = [
    { value: 'poder-compra', label: 'Poder de Compra' },
    { value: 'reduzir-custos', label: 'Reduzir Custos' },
    { value: 'suporte', label: 'Suporte de Gestão' },
    { value: 'marca', label: 'Fortalecer Marca' },
];

const URGENCIA_OPTIONS = [
    { value: 'imediato', label: 'Imediato' },
    { value: 'este-mes', label: 'Este mês' },
    { value: 'proximo-mes', label: 'Próximo mês' },
    { value: 'sem-prazo', label: 'Sem prazo' },
];

const CAPACIDADE_TOTAL_OPTIONS = [
    { value: 'sim-tranquilo', label: 'Sim, tranquilo' },
    { value: 'sim-planejamento', label: 'Sim, com planejamento' },
    { value: 'apertado-possivel', label: 'Apertado, mas possível' },
    { value: 'precisaria-ajustes', label: 'Precisaria de ajustes' },
    { value: 'nao-consigo', label: 'Não consigo agora' },
];

const SOURCE_OPTIONS = [
    { value: 'WEBSITE', label: 'Website' },
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'INSTAGRAM', label: 'Instagram' },
    { value: 'GOOGLE_ADS', label: 'Google Ads' },
    { value: 'LINKEDIN', label: 'LinkedIn' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Telefone' },
    { value: 'REFERRAL', label: 'Indicação' },
    { value: 'EVENT', label: 'Evento' },
    { value: 'OTHER', label: 'Outro' },
] as const;

const UF_OPTIONS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function LeadCreateModal({ onClose, onCreated }: LeadCreateModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [newLead, setNewLead] = useState<NewLeadForm>(EMPTY_NEW_LEAD);

    const handleAddLead = async (event: React.FormEvent) => {
        event.preventDefault();
        setFormError(null);

        if (!newLead.name.trim()) {
            setFormError('Informe o nome do lead.');
            return;
        }

        if (!newLead.email.trim()) {
            setFormError('Informe o email do lead.');
            return;
        }

        setIsSubmitting(true);

        const response = await createLead(newLead);
        if (!response.success || !response.lead) {
            setFormError(response.error || 'Não foi possível criar o lead.');
            setIsSubmitting(false);
            return;
        }

        const createdLead = response.lead as Lead & { pipelineStage?: { id?: string } | null };
        const safeLead: Lead = {
            ...createdLead,
            pipelineStageId: createdLead.pipelineStageId || createdLead.pipelineStage?.id || null,
        };

        setIsSubmitting(false);
        onCreated(safeLead);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Adicionar Novo Lead</h2>
                    <button type="button" onClick={onClose}><X size={24} className="text-gray-400" /></button>
                </div>

                <form onSubmit={handleAddLead} className="p-6 space-y-4">
                    {formError && <div className="rounded-md bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{formError}</div>}

                    <div className="bg-gray-50 -mx-6 -mt-6 p-6 mb-6 border-b border-gray-100">
                        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Informações de Contato
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Nome Completo</label>
                                <input className="w-full p-2 border rounded text-sm" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Email</label>
                                <input className="w-full p-2 border rounded text-sm" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">WhatsApp</label>
                                <input className="w-full p-2 border rounded text-sm" value={newLead.whatsapp} onChange={(e) => setNewLead({ ...newLead, whatsapp: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Empresa/Farmácia</label>
                                <input className="w-full p-2 border rounded text-sm" value={newLead.pharmacyName} onChange={(e) => setNewLead({ ...newLead, pharmacyName: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-700 uppercase flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                Perfil do Decisor
                            </h3>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Cargo</label>
                                    <select className="w-full p-2 border rounded text-sm" value={newLead.position} onChange={(e) => setNewLead({ ...newLead, position: e.target.value })}>
                                        <option value="">Selecione...</option>
                                        {CARGOS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Tempo de Mercado</label>
                                    <select className="w-full p-2 border rounded text-sm" value={newLead.tempoMercado} onChange={(e) => setNewLead({ ...newLead, tempoMercado: e.target.value })}>
                                        {TEMPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-700 uppercase flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                Perfil da Empresa
                            </h3>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Número de Lojas</label>
                                    <select className="w-full p-2 border rounded text-sm" value={newLead.stores} onChange={(e) => setNewLead({ ...newLead, stores: e.target.value })}>
                                        {LOJAS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Faturamento Mensal</label>
                                    <select className="w-full p-2 border rounded text-sm" value={newLead.revenue} onChange={(e) => setNewLead({ ...newLead, revenue: e.target.value })}>
                                        {FATURAMENTO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-2/3 space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Cidade</label>
                                        <input className="w-full p-2 border rounded text-sm" value={newLead.city} onChange={(e) => setNewLead({ ...newLead, city: e.target.value })} />
                                    </div>
                                    <div className="w-1/3 space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">UF</label>
                                        <select className="w-full p-2 border rounded text-sm" value={newLead.state} onChange={(e) => setNewLead({ ...newLead, state: e.target.value })}>
                                            <option value="">UF</option>
                                            {UF_OPTIONS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-700 uppercase flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                Necessidades e Prazos
                            </h3>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Motivação Principal</label>
                                    <select className="w-full p-2 border rounded text-sm" value={newLead.motivacao} onChange={(e) => setNewLead({ ...newLead, motivacao: e.target.value })}>
                                        <option value="">Selecione...</option>
                                        {MOTIVACAO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Urgência</label>
                                    <select className="w-full p-2 border rounded text-sm" value={newLead.urgencia} onChange={(e) => setNewLead({ ...newLead, urgencia: e.target.value })}>
                                        {URGENCIA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Previsão Fechamento</label>
                                    <input type="date" className="w-full p-2 border rounded text-sm" value={newLead.expectedCloseDate} onChange={(e) => setNewLead({ ...newLead, expectedCloseDate: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-4">
                            <h3 className="text-xs font-bold text-gray-700 uppercase flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                Capacidade Financeira e Compromisso
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Capacidade Total Mensal</label>
                                    <select className="w-full p-2 border rounded text-sm" value={newLead.capacidadePagamentoTotal} onChange={(e) => setNewLead({ ...newLead, capacidadePagamentoTotal: e.target.value })}>
                                        {CAPACIDADE_TOTAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Nível de Compromisso</label>
                                    <select className="w-full p-2 border rounded text-sm" value={newLead.compromisso} onChange={(e) => setNewLead({ ...newLead, compromisso: e.target.value })}>
                                        <option value="faz-sentido">Faz total sentido</option>
                                        <option value="interessante">Achei interessante</option>
                                        <option value="curiosidade">Apenas curiosidade</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-700 uppercase flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                Origem e Prioridade Manual
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Origem do Lead</label>
                                    <select className="w-full p-2 border rounded text-sm" value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}>
                                        {SOURCE_OPTIONS.map((source) => (
                                            <option key={source.value} value={source.value}>{source.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-primary text-white rounded flex items-center gap-2 disabled:opacity-60"
                        >
                            {isSubmitting ? 'Salvando...' : 'Criar Lead'}
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
