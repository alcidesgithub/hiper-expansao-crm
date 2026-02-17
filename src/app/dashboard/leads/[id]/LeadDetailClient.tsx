'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Calendar,
    CheckSquare,
    History,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Pin,
    Save,
    StickyNote,
    Store,
    Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type LeadTab = 'timeline' | 'data' | 'notes' | 'tasks';
type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface StageOption {
    id: string;
    name: string;
    order: number;
    color: string;
    isWon: boolean;
    isLost: boolean;
}

interface LeadData {
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string | null;
    position: string | null;
    status: string;
    score: number;
    grade: string | null;
    estimatedValue: unknown;
    createdAt: string | Date;
    pipelineStageId: string | null;
    pipelineStage: StageOption | null;
    assignedUser?: { id: string; name: string; email?: string } | null;
    customFields?: unknown;
    activities: Array<{
        id: string;
        title: string;
        description: string | null;
        createdAt: string | Date;
        user?: { name?: string | null } | null;
    }>;
    meetings: Array<{
        id: string;
        title: string;
        status: string;
        startTime: string | Date;
    }>;
    notes: Array<{
        id: string;
        content: string;
        isPinned: boolean;
        createdAt: string | Date;
        user?: { name?: string | null } | null;
    }>;
    tasks: Array<{
        id: string;
        title: string;
        description: string | null;
        status: TaskStatus;
        priority: TaskPriority;
        dueDate: string | Date | null;
    }>;
    availableStages?: StageOption[];
    permissions?: {
        canEditLead?: boolean;
        canAdvancePipeline?: boolean;
        canDeleteLead?: boolean;
    };
}

interface LeadDetailClientProps {
    lead: LeadData;
}

interface FeedbackState {
    type: 'success' | 'error';
    message: string;
}

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em andamento',
    COMPLETED: 'Concluída',
    CANCELLED: 'Cancelada',
};

const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    URGENT: 'Urgente',
};

function toDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function toCurrency(value: unknown): string {
    if (value == null || value === '') return '-';
    const serialized = typeof value === 'object' && value !== null && 'toString' in value
        ? (value as { toString: () => string }).toString()
        : value;
    const numeric = typeof serialized === 'number' ? serialized : Number(serialized);
    if (Number.isNaN(numeric)) return '-';
    return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getErrorMessage(payload: unknown, fallback: string): string {
    if (payload && typeof payload === 'object' && 'error' in payload) {
        const message = (payload as { error?: unknown }).error;
        if (typeof message === 'string' && message.trim()) return message;
    }
    return fallback;
}

async function apiRequest<T = unknown>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
    });

    let payload: unknown = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Falha ao executar requisição.'));
    }

    return payload as T;
}

