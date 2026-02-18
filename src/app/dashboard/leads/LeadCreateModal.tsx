'use client';

import React, { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import {
    LEAD_CAPACIDADE_TOTAL_OPTIONS as CAPACIDADE_TOTAL_OPTIONS,
    LEAD_CARGO_OPTIONS as CARGOS_OPTIONS,
    LEAD_COMPROMISSO_OPTIONS as COMPROMISSO_OPTIONS,
    LEAD_FATURAMENTO_OPTIONS as FATURAMENTO_OPTIONS,
    LEAD_LOJAS_OPTIONS as LOJAS_OPTIONS,
    LEAD_MOTIVACAO_OPTIONS as MOTIVACAO_OPTIONS,
    LEAD_SOURCE_OPTIONS as SOURCE_OPTIONS,
    LEAD_TEMPO_MERCADO_OPTIONS as TEMPO_OPTIONS,
    LEAD_UF_OPTIONS as UF_OPTIONS,
    LEAD_URGENCIA_OPTIONS as URGENCIA_OPTIONS,
} from '@/lib/lead-form-options';

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

export default function LeadCreateModal({ onClose, onCreated }: LeadCreateModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [newLead, setNewLead] = useState<NewLeadForm>(EMPTY_NEW_LEAD);

    const resolveGateProfile = (position: string) => {
        if (['proprietario', 'farmaceutico_rt', 'gerente_geral'].includes(position)) return 'DECISOR';
        if (['gerente_comercial'].includes(position)) return 'INFLUENCIADOR';
        return 'PESQUISADOR';
    };

    const createLeadViaApi = async () => {
        const position = newLead.position.trim();
        const nowIso = new Date().toISOString();
        const hasStep2 = Boolean(position && newLead.tempoMercado && newLead.stores && newLead.revenue);
        const hasStep3 = Boolean(newLead.motivacao || newLead.desafios.length > 0);
        const hasStep5 = Boolean(
            newLead.capacidadePagamentoTotal ||
            newLead.compromisso ||
            newLead.conscienciaInvestimento ||
            newLead.reacaoValores
        );

        const response = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newLead.name.trim(),
                email: newLead.email.trim(),
                phone: newLead.whatsapp.trim() || null,
                company: newLead.pharmacyName.trim() || null,
                position: position || null,
                source: newLead.source,
                priority: newLead.priority,
                expectedCloseDate: newLead.expectedCloseDate || null,
                qualificationData: {
                    isDecisionMaker: ['proprietario', 'farmaceutico_rt', 'gerente_geral'].includes(position),
                    gateProfile: resolveGateProfile(position),
                    nome: newLead.name.trim(),
                    email: newLead.email.trim(),
                    telefone: newLead.whatsapp.trim(),
                    empresa: newLead.pharmacyName.trim(),
                    cargo: position,
                    cargoSub: newLead.cargoSub || '',
                    numeroLojas: newLead.stores,
                    lojasSub: newLead.lojasSub || '',
                    faturamento: newLead.revenue,
                    localizacao: newLead.state,
                    city: newLead.city.trim(),
                    state: newLead.state,
                    tempoMercado: newLead.tempoMercado,
                    desafios: newLead.desafios,
                    motivacao: newLead.motivacao,
                    urgencia: newLead.urgencia,
                    historicoRedes: newLead.historicoRedes,
                    conscienciaInvestimento: newLead.conscienciaInvestimento,
                    reacaoValores: newLead.reacaoValores,
                    capacidadeMarketing: newLead.capacidadeMarketing,
                    capacidadeAdmin: newLead.capacidadeAdmin,
                    capacidadePagamentoTotal: newLead.capacidadePagamentoTotal,
                    compromisso: newLead.compromisso,
                    step2CompletedAt: hasStep2 ? nowIso : null,
                    step3CompletedAt: hasStep3 ? nowIso : null,
                    step5CompletedAt: hasStep5 ? nowIso : null,
                },
            }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return {
                success: false as const,
                error: typeof payload?.error === 'string' ? payload.error : 'Não foi possível criar o lead.',
            };
        }

        return {
            success: true as const,
            lead: payload as Lead & { pipelineStage?: { id?: string } | null },
        };
    };

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

        try {
            const response = await createLeadViaApi();
            if (!response.success || !response.lead) {
                setFormError(response.error || 'Não foi possível criar o lead.');
                return;
            }

            const createdLead = response.lead as Lead & { pipelineStage?: { id?: string } | null };
            const safeLead: Lead = {
                ...createdLead,
                pipelineStageId: createdLead.pipelineStageId || createdLead.pipelineStage?.id || null,
            };

            onCreated(safeLead);
        } catch {
            setFormError('Não foi possível criar o lead.');
        } finally {
            setIsSubmitting(false);
        }
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
                                        {COMPROMISSO_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
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
