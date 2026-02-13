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
    stores: string;
    revenue: string;
    role: string;
    state: string;
    source: string;
}

const EMPTY_NEW_LEAD: NewLeadForm = {
    name: '',
    email: '',
    whatsapp: '',
    pharmacyName: '',
    stores: '',
    revenue: '',
    role: '',
    state: '',
    source: 'WEBSITE',
};

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
                        onClick={() => setIsModalOpen(true)}
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
                                                className={`flex-1 rounded-xl p-2 overflow-y-auto space-y-3 border transition-colors
                                                    ${snapshot.isDraggingOver ? 'bg-blue-50 border-blue-200' : 'bg-[#f0efef] border-gray-200'}
                                                    ${stage.isWon ? 'bg-green-50/50 border-green-200 border-dashed' : ''}
                                                    ${stage.isLost ? 'bg-gray-50/80 border-gray-200 border-dashed opacity-75' : ''}
                                                `}
                                            >
                                                {stageLeads.map((lead, index) => (
                                                    <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                                        {(dragProvided, dragSnapshot) => (
                                                            <button
                                                                type="button"
                                                                ref={dragProvided.innerRef}
                                                                {...dragProvided.draggableProps}
                                                                {...(canAdvancePipeline ? dragProvided.dragHandleProps : {})}
                                                                style={dragProvided.draggableProps.style}
                                                                onClick={() => {
                                                                    if (!dragSnapshot.isDragging) {
                                                                        router.push(`/dashboard/leads/${lead.id}`);
                                                                    }
                                                                }}
                                                                className={`w-full text-left bg-white p-4 rounded-lg shadow-sm border border-gray-200/60 hover:border-primary/50 ${canAdvancePipeline ? 'cursor-grab' : 'cursor-pointer'} group transition-colors relative
                                                                    ${dragSnapshot.isDragging ? 'shadow-lg rotate-2 scale-105 z-50' : ''}
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

                            <input placeholder="Nome completo" className="w-full p-2 border rounded" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} />
                            <input placeholder="Email" className="w-full p-2 border rounded" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} />
                            <input placeholder="WhatsApp" className="w-full p-2 border rounded" value={newLead.whatsapp} onChange={(e) => setNewLead({ ...newLead, whatsapp: e.target.value })} />
                            <input placeholder="Nome da farmácia" className="w-full p-2 border rounded" value={newLead.pharmacyName} onChange={(e) => setNewLead({ ...newLead, pharmacyName: e.target.value })} />
                            <select className="w-full p-2 border rounded" value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}>
                                {SOURCE_OPTIONS.map((source) => (
                                    <option key={source.value} value={source.value}>{source.label}</option>
                                ))}
                            </select>

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