export default function LeadDetailClient({ lead }: LeadDetailClientProps) {
    const router = useRouter();
    const [leadState, setLeadState] = useState<LeadData>(lead);
    const [activeTab, setActiveTab] = useState<LeadTab>('timeline');
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [loadingLead, setLoadingLead] = useState(false);

    const [availableStages, setAvailableStages] = useState<StageOption[]>(lead.availableStages || []);
    const [selectedStageId, setSelectedStageId] = useState(lead.pipelineStageId || '');
    const [savingStage, setSavingStage] = useState(false);

    const [editingData, setEditingData] = useState(false);
    const [savingData, setSavingData] = useState(false);
    const [dataForm, setDataForm] = useState({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        position: lead.position || '',
    });

    const [noteContent, setNoteContent] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

    const [taskTitle, setTaskTitle] = useState('');
    const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [savingTask, setSavingTask] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

    const canEditLead = Boolean(leadState.permissions?.canEditLead);
    const canAdvancePipeline = Boolean(leadState.permissions?.canAdvancePipeline);

    const loadLead = async () => {
        setLoadingLead(true);
        try {
            const refreshed = await apiRequest<LeadData>(`/api/leads/${leadState.id}`);
            setLeadState(refreshed);
            setSelectedStageId(refreshed.pipelineStageId || '');
            if (Array.isArray(refreshed.availableStages)) {
                setAvailableStages(refreshed.availableStages);
            }
        } catch (error) {
            setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível atualizar o lead.' });
        } finally {
            setLoadingLead(false);
        }
    };

    useEffect(() => {
        void loadLead();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!editingData) {
            setDataForm({
                name: leadState.name || '',
                email: leadState.email || '',
                phone: leadState.phone || '',
                company: leadState.company || '',
                position: leadState.position || '',
            });
        }
    }, [editingData, leadState]);

    const daysInFunnel = Math.max(0, Math.floor((Date.now() - (toDate(leadState.createdAt)?.getTime() || Date.now())) / (1000 * 3600 * 24)));
    const interactionsCount = (leadState.activities?.length || 0) + (leadState.meetings?.length || 0) + (leadState.notes?.length || 0);
    const scorePercent = Math.max(0, Math.min(Number(leadState.score || 0), 100));

    const stageProgress = useMemo(() => {
        const stages = availableStages.length > 0 ? availableStages : (leadState.pipelineStage ? [leadState.pipelineStage] : []);
        const sortedStages = [...stages].sort((a, b) => a.order - b.order);
        const currentIndex = sortedStages.findIndex((stage) => stage.id === leadState.pipelineStageId);
        const percent = sortedStages.length ? ((Math.max(currentIndex, 0) + 1) / sortedStages.length) * 100 : 0;

        return {
            stages: sortedStages,
            percent,
            currentName: leadState.pipelineStage?.name || 'Sem etapa',
        };
    }, [availableStages, leadState.pipelineStage, leadState.pipelineStageId]);

    const customFields = (leadState.customFields && typeof leadState.customFields === 'object')
        ? (leadState.customFields as Record<string, unknown>)
        : null;

    const saveStage = async () => {
        if (!canAdvancePipeline) return;
        if (!selectedStageId || selectedStageId === leadState.pipelineStageId) return;
        setSavingStage(true);
        try {
            await apiRequest(`/api/leads/${leadState.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ pipelineStageId: selectedStageId }),
            });
            await loadLead();
            setFeedback({ type: 'success', message: 'Etapa atualizada com sucesso.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível atualizar a etapa.' });
        } finally {
            setSavingStage(false);
        }
    };

    const markAsLost = async () => {
        if (!canAdvancePipeline) return;
        setSavingStage(true);
        try {
            await apiRequest(`/api/leads/${leadState.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'LOST' }),
            });
            await loadLead();
            setFeedback({ type: 'success', message: 'Lead marcado como perdido.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível marcar o lead como perdido.' });
        } finally {
            setSavingStage(false);
        }
    };

    const saveData = async () => {
        if (!canEditLead) return;
        if (!dataForm.name.trim() || !dataForm.email.trim()) {
            setFeedback({ type: 'error', message: 'Nome e email são obrigatórios.' });
            return;
        }

        setSavingData(true);
        try {
            await apiRequest(`/api/leads/${leadState.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    name: dataForm.name.trim(),
                    email: dataForm.email.trim(),
                    phone: dataForm.phone.trim() || null,
                    company: dataForm.company.trim() || null,
                    position: dataForm.position.trim() || null,
                }),
            });
            setEditingData(false);
            await loadLead();
            setFeedback({ type: 'success', message: 'Dados atualizados.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível salvar os dados.' });
        } finally {
            setSavingData(false);
        }
    };

    const createNote = async () => {
        if (!canEditLead) return;
        if (!noteContent.trim()) return;
        setSavingNote(true);
        try {
            await apiRequest(`/api/leads/${leadState.id}/notes`, {
                method: 'POST',
                body: JSON.stringify({ content: noteContent.trim() }),
            });
            setNoteContent('');
            await loadLead();
            setFeedback({ type: 'success', message: 'Nota adicionada.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível adicionar a nota.' });
        } finally {
            setSavingNote(false);
        }
    };

    const togglePinNote = async (noteId: string, isPinned: boolean) => {
        if (!canEditLead) return;
        setEditingNoteId(noteId);
        try {
            await apiRequest(`/api/leads/${leadState.id}/notes?noteId=${noteId}`, {
                method: 'PATCH',
                body: JSON.stringify({ isPinned: !isPinned }),
            });
            await loadLead();
        } catch (error) {
            setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível atualizar a nota.' });
        } finally {
            setEditingNoteId(null);
        }
    };

    const deleteNote = async (noteId: string) => {
        if (!canEditLead) return;
        setEditingNoteId(noteId);
        try {
            await apiRequest(`/api/leads/${leadState.id}/notes?noteId=${noteId}`, { method: 'DELETE' });
            await loadLead();
            setFeedback({ type: 'success', message: 'Nota removida.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível remover a nota.' });
        } finally {
            setEditingNoteId(null);
        }
    };

    const createTask = async () => {
        if (!canEditLead) return;
        if (!taskTitle.trim()) {
            setFeedback({ type: 'error', message: 'Informe o título da tarefa.' });
            return;
        }

        setSavingTask(true);
        try {
            const dueDateIso = taskDueDate ? new Date(`${taskDueDate}T09:00:00`).toISOString() : null;
            await apiRequest(`/api/leads/${leadState.id}/tasks`, {
                method: 'POST',
                body: JSON.stringify({ title: taskTitle.trim(), priority: taskPriority, dueDate: dueDateIso }),
            });
            setTaskTitle('');
            setTaskPriority('MEDIUM');
            setTaskDueDate('');
            await loadLead();
            setFeedback({ type: 'success', message: 'Tarefa criada.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível criar a tarefa.' });
        } finally {
            setSavingTask(false);
        }
    };

    const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
        if (!canEditLead) return;
        setEditingTaskId(taskId);
        try {
            await apiRequest(`/api/leads/${leadState.id}/tasks?taskId=${taskId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
            await loadLead();
        } catch (error) {
            setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível atualizar a tarefa.' });
        } finally {
            setEditingTaskId(null);
        }
    };

    const cancelTask = async (taskId: string) => {
        if (!canEditLead) return;
        setEditingTaskId(taskId);
        try {
            await apiRequest(`/api/leads/${leadState.id}/tasks?taskId=${taskId}`, { method: 'DELETE' });
            await loadLead();
            setFeedback({ type: 'success', message: 'Tarefa cancelada.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível cancelar a tarefa.' });
        } finally {
            setEditingTaskId(null);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:hidden col-span-1">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-primary mb-4">
                    <ArrowLeft size={20} /> Voltar
                </button>
            </div>

            <aside className="lg:col-span-3 xl:col-span-3 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 relative">
                        <button onClick={() => router.back()} className="hidden lg:flex items-center gap-2 text-gray-400 hover:text-primary mb-4 text-sm transition-colors absolute top-4 left-4">
                            <ArrowLeft size={16} /> Voltar
                        </button>
                        <div className="flex justify-between items-start mt-8">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">{leadState.name}</h1>
                                <p className="text-sm text-gray-500">{leadState.position || '-'}</p>
                                <p className="text-xs font-semibold text-primary mt-1">{leadState.company || 'Empresa não informada'}</p>
                            </div>
                        </div>

                        <div className="mt-6 bg-red-50 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">{leadState.grade || '-'}</div>
                            <div>
                                <p className="text-xs text-primary font-semibold uppercase tracking-wider">Lead Score</p>
                                <p className="text-sm font-medium text-gray-900">{leadState.score} pontos</p>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2">
                            <button type="button" onClick={() => router.push(`/dashboard/agenda?leadId=${leadState.id}`)} className="w-full bg-primary hover:bg-red-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm shadow-primary/30 transition-all">
                                <Calendar size={18} /> Agendar reunião
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                                <a href={`mailto:${leadState.email}`} className="bg-white border border-gray-200 hover:border-primary/50 text-gray-700 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"><Mail size={18} /> Email</a>
                                <a href={`tel:${leadState.phone}`} className="bg-white border border-gray-200 hover:border-primary/50 text-gray-700 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"><Phone size={18} /> Ligar</a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Informações de Contato</h3>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3"><Mail className="text-gray-400 mt-0.5" size={18} /><div className="text-sm overflow-hidden w-full"><p className="text-gray-500 text-xs">Email comercial</p><span className="text-gray-900 font-medium break-all block" title={leadState.email}>{leadState.email}</span></div></li>
                        <li className="flex items-start gap-3"><Phone className="text-gray-400 mt-0.5" size={18} /><div className="text-sm"><p className="text-gray-500 text-xs">Celular / WhatsApp</p><span className="text-gray-900 font-medium">{leadState.phone || '-'}</span></div></li>
                        <li className="flex items-start gap-3"><MapPin className="text-gray-400 mt-0.5" size={18} /><div className="text-sm"><p className="text-gray-500 text-xs">Localização</p><span className="text-gray-900 font-medium">{typeof customFields?.city === 'string' ? `${customFields.city}${typeof customFields.state === 'string' ? ` - ${customFields.state}` : ''}` : '-'}</span></div></li>
                    </ul>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Métricas Chave</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100"><p className="text-xs text-gray-500">Dias no funil</p><p className="text-xl font-bold text-gray-900">{daysInFunnel}</p></div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100"><p className="text-xs text-gray-500">Interações</p><p className="text-xl font-bold text-gray-900">{interactionsCount}</p></div>
                        <div className="col-span-2 p-3 bg-gray-50 rounded-lg border border-gray-100"><p className="text-xs text-gray-500">Probabilidade de fechamento</p><div className="flex items-center gap-2 mt-1"><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${scorePercent}%` }} /></div><span className="text-sm font-bold text-green-600">{scorePercent}%</span></div></div>
                    </div>
                </div>
            </aside>

            <main className="lg:col-span-9 xl:col-span-9 flex flex-col gap-6">
                {feedback && <div className={`rounded-lg border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{feedback.message}</div>}

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="w-full">
                        <div className="flex justify-between text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide overflow-auto gap-4">
                            {stageProgress.stages.map((stage) => <span key={stage.id} className={stage.id === leadState.pipelineStageId ? 'text-primary font-bold whitespace-nowrap' : 'whitespace-nowrap'}>{stage.name}</span>)}
                        </div>
                        <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${stageProgress.percent}%` }} /></div>
                        <p className="text-xs text-right mt-1 text-gray-500 py-1">Etapa atual: <strong className="text-primary">{stageProgress.currentName}</strong></p>
                    </div>
                    <div className="w-full md:w-auto flex flex-col md:flex-row items-stretch md:items-center gap-2 shrink-0">
                        <select value={selectedStageId} onChange={(e) => setSelectedStageId(e.target.value)} className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm min-w-[220px]" disabled={!canAdvancePipeline || savingStage || loadingLead || availableStages.length === 0}>
                            {availableStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                        </select>
                        <button type="button" onClick={() => void saveStage()} disabled={!canAdvancePipeline || savingStage || loadingLead || !selectedStageId || selectedStageId === leadState.pipelineStageId} className="bg-primary hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                            {savingStage ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />} Mudar etapa
                        </button>
                        <button type="button" onClick={() => void markAsLost()} disabled={!canAdvancePipeline || savingStage || leadState.status === 'LOST'} className="bg-white border border-gray-200 hover:border-primary/50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">Marcar perdido</button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[600px]">
                    <div className="border-b border-gray-200 px-6">
                        <nav className="-mb-px flex space-x-8 overflow-x-auto">
                            <button onClick={() => setActiveTab('timeline')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'timeline' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><History size={18} /> Timeline</button>
                            <button onClick={() => setActiveTab('data')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'data' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><Store size={18} /> Dados da Farmácia</button>
                            <button onClick={() => setActiveTab('notes')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'notes' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><StickyNote size={18} /> Notas <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs ml-1">{leadState.notes?.length || 0}</span></button>
                            <button onClick={() => setActiveTab('tasks')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'tasks' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><CheckSquare size={18} /> Tarefas</button>
                        </nav>
                    </div>

                    <div className="p-6 bg-[#fafafa] flex-1">
                        {activeTab === 'timeline' && (
                            <div className="space-y-4">
                                {leadState.activities?.map((activity) => (
                                    <div key={activity.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-1 gap-3">
                                            <h4 className="font-semibold text-gray-900 text-sm">{activity.title}</h4>
                                            <span className="text-xs text-gray-400 whitespace-nowrap">{toDate(activity.createdAt) ? formatDistanceToNow(toDate(activity.createdAt) as Date, { addSuffix: true, locale: ptBR }) : '-'}</span>
                                        </div>
                                        {activity.description && <p className="text-sm text-gray-600">{activity.description}</p>}
                                    </div>
                                ))}
                                {leadState.meetings?.map((meeting) => (
                                    <div key={meeting.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <p className="text-sm font-semibold text-gray-900">{meeting.title}</p>
                                        <p className="text-xs text-gray-500">{toDate(meeting.startTime) ? format(toDate(meeting.startTime) as Date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'notes' && (
                            <div className="space-y-6">
                                <div className="mb-8 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                    <textarea disabled={!canEditLead} className="w-full border border-gray-200 rounded-lg p-3 text-gray-700 placeholder-gray-400 resize-none h-24 outline-none disabled:opacity-60" placeholder="Adicione uma nota rápida ou registre uma interação..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
                                    <div className="flex justify-end mt-3">
                                        <button type="button" onClick={() => void createNote()} disabled={!canEditLead || savingNote || !noteContent.trim()} className="bg-gray-900 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-60">{savingNote ? 'Salvando...' : 'Registrar'}</button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {leadState.notes?.map((note) => (
                                        <div key={note.id} className={`p-4 rounded-lg border ${note.isPinned ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
                                            <div className="flex justify-between items-start mb-2 gap-2">
                                                <div className="flex items-center gap-2"><span className="text-xs font-bold text-gray-700">{note.user?.name || 'Usuário'}</span>{note.isPinned && <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Fixada</span>}</div>
                                                <span className="text-xs text-gray-400">{toDate(note.createdAt) ? format(toDate(note.createdAt) as Date, 'dd MMM, HH:mm', { locale: ptBR }) : '-'}</span>
                                            </div>
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                                            <div className="mt-3 flex items-center gap-2">
                                                <button type="button" onClick={() => void togglePinNote(note.id, note.isPinned)} disabled={!canEditLead || editingNoteId === note.id} className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded-lg bg-white hover:border-gray-400 disabled:opacity-60"><Pin size={12} /> {note.isPinned ? 'Desafixar' : 'Fixar'}</button>
                                                <button type="button" onClick={() => void deleteNote(note.id)} disabled={!canEditLead || editingNoteId === note.id} className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-red-200 text-red-700 rounded-lg bg-white hover:bg-red-50 disabled:opacity-60"><Trash2 size={12} /> Excluir</button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!leadState.notes || leadState.notes.length === 0) && <div className="text-center py-8 text-gray-400">Nenhuma nota encontrada.</div>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'tasks' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <input disabled={!canEditLead} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Título da tarefa" className="md:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:opacity-60" />
                                    <select disabled={!canEditLead} value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as TaskPriority)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:opacity-60"><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></select>
                                    <input disabled={!canEditLead} value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} type="date" className="border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:opacity-60" />
                                    <div className="md:col-span-4 flex justify-end"><button type="button" onClick={() => void createTask()} disabled={!canEditLead || savingTask} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-60">{savingTask && <Loader2 size={14} className="animate-spin" />}Criar tarefa</button></div>
                                </div>

                                <div className="space-y-3">
                                    {leadState.tasks?.map((task) => (
                                        <div key={task.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                                                    {task.description && <p className="text-sm text-gray-600 mt-1">{task.description}</p>}
                                                    <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3"><span>Prioridade: {TASK_PRIORITY_LABEL[task.priority]}</span><span>Status: {TASK_STATUS_LABEL[task.status]}</span><span>Vencimento: {toDate(task.dueDate) ? format(toDate(task.dueDate) as Date, 'dd/MM/yyyy', { locale: ptBR }) : '-'}</span></div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <select value={task.status} onChange={(e) => void updateTaskStatus(task.id, e.target.value as TaskStatus)} disabled={!canEditLead || editingTaskId === task.id} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"><option value="PENDING">Pendente</option><option value="IN_PROGRESS">Em andamento</option><option value="COMPLETED">Concluída</option><option value="CANCELLED">Cancelada</option></select>
                                                    <button type="button" onClick={() => void cancelTask(task.id)} disabled={!canEditLead || editingTaskId === task.id || task.status === 'CANCELLED'} className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-red-200 text-red-700 rounded-lg bg-white hover:bg-red-50 disabled:opacity-60"><Trash2 size={12} /> Cancelar</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!leadState.tasks || leadState.tasks.length === 0) && <div className="text-center py-8 text-gray-400">Nenhuma tarefa encontrada.</div>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'data' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Store className="text-primary" size={20} /> Dados Detalhados</h3>
                                    <button type="button" onClick={() => setEditingData((current) => !current)} disabled={!canEditLead} className="text-xs text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline">{editingData ? 'Cancelar edição' : 'Editar dados'}</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nome</label>{editingData ? <input value={dataForm.name} onChange={(e) => setDataForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /> : <div className="text-gray-900 text-sm">{leadState.name}</div>}</div>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>{editingData ? <input value={dataForm.email} onChange={(e) => setDataForm((prev) => ({ ...prev, email: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /> : <div className="text-gray-900 text-sm">{leadState.email}</div>}</div>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Telefone</label>{editingData ? <input value={dataForm.phone} onChange={(e) => setDataForm((prev) => ({ ...prev, phone: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /> : <div className="text-gray-900 text-sm">{leadState.phone || '-'}</div>}</div>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Empresa</label>{editingData ? <input value={dataForm.company} onChange={(e) => setDataForm((prev) => ({ ...prev, company: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /> : <div className="text-gray-900 text-sm">{leadState.company || '-'}</div>}</div>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cargo</label>{editingData ? <input value={dataForm.position} onChange={(e) => setDataForm((prev) => ({ ...prev, position: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /> : <div className="text-gray-900 text-sm">{leadState.position || '-'}</div>}</div>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Valor estimado</label><div className="text-gray-900 text-sm font-semibold">{toCurrency(leadState.estimatedValue)}</div></div>
                                </div>

                                {editingData && <div className="mt-6 flex justify-end"><button type="button" onClick={() => void saveData()} disabled={savingData} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-60">{savingData ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Salvar alterações</button></div>}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
