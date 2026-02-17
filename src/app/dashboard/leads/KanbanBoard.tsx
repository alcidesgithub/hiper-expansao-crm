'use client';

import React, { useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight, Clock, Layout, Plus, X } from 'lucide-react';
import { createLead, updateLeadStage } from '../actions';

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

interface Stage {
    id: string;
    name: string;
    color: string;
    order: number;
    isWon: boolean;
    isLost: boolean;
}

interface KanbanBoardProps {
    initialStages: Stage[];
    initialLeads: Lead[];
    permissions?: {
        canCreateLead?: boolean;
        canAdvancePipeline?: boolean;
    };
}

interface NewLeadForm {
    name: string;
    email: string;
    whatsapp: string;
    pharmacyName: string;
    // Perfil
    position: string;
    cargoSub?: string;
    tempoMercado: string;
    stores: string;
    lojasSub?: string;
    revenue: string;
    // Address
    state: string;
    city: string;
    // Funnel Qual
    desafios: string[];
    motivacao: string;
    urgencia: string;
    historicoRedes: string;
    // Financial
    conscienciaInvestimento: string;
    reacaoValores: string;
    capacidadeMarketing: string;
    capacidadeAdmin: string;
    capacidadePagamentoTotal: string;
    compromisso: string;
    // Metadata
    source: string;
    priority: string;
    expectedCloseDate: string;
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

function formatLeadDate(value: string | Date): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('pt-BR');
}

export default function KanbanBoard({ initialStages, initialLeads, permissions }: KanbanBoardProps) {
    const router = useRouter();
    const canCreateLead = Boolean(permissions?.canCreateLead);
    const canAdvancePipeline = Boolean(permissions?.canAdvancePipeline);

    const [leads, setLeads] = useState<Lead[]>(initialLeads);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [boardError, setBoardError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [newLead, setNewLead] = useState<NewLeadForm>(EMPTY_NEW_LEAD);
    const [isReady, setIsReady] = useState(false);

    React.useEffect(() => {
        setIsReady(true);
    }, []);

    const filteredLeads = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return leads;

        return leads.filter((lead) => {
            const name = lead.name.toLowerCase();
            const company = (lead.company || '').toLowerCase();
            return name.includes(query) || company.includes(query);
        });
    }, [leads, search]);

    const getLeadsForStage = (stageId: string) => filteredLeads.filter((lead) => lead.pipelineStageId === stageId);

    const onDragEnd = async (result: DropResult) => {
        if (!canAdvancePipeline) return;
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        setBoardError(null);
        const previous = leads;

        // Optimismo na atualização da UI
        const next = leads.map((lead) => {
            if (lead.id !== draggableId) return lead;
            return { ...lead, pipelineStageId: destination.droppableId };
        });
        setLeads(next);

        const response = await updateLeadStage(draggableId, destination.droppableId);
        if (!response.success) {
            setLeads(previous);
            setBoardError(response.error || 'Não foi possível mover o lead.');
            return;
        }

        router.refresh();
    };

    if (!isReady) return null;

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

        setLeads((current) => [safeLead, ...current]);
        setNewLead(EMPTY_NEW_LEAD);
        setIsModalOpen(false);
        setIsSubmitting(false);
        router.refresh();
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 font-sans text-slate-800 overflow-hidden">
            <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10 gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white shadow-sm shadow-primary/30">
                        <Layout size={16} fill="currentColor" />
                    </div>
                    <h1 className="text-lg font-semibold tracking-tight text-gray-900 truncate">Pipeline de Expansão</h1>
                    <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block" />
                    <nav className="hidden md:flex items-center text-sm text-gray-500">
                        <span>Vendas</span>
                        <ChevronRight size={14} className="mx-1" />
                        <span className="text-primary font-medium bg-primary/10 px-2 py-0.5 rounded text-xs">Funil Digital</span>
                    </nav>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar lead"
                        className="w-44 md:w-60 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <button
                        className="ml-2 flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => {
                            setNewLead(EMPTY_NEW_LEAD);
                            setIsModalOpen(true);
                        }}
                        disabled={!canCreateLead}
                    >
                        <Plus size={18} />
                        <span>Novo Lead</span>
                    </button>
                </div>
            </header>

            {boardError && (
                <div className="px-6 py-2 text-sm text-red-700 bg-red-50 border-b border-red-100">{boardError}</div>
            )}

            <DragDropContext onDragEnd={onDragEnd}>
                <main className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-50 p-6">
                    <div className="flex h-full gap-4 min-w-max pb-2">
                        {initialStages.map((stage) => {
                            const stageLeads = getLeadsForStage(stage.id);

                            return (
                                <div key={stage.id} className="w-80 flex-shrink-0 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color || '#ccc' }} />
                                            <h3 className="font-semibold text-sm text-gray-700">{stage.name}</h3>
                                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                                                {stageLeads.length}
                                            </span>
                                        </div>
                                    </div>

                                    <Droppable droppableId={stage.id}>
                                        {(provided, snapshot) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className={`flex-1 rounded-xl p-2 overflow-y-auto space-y-3 border transition-all duration-200
                                                    ${snapshot.isDraggingOver ? 'bg-blue-50/50 border-blue-200 ring-4 ring-blue-500/5' : 'bg-[#f0efef] border-gray-200'}
                                                    ${stage.isWon ? 'bg-green-50/50 border-green-200 border-dashed' : ''}
                                                    ${stage.isLost ? 'bg-gray-50/80 border-gray-200 border-dashed opacity-75' : ''}
                                                `}
                                            >
                                                {stageLeads.map((lead, index) => (
                                                    <Draggable key={lead.id} draggableId={lead.id} index={index} isDragDisabled={!canAdvancePipeline}>
                                                        {(dragProvided, dragSnapshot) => (
                                                            <div
                                                                ref={dragProvided.innerRef}
                                                                {...dragProvided.draggableProps}
                                                                {...dragProvided.dragHandleProps}
                                                                style={dragProvided.draggableProps.style}
                                                                className="relative"
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (!dragSnapshot.isDragging) {
                                                                            router.push(`/dashboard/leads/${lead.id}`);
                                                                        }
                                                                    }}
                                                                    className={`w-full text-left bg-white p-4 rounded-lg shadow-sm border transition-all duration-200 group relative
                                                                        ${dragSnapshot.isDragging
                                                                            ? 'shadow-2xl border-primary ring-2 ring-primary/20 rotate-1 scale-[1.02] z-[100] cursor-grabbing'
                                                                            : 'border-gray-200/60 hover:border-primary/50 hover:shadow-md cursor-grab active:cursor-grabbing'
                                                                        }
                                                                        ${!canAdvancePipeline ? 'cursor-pointer active:cursor-pointer' : ''}
                                                                    `}
                                                                >
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        {lead.grade ? (
                                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${lead.grade === 'A' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                                                {lead.score} ({lead.grade})
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-gray-100 text-gray-600">
                                                                                Novo
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <h4 className="font-semibold text-gray-800 mb-0.5">{lead.name}</h4>
                                                                    <p className="text-xs text-gray-500 mb-3 font-medium">{lead.company || 'Empresa não informada'}</p>
                                                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 border-t border-gray-100 pt-3">
                                                                        <Clock size={14} />
                                                                        <span>{formatLeadDate(lead.createdAt)}</span>
                                                                    </div>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}
                    </div>
                </main>
            </DragDropContext>

            {isModalOpen && canCreateLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">Adicionar Novo Lead</h2>
                            <button type="button" onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400" /></button>
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
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">Cancelar</button>
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
            )}
        </div>
    );
}
