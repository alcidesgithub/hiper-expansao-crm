'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronRight, Clock, Layout, Plus } from 'lucide-react';

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

const LeadCreateModal = dynamic(() => import('./LeadCreateModal'));

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
    const [search, setSearch] = useState('');
    const [boardError, setBoardError] = useState<string | null>(null);
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

    const updateLeadStageViaApi = async (leadId: string, pipelineStageId: string) => {
        try {
            const response = await fetch(`/api/leads/${leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pipelineStageId }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                return {
                    success: false as const,
                    error: typeof payload?.error === 'string' ? payload.error : 'Não foi possível mover o lead.',
                };
            }

            return { success: true as const };
        } catch {
            return { success: false as const, error: 'Não foi possível mover o lead.' };
        }
    };

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

        const response = await updateLeadStageViaApi(draggableId, destination.droppableId);
        if (!response.success) {
            setLeads(previous);
            setBoardError(response.error || 'Não foi possível mover o lead.');
            return;
        }

        router.refresh();
    };

    if (!isReady) return null;

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
                                                className={`flex-1 rounded-xl p-2 overflow-y-auto space-y-3 border transition-all duration-200
                                                    ${snapshot.isDraggingOver ? 'bg-blue-50/50 border-blue-200 ring-4 ring-blue-500/5' : 'bg-[#f0efef] border-gray-200'}
                                                    ${stage.isWon ? 'bg-green-50/50 border-green-200 border-dashed' : ''}
                                                    ${stage.isLost ? 'bg-gray-50/80 border-gray-200 border-dashed opacity-75' : ''}
                                                `}
                                            >
                                                {stageLeads.map((lead, index) => {
                                                    const isSlaBreached = lead.grade === 'A' && !stage.isWon && !stage.isLost && (Date.now() - new Date(lead.updatedAt || lead.createdAt).getTime()) / (1000 * 60 * 60) > 4;
                                                    return (
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
                                                                                : isSlaBreached
                                                                                    ? 'border-red-400 hover:border-red-500 hover:shadow-md cursor-grab active:cursor-grabbing ring-1 ring-red-400/50 bg-red-50/10'
                                                                                    : 'border-gray-200/60 hover:border-primary/50 hover:shadow-md cursor-grab active:cursor-grabbing'
                                                                            }
                                                                        ${!canAdvancePipeline ? 'cursor-pointer active:cursor-pointer' : ''}
                                                                    `}
                                                                    >
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            {lead.grade ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${lead.grade === 'A' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                                                        {lead.score} ({lead.grade})
                                                                                    </span>
                                                                                    {isSlaBreached && (
                                                                                        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-red-100/80 text-red-800 animate-pulse border border-red-200" title="SLA: Sem ação há mais de 4 horas">
                                                                                            <AlertTriangle size={10} /> Atrasado
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-gray-100 text-gray-600">
                                                                                    Novo
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <h4 className="font-semibold text-gray-800 mb-0.5">{lead.name}</h4>
                                                                        <p className="text-xs text-gray-500 mb-3 font-medium">{lead.company || 'Empresa não informada'}</p>
                                                                        <div className={`flex items-center gap-1.5 text-xs border-t pt-3 ${isSlaBreached ? 'text-red-500 border-red-100' : 'text-gray-400 border-gray-100'}`}>
                                                                            <Clock size={14} />
                                                                            <span>{formatLeadDate(lead.createdAt)}</span>
                                                                        </div>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    )
                                                })}
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
                <LeadCreateModal
                    onClose={() => setIsModalOpen(false)}
                    onCreated={(newLead) => {
                        setLeads((current) => [newLead, ...current]);
                        setIsModalOpen(false);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
