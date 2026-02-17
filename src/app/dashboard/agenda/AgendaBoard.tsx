'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MiniCalendar from './MiniCalendar';
import {
    ChevronLeft,
    ChevronRight,
    Video,
    Plus,
    Clock,
    Calendar as CalendarIcon,
    Search,
    X,
    User,
    Check,
    ChevronDown,
    Trash2,
    ExternalLink
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, startOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, getHours, getMinutes } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { ptBR } from 'date-fns/locale';
import { createMeeting, deleteMeeting } from '../actions';

type ViewMode = 'month' | 'week' | 'day';

interface Meeting {
    id: string;
    title: string;
    startTime: string | Date;
    endTime: string | Date;
    leadId: string;
    description?: string | null;
    meetingType?: string; // Prisma enum comes as string in JSON usually, or we can type it strictly
    lead?: {
        name: string;
        company: string | null;
    };
    provider?: string | null;
    teamsJoinUrl?: string | null;
    status?: string;
}

interface AgendaBoardProps {
    initialMeetings: Meeting[];
    leads: { id: string, name: string, company: string | null }[];
}

export default function AgendaBoard({ initialMeetings, leads }: AgendaBoardProps) {
    const [currentView, setCurrentView] = useState<ViewMode>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Meeting Details Modal State
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');

    // Check for leadId in URL to open modal automatically
    useEffect(() => {
        const leadIdParam = searchParams.get('leadId');
        if (leadIdParam) {
            setNewEvent(prev => ({ ...prev, leadId: leadIdParam }));
            setIsModalOpen(true);
        }
    }, [searchParams]);

    // Filters State
    const [filters, setFilters] = useState({
        diagnostico: true,
        apresentacao: true,
        fechamento: true,
        followup: true
    });

    // Update local state when server props change (e.g. after router.refresh)
    useEffect(() => {
        setMeetings(initialMeetings);
    }, [initialMeetings]);

    const getRangeForView = useCallback((date: Date, view: ViewMode): { from: Date; to: Date } => {
        if (view === 'day') {
            const from = new Date(date);
            from.setHours(0, 0, 0, 0);
            const to = new Date(date);
            to.setHours(23, 59, 59, 999);
            return { from, to };
        }
        if (view === 'month') {
            const from = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
            const to = addDays(from, 41);
            return { from, to };
        }
        const from = startOfWeek(date, { weekStartsOn: 0 });
        const to = addDays(from, 6);
        return { from, to };
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function fetchMeetingsForRange() {
            setIsLoadingMeetings(true);
            try {
                const { from, to } = getRangeForView(currentDate, currentView);
                const params = new URLSearchParams({
                    from: from.toISOString(),
                    to: to.toISOString(),
                });
                const response = await fetch(`/api/meetings?${params.toString()}`, { cache: 'no-store' });
                const payload = await response.json();
                if (!response.ok || cancelled) return;

                const normalized = (payload as Meeting[])
                    .filter((meeting) => meeting.status !== 'CANCELLED')
                    .map((meeting) => ({
                        ...meeting,
                        startTime: new Date(meeting.startTime),
                        endTime: new Date(meeting.endTime),
                    }));

                setMeetings(normalized);
            } catch (error) {
                console.error('Error loading meetings:', error);
            } finally {
                if (!cancelled) setIsLoadingMeetings(false);
            }
        }

        void fetchMeetingsForRange();
        return () => {
            cancelled = true;
        };
    }, [currentDate, currentView, getRangeForView]);

    const [newEvent, setNewEvent] = useState({
        leadId: '',
        type: 'diagnostico',
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '10:00',
        duration: '60', // minutes
        autoLink: true,
        notes: ''
    });

    const handlePrevious = () => {
        if (currentView === 'week') setCurrentDate(subWeeks(currentDate, 1));
        if (currentView === 'month') setCurrentDate(subMonths(currentDate, 1));
        if (currentView === 'day') setCurrentDate(addDays(currentDate, -1));
    };

    const handleNext = () => {
        if (currentView === 'week') setCurrentDate(addWeeks(currentDate, 1));
        if (currentView === 'month') setCurrentDate(addMonths(currentDate, 1));
        if (currentView === 'day') setCurrentDate(addDays(currentDate, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const getHeaderTitle = () => {
        if (currentView === 'month') return format(currentDate, 'MMMM yyyy', { locale: ptBR });
        if (currentView === 'day') return format(currentDate, "d 'de' MMMM, yyyy", { locale: ptBR });
        const start = startOfWeek(currentDate, { weekStartsOn: 0 });
        const end = addDays(start, 6);
        return `${format(start, 'MMM d', { locale: ptBR })} - ${format(end, 'd', { locale: ptBR })}`;
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const result = await createMeeting(newEvent);

            if (result.success && result.meeting) {
                // Optimistic update or refresh
                alert(`Reunião agendada com sucesso!`);
                setIsModalOpen(false);
                setNewEvent({
                    leadId: '',
                    type: 'diagnostico',
                    date: format(new Date(), 'yyyy-MM-dd'),
                    startTime: '10:00',
                    duration: '60',
                    autoLink: true,
                    notes: ''
                });

                const startTime = new Date(`${newEvent.date}T${newEvent.startTime}:00`);
                const durationMinutes = parseInt(newEvent.duration, 10) || 60;
                const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
                const lead = leads.find((item) => item.id === newEvent.leadId);

                setMeetings((prev) => [
                    ...prev,
                    {
                        id: result.meeting.id,
                        title: result.meeting.title,
                        startTime,
                        endTime,
                        leadId: newEvent.leadId,
                        description: newEvent.notes,
                        lead: lead ? { name: lead.name, company: lead.company } : undefined,
                        provider: result.meeting.provider || null,
                        teamsJoinUrl: result.meeting.teamsJoinUrl || null,
                        status: 'SCHEDULED',
                    },
                ]);
            } else {
                alert(result.error || 'Erro ao agendar reunião.');
            }
        } catch (error) {
            console.error('Error creating meeting:', error);
            alert('Erro ao agendar reunião.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteMeeting = async () => {
        if (!selectedMeeting) return;
        if (!confirm('Tem certeza que deseja cancelar esta reunião?')) return;

        setIsDeleting(true);
        try {
            const result = await deleteMeeting(selectedMeeting.id);
            if (result.success) {
                setIsDetailsOpen(false);
                setSelectedMeeting(null);
                setMeetings((prev) => prev.filter((meeting) => meeting.id !== selectedMeeting.id));
            } else {
                alert('Erro ao cancelar reunião.');
            }
        } catch (error) {
            console.error('Error deleting meeting:', error);
            alert('Erro ao cancelar reunião.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleMeetingClick = (meeting: Meeting) => {
        setSelectedMeeting(meeting);
        setIsDetailsOpen(true);
    };    // Filter Logic
    const filteredMeetings = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        return meetings.filter(meeting => {
            if (meeting.status === 'CANCELLED') return false;

            // Normalize type checking
            const type = meeting.meetingType || 'DIAGNOSTICO'; // Default for old records

            const isDiagnostico = type === 'DIAGNOSTICO';
            const isApresentacao = type === 'APRESENTACAO';
            const isFechamento = type === 'FECHAMENTO';
            const isFollowup = type === 'FOLLOWUP';

            const typeAllowed =
                (filters.diagnostico && isDiagnostico) ||
                (filters.apresentacao && isApresentacao) ||
                (filters.fechamento && isFechamento) ||
                (filters.followup && isFollowup);

            if (!typeAllowed) return false;
            if (!search) return true;

            const titleLower = meeting.title.toLowerCase();
            const leadName = meeting.lead?.name?.toLowerCase() || '';
            const leadCompany = meeting.lead?.company?.toLowerCase() || '';
            return titleLower.includes(search) || leadName.includes(search) || leadCompany.includes(search);
        });
    }, [filters, meetings, searchTerm]);

    const renderContent = () => {
        switch (currentView) {
            case 'month':
                return <MonthGrid currentDate={currentDate} meetings={filteredMeetings} onMeetingClick={handleMeetingClick} />;
            case 'day':
                return <DayGrid currentDate={currentDate} meetings={filteredMeetings} onMeetingClick={handleMeetingClick} />;
            default:
                return <WeekGrid currentDate={currentDate} meetings={filteredMeetings} onMeetingClick={handleMeetingClick} />;
        }
    };

    return (
        <div className="flex h-full bg-slate-50 font-sans text-slate-800 overflow-hidden relative">

            {/* Left Sidebar: Mini Calendar & Filters */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden xl:flex flex-col p-4 gap-6 overflow-y-auto">
                {/* Create Button */}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full bg-primary hover:bg-primary-hover text-white py-3 px-4 rounded-lg font-medium shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    Nova Reunião
                </button>

                {/* Mini Calendar Widget */}
                <MiniCalendar
                    currentDate={currentDate}
                    onDateChange={(date) => {
                        setCurrentDate(date);
                        // Optional: Switch to day view if user clicks a specific day in month view?
                        // For now, keep current view but update date.
                    }}
                />

                {/* Calendars Filter */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Minhas Agendas</h3>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer group">
                            <input
                                checked={filters.diagnostico}
                                onChange={(e) => setFilters({ ...filters, diagnostico: e.target.checked })}
                                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary" type="checkbox"
                            />
                            <span className="w-3 h-3 rounded-full bg-primary"></span>
                            <span className="text-gray-600 group-hover:text-gray-900 transition-colors">Calls de Diagnóstico</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer group">
                            <input
                                checked={filters.apresentacao}
                                onChange={(e) => setFilters({ ...filters, apresentacao: e.target.checked })}
                                className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500 accent-blue-500" type="checkbox"
                            />
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            <span className="text-gray-600 group-hover:text-gray-900 transition-colors">Apresentação</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer group">
                            <input
                                checked={filters.fechamento}
                                onChange={(e) => setFilters({ ...filters, fechamento: e.target.checked })}
                                className="w-4 h-4 text-emerald-500 rounded border-gray-300 focus:ring-emerald-500 accent-emerald-500" type="checkbox"
                            />
                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                            <span className="text-gray-600 group-hover:text-gray-900 transition-colors">Fechamento</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer group">
                            <input
                                checked={filters.followup}
                                onChange={(e) => setFilters({ ...filters, followup: e.target.checked })}
                                className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500 accent-orange-500" type="checkbox"
                            />
                            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                            <span className="text-gray-600 group-hover:text-gray-900 transition-colors">Follow-ups</span>
                        </label>
                    </div>
                </div>
            </aside>

            {/* Main Content: Calendar Grid */}
            <main className="flex-1 flex flex-col min-w-0 bg-white shadow-sm m-4 rounded-xl border border-gray-200 overflow-hidden">
                {/* Calendar Toolbar */}
                <header className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-gray-200 bg-white gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 whitespace-nowrap capitalize">{getHeaderTitle()}</h2>
                        <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
                            <button onClick={handlePrevious} className="p-1 hover:bg-white rounded shadow-sm transition-all text-gray-600"><ChevronLeft size={18} /></button>
                            <button onClick={handleToday} className="px-3 text-sm font-medium text-gray-600 hover:text-gray-900">Hoje</button>
                            <button onClick={handleNext} className="p-1 hover:bg-white rounded shadow-sm transition-all text-gray-600"><ChevronRight size={18} /></button>
                        </div>
                    </div>
                    <div className="flex bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
                        <button
                            onClick={() => setCurrentView('month')}
                            className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${currentView === 'month' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                        >
                            Mês
                        </button>
                        <button
                            onClick={() => setCurrentView('week')}
                            className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${currentView === 'week' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                        >
                            Semana
                        </button>
                        <button
                            onClick={() => setCurrentView('day')}
                            className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${currentView === 'day' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                        >
                            Dia
                        </button>
                    </div>
                </header>

                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/40 flex items-center gap-3">
                    <div className="relative w-full max-w-md">
                        <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por título, lead ou empresa"
                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>
                    {isLoadingMeetings && <span className="text-xs text-gray-500">Atualizando agenda...</span>}
                </div>

                {/* Calendar Scroll Area */}
                <div className="flex-1 overflow-y-auto relative bg-white">
                    {renderContent()}
                </div>
            </main>

            {/* Right Sidebar: Upcoming (Hidden for simplicity or can be kept static for now) */}
            <aside className="w-80 bg-white border-l border-gray-200 hidden 2xl:flex flex-col shadow-lg z-10">
                <div className="p-5 border-b border-gray-200 bg-gray-50/50">
                    <h3 className="font-bold text-lg text-gray-900">Próximas Reuniões</h3>
                    <p className="text-xs text-gray-500 mt-1">Sua agenda para {format(new Date(), "d 'de' MMMM", { locale: ptBR })}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {filteredMeetings.filter(m => isToday(new Date(m.startTime))).map(meeting => (
                        <div key={meeting.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase">{format(new Date(meeting.startTime), 'HH:mm')}</span>
                            </div>
                            <h4 className="font-semibold text-gray-800 text-sm">{meeting.title}</h4>
                            <p className="text-xs text-gray-500 mb-3">{meeting.lead?.name} - {meeting.lead?.company}</p>
                        </div>
                    ))}
                    {filteredMeetings.filter(m => isToday(new Date(m.startTime))).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">Nenhuma reunião hoje.</p>
                    )}
                </div>
            </aside>

            {/* Floating Action Button for Mobile */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="xl:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center z-50 hover:bg-primary-hover active:scale-95 transition-all"
            >
                <Plus size={28} />
            </button>

            {/* Modal Nova Reunião */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Agendar Nova Reunião</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Preencha os dados para criar um novo agendamento.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEvent}>
                            <div className="p-6 space-y-5">
                                {/* Lead Selector */}
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700">Lead / Cliente</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-2.5 text-gray-400">
                                            <User size={18} />
                                        </div>
                                        <select
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer"
                                            value={newEvent.leadId}
                                            onChange={(e) => setNewEvent({ ...newEvent, leadId: e.target.value })}
                                            required
                                        >
                                            <option value="" disabled>Selecionar Lead...</option>
                                            {leads.map(lead => (
                                                <option key={lead.id} value={lead.id}>
                                                    {lead.name} {lead.company ? `- ${lead.company}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                </div>

                                {/* Type Selector */}
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700">Tipo de Reunião</label>
                                    <div className="relative">
                                        <select
                                            className="w-full pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer"
                                            value={newEvent.type}
                                            onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                                        >
                                            <option value="diagnostico">Call de Diagnóstico</option>
                                            <option value="apresentacao">Apresentação de Proposta</option>
                                            <option value="fechamento">Fechamento</option>
                                            <option value="followup">Follow-up</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                </div>

                                {/* Date and Time Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700">Data</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="w-full pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                value={newEvent.date}
                                                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700">Horário</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                            <input
                                                type="time"
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                value={newEvent.startTime}
                                                onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Duration */}
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700">Duração Estimada</label>
                                    <div className="flex gap-3">
                                        {['30', '60', '90'].map((mins) => (
                                            <label key={mins} className={`flex-1 cursor-pointer border rounded-lg py-2 text-center text-sm font-medium transition-all ${newEvent.duration === mins ? 'bg-primary/5 border-primary text-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                                <input
                                                    type="radio"
                                                    name="duration"
                                                    value={mins}
                                                    checked={newEvent.duration === mins}
                                                    onChange={(e) => setNewEvent({ ...newEvent, duration: e.target.value })}
                                                    className="sr-only"
                                                />
                                                {mins === '60' ? '1h' : mins === '90' ? '1h 30m' : '30 min'}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Teams Toggle */}
                                <div className="flex items-center justify-between py-3 border-t border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                            <Video size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Microsoft Teams</p>
                                            <p className="text-xs text-gray-500">Gerar link Teams automaticamente</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={newEvent.autoLink} onChange={(e) => setNewEvent({ ...newEvent, autoLink: e.target.checked })} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>

                                {/* Notes */}
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700">Observações Internas</label>
                                    <textarea
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none h-24"
                                        placeholder="Adicione notas sobre o objetivo da reunião..."
                                        value={newEvent.notes}
                                        onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-white transition-colors">
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 rounded-lg bg-[#DF362D] hover:bg-[#c92b23] text-white text-sm font-medium shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Agendando...' : (
                                        <>
                                            <Check size={16} />
                                            Confirmar Agendamento
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Detalhes da Reunião */}
            {isDetailsOpen && selectedMeeting && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{selectedMeeting.title}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Detalhes do agendamento</p>
                            </div>
                            <button onClick={() => setIsDetailsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Lead Info */}
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">{selectedMeeting.lead?.name}</h4>
                                    <p className="text-sm text-gray-500">{selectedMeeting.lead?.company || 'Sem empresa'}</p>
                                </div>
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <CalendarIcon className="text-gray-400" size={18} />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium uppercase">Data</p>
                                        <p className="text-sm font-semibold text-gray-900">{format(new Date(selectedMeeting.startTime), "d 'de' MMMM", { locale: ptBR })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="text-gray-400" size={18} />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium uppercase">Horário</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {format(new Date(selectedMeeting.startTime), 'HH:mm')} - {format(new Date(selectedMeeting.endTime), 'HH:mm')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Link */}
                            {selectedMeeting.teamsJoinUrl && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Video size={16} />
                                    </div>
                                    <a href={selectedMeeting.teamsJoinUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                                        Entrar na reunião <ExternalLink size={12} />
                                    </a>
                                </div>
                            )}

                            {/* Notes */}
                            {selectedMeeting.description && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Observações</h4>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                                        {selectedMeeting.description}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between gap-3 rounded-b-xl">
                            <button
                                onClick={handleDeleteMeeting}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
                            >
                                {isDeleting ? 'Cancelando...' : <><Trash2 size={16} /> Cancelar Reunião</>}
                            </button>
                            <button
                                onClick={() => setIsDetailsOpen(false)}
                                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

// --- VIEW COMPONENTS ---

const WeekGrid = ({ currentDate, meetings, onMeetingClick }: { currentDate: Date, meetings: Meeting[], onMeetingClick: (m: Meeting) => void }) => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
    const weekDays = eachDayOfInterval({
        start: start,
        end: addDays(start, 6)
    });

    const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 08:00 to 18:00

    return (
        <div className="min-w-[800px] h-full">
            {/* Header Row (Days) */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 sticky top-0 bg-white z-20 shadow-sm">
                <div className="h-16 border-r border-gray-100"></div>
                {weekDays.map(day => (
                    <div key={day.toString()} className={`h-16 border-r border-gray-100 flex flex-col items-center justify-center transition-colors ${isToday(day) ? 'bg-primary/5' : ''}`}>
                        <span className={`text-xs font-medium uppercase mb-1 ${isToday(day) ? 'text-primary font-bold' : 'text-gray-400'}`}>
                            {format(day, 'EEE', { locale: ptBR })}
                        </span>
                        <span className={`text-lg font-semibold w-8 h-8 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-gray-900'}`}>
                            {format(day, 'd')}
                        </span>
                    </div>
                ))}
            </div>

            {/* Calendar Grid Body */}
            <div className="relative grid grid-cols-[60px_repeat(7,1fr)]">
                {/* Time Slots Column */}
                <div className="flex flex-col text-xs text-gray-400 font-medium text-right pr-2 bg-white pt-2.5">
                    {hours.map(h => (
                        <div key={h} className="h-20 -mt-2.5 relative">
                            <span className="relative z-10 bg-white pl-1">{h}:00</span>
                        </div>
                    ))}
                </div>

                {/* Day Columns */}
                {weekDays.map(day => (
                    <div key={day.toString()} className="border-r border-gray-100 relative border-b border-gray-100 min-h-[800px]">
                        {/* Grid Lines */}
                        {hours.map((_, i) => (
                            <div key={i} className="absolute w-full h-px bg-gray-50" style={{ top: `${i * 80}px` }}></div>
                        ))}

                        {/* Events for this day */}
                        {meetings.filter(m => isSameDay(new Date(m.startTime), day)).map(meeting => {
                            const start = new Date(meeting.startTime);
                            const end = new Date(meeting.endTime);
                            const startHour = getHours(start);
                            const startMin = getMinutes(start);
                            const durationMins = (end.getTime() - start.getTime()) / 60000;

                            const topOffset = ((startHour - 8) * 80) + ((startMin / 60) * 80);
                            const height = (durationMins / 60) * 80;

                            if (startHour < 8 || startHour > 18) return null; // Hide out of bounds for simplicity

                            return (
                                <div
                                    key={meeting.id}
                                    onClick={() => onMeetingClick(meeting)}
                                    className="absolute left-1 right-1 bg-primary/10 border-l-4 border-primary rounded p-1 shadow-sm border border-primary/5 hover:brightness-95 cursor-pointer text-xs overflow-hidden transition-all hover:scale-[1.02] hover:z-10"
                                    style={{ top: `${topOffset}px`, height: `${height}px` }}
                                    title={`${meeting.title} - ${format(start, 'HH:mm')}`}
                                >
                                    <div className="font-bold text-primary truncate">{meeting.title}</div>
                                    <div className="text-primary/70 truncate">{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

const MonthGrid = ({ currentDate, meetings, onMeetingClick }: { currentDate: Date, meetings: Meeting[], onMeetingClick: (m: Meeting) => void }) => {
    const start = startOfWeek(startOfMonth(currentDate));
    const days = eachDayOfInterval({ start, end: addDays(start, 41) });

    return (
        <div className="h-full flex flex-col">
            <div className="grid grid-cols-7 border-b border-gray-200">
                {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => (
                    <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-100 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-6">
                {days.map((d, i) => {
                    const isCurrentMonth = isSameMonth(d, currentDate);
                    const dayEvents = meetings.filter(m => isSameDay(new Date(m.startTime), d));

                    return (
                        <div key={i} className={`min-h-[80px] border-b border-r border-gray-100 p-2 relative group hover:bg-gray-50 transition-colors ${!isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'}`}>
                            <div className="flex justify-between items-start mb-1 grid-day-header">
                                <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday(d) ? 'bg-primary text-white shadow-md' : (!isCurrentMonth ? 'text-gray-400' : 'text-gray-900')}`}>
                                    {format(d, 'd')}
                                </span>
                            </div>
                            <div className="space-y-1">
                                {dayEvents.slice(0, 3).map(event => (
                                    <div
                                        key={event.id}
                                        onClick={(e) => { e.stopPropagation(); onMeetingClick(event); }}
                                        className="px-1 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium truncate cursor-pointer hover:bg-primary/20 transition-colors"
                                    >
                                        {format(new Date(event.startTime), 'HH:mm')} {event.title}
                                    </div>
                                ))}
                                {dayEvents.length > 3 && (
                                    <div className="text-[10px] text-gray-400 pl-1">+{dayEvents.length - 3} mais</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const DayGrid = ({ currentDate, meetings, onMeetingClick }: { currentDate: Date, meetings: Meeting[], onMeetingClick: (m: Meeting) => void }) => {
    const hours = Array.from({ length: 11 }, (_, i) => i + 8);

    return (
        <div className="min-w-[600px] h-full flex">
            <div className="w-16 border-r border-gray-200 bg-white z-20 flex-shrink-0 pt-16">
                {hours.map(t => (
                    <div key={t} className="h-32 -mt-2.5 relative text-right pr-2">
                        <span className="relative z-10 bg-white pl-1 text-xs text-gray-500 font-medium">{t}:00</span>
                    </div>
                ))}
            </div>
            <div className="flex-1 relative bg-white">
                <div className="absolute top-0 w-full h-16 border-b border-gray-200 flex items-center px-4 bg-gray-50">
                    <div className="w-12 h-12 bg-primary rounded-lg flex flex-col items-center justify-center text-white mr-4 shadow-sm">
                        <span className="text-xs font-medium uppercase opacity-80">{format(currentDate, 'EEE', { locale: ptBR })}</span>
                        <span className="text-xl font-bold">{format(currentDate, 'd')}</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 capitalize">{format(currentDate, 'EEEE', { locale: ptBR })}</h3>
                    </div>
                </div>

                <div className="pt-16 relative h-full">
                    {hours.map((_, i) => (
                        <div key={i} className="h-32 border-b border-gray-100 w-full"></div>
                    ))}

                    {meetings.filter(m => isSameDay(new Date(m.startTime), currentDate)).map(meeting => {
                        const start = new Date(meeting.startTime);
                        const end = new Date(meeting.endTime);
                        const startHour = getHours(start);
                        const startMin = getMinutes(start);
                        const durationMins = (end.getTime() - start.getTime()) / 60000;

                        const hourHeight = 128;
                        const topOffset = ((startHour - 8) * hourHeight) + ((startMin / 60) * hourHeight);
                        const height = (durationMins / 60) * hourHeight;

                        if (startHour < 8 || startHour > 18) return null;

                        return (
                            <div
                                key={meeting.id}
                                onClick={() => onMeetingClick(meeting)}
                                className="absolute left-4 right-4 bg-primary/5 border-l-4 border-primary rounded-r-lg p-4 shadow-sm border-t border-b border-r border-gray-200 flex flex-col justify-center hover:shadow-md transition-all cursor-pointer hover:scale-[1.01]"
                                style={{ top: `${topOffset}px`, height: `${height}px` }}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-bold text-primary text-lg">{meeting.title}</h4>
                                    <span className="bg-white border border-gray-200 text-gray-500 px-2 py-1 rounded text-xs font-bold">Confirmado</span>
                                </div>
                                <div className="flex items-center gap-6 text-sm text-gray-600">
                                    <span className="flex items-center gap-1"><Clock size={16} /> {format(start, 'HH:mm')} - {format(end, 'HH:mm')}</span>
                                    <span className="flex items-center gap-1"><Video size={16} /> {meeting.provider || 'Video'}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">{meeting.lead?.name}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
