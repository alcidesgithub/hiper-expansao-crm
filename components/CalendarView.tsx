import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Video, 
  Plus, 
  MoreHorizontal, 
  Clock, 
  Copy, 
  CheckCircle,
  Calendar as CalendarIcon,
  Filter,
  Search,
  MapPin,
  X,
  User,
  AlignLeft,
  Link as LinkIcon,
  Check,
  ChevronDown
} from 'lucide-react';

type ViewMode = 'month' | 'week' | 'day';

const CalendarView: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
      lead: '',
      type: 'diagnostico',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      duration: '60', // minutes
      autoLink: true,
      notes: ''
  });

  const renderContent = () => {
      switch (currentView) {
          case 'month':
              return <MonthGrid />;
          case 'day':
              return <DayGrid />;
          default:
              return <WeekGrid />;
      }
  };

  const getHeaderTitle = () => {
      switch (currentView) {
          case 'month': return 'Outubro 2023';
          case 'day': return '11 de Outubro, 2023';
          default: return 'Outubro 10 – 14';
      }
  };

  const handleSaveEvent = (e: React.FormEvent) => {
      e.preventDefault();
      // Here you would typically dispatch an action to save to backend/context
      alert(`Reunião agendada com sucesso para ${newEvent.lead || 'o Lead'}!`);
      setIsModalOpen(false);
      setNewEvent({
          lead: '',
          type: 'diagnostico',
          date: new Date().toISOString().split('T')[0],
          startTime: '10:00',
          duration: '60',
          autoLink: true,
          notes: ''
      });
  };

  return (
    <div className="flex h-full bg-background-light font-display text-slate-800 overflow-hidden -m-4 lg:-m-8 relative">
        
        {/* Left Sidebar: Mini Calendar & Filters */}
        <aside className="w-64 bg-white border-r border-gray-200 hidden xl:flex flex-col p-4 gap-6 overflow-y-auto custom-scrollbar">
            {/* Create Button */}
            <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-primary hover:bg-primary-hover text-white py-3 px-4 rounded-lg font-medium shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
                <Plus size={20} />
                Nova Reunião
            </button>

            {/* Mini Calendar Widget */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-sm text-gray-900">Outubro 2023</h3>
                    <div className="flex gap-1">
                        <button className="p-1 hover:bg-gray-200 rounded text-gray-500"><ChevronLeft size={16} /></button>
                        <button className="p-1 hover:bg-gray-200 rounded text-gray-500"><ChevronRight size={16} /></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-gray-400 font-medium">
                    <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-600">
                    <div className="text-gray-300">29</div>
                    <div className="text-gray-300">30</div>
                    <div className="p-1 hover:bg-gray-200 rounded cursor-pointer">1</div>
                    <div className="p-1 hover:bg-gray-200 rounded cursor-pointer">2</div>
                    <div className="p-1 hover:bg-gray-200 rounded cursor-pointer">3</div>
                    <div className="p-1 hover:bg-gray-200 rounded cursor-pointer">4</div>
                    <div className="p-1 hover:bg-gray-200 rounded cursor-pointer">5</div>
                    <div className="p-1 hover:bg-gray-200 rounded cursor-pointer">6</div>
                    <div className="p-1 hover:bg-gray-200 rounded cursor-pointer">7</div>
                    <div className="p-1 hover:bg-gray-200 rounded cursor-pointer">8</div>
                    <div className="p-1 hover:bg-gray-200 rounded cursor-pointer">9</div>
                    <div className="p-1 bg-primary text-white rounded-full shadow-md font-bold">10</div>
                    <div className="p-1 hover:bg-gray-200 rounded cursor-pointer">11</div>
                    <div className="p-1 hover:bg-gray-200 rounded cursor-pointer">12</div>
                    {/* ... other days */}
                </div>
            </div>

            {/* Calendars Filter */}
            <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Minhas Agendas</h3>
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer group">
                        <input defaultChecked className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary" type="checkbox"/>
                        <span className="w-3 h-3 rounded-full bg-primary"></span>
                        <span className="text-gray-600 group-hover:text-gray-900 transition-colors">Calls de Diagnóstico</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer group">
                        <input defaultChecked className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500 accent-blue-500" type="checkbox"/>
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        <span className="text-gray-600 group-hover:text-gray-900 transition-colors">Reuniões Internas</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer group">
                        <input className="w-4 h-4 text-emerald-500 rounded border-gray-300 focus:ring-emerald-500 accent-emerald-500" type="checkbox"/>
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                        <span className="text-gray-600 group-hover:text-gray-900 transition-colors">Follow-ups</span>
                    </label>
                </div>
            </div>

            {/* Integrations Status */}
            <div className="mt-auto pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-500 font-medium">Integrações</span>
                    <span className="text-emerald-600 text-[10px] font-bold bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Ativo</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm border border-gray-100">
                        <Video size={14} className="text-gray-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">Google Meet conectado</span>
                </div>
            </div>
        </aside>

        {/* Main Content: Calendar Grid */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
            {/* Calendar Toolbar */}
            <header className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-gray-200 bg-white gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 whitespace-nowrap">{getHeaderTitle()}</h2>
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
                        <button className="p-1 hover:bg-white rounded shadow-sm transition-all text-gray-600"><ChevronLeft size={18} /></button>
                        <button className="px-3 text-sm font-medium text-gray-600 hover:text-gray-900">Hoje</button>
                        <button className="p-1 hover:bg-white rounded shadow-sm transition-all text-gray-600"><ChevronRight size={18} /></button>
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

            {/* Calendar Scroll Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-white">
               {renderContent()}
            </div>
        </main>

        {/* Right Sidebar: Upcoming Agenda */}
        <aside className="w-80 bg-white border-l border-gray-200 hidden 2xl:flex flex-col shadow-lg z-10">
            <div className="p-5 border-b border-gray-200 bg-gray-50/50">
                <h3 className="font-bold text-lg text-gray-900">Próximas Reuniões</h3>
                <p className="text-xs text-gray-500 mt-1">Sua agenda para hoje, 11 de Outubro</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {/* Next Up Card */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-primary/20 relative overflow-hidden group ring-1 ring-gray-100">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                    <div className="flex justify-between items-start mb-2">
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">Agora</span>
                        <button className="text-gray-400 hover:text-gray-600">
                            <MoreHorizontal size={16} />
                        </button>
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm">Call Diagnóstico - TechCorp</h4>
                    <p className="text-xs text-gray-500 mb-4">Com Mariana Souza (CEO)</p>
                    <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
                        <Clock size={14} />
                        <span>10:00 - 11:00 (1h)</span>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex-1 bg-primary hover:bg-primary-hover text-white text-sm py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary/20">
                            <Video size={16} /> Entrar
                        </button>
                        <button className="w-10 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center transition-colors">
                            <Copy size={16} />
                        </button>
                    </div>
                </div>

                {/* Upcoming 1 */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 opacity-75 hover:opacity-100 transition-opacity">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase">Em 2 horas</span>
                    </div>
                    <h4 className="font-semibold text-gray-800 text-sm">Demo Produto - Grupo ABC</h4>
                    <p className="text-xs text-gray-500 mb-3">Com Roberto Campos</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs font-mono text-gray-500">13:00 PM</span>
                        <button className="text-primary hover:text-primary-hover text-xs font-medium">Detalhes</button>
                    </div>
                </div>

                {/* Upcoming 2 */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 opacity-75 hover:opacity-100 transition-opacity">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase">Em 5 horas</span>
                    </div>
                    <h4 className="font-semibold text-gray-800 text-sm">Reunião de Alinhamento</h4>
                    <p className="text-xs text-gray-500 mb-3">Time de Vendas</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs font-mono text-gray-500">16:00 PM</span>
                        <button className="text-primary hover:text-primary-hover text-xs font-medium">Detalhes</button>
                    </div>
                </div>

                {/* Pending Actions Widget */}
                <div className="mt-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/20 rounded-full blur-xl"></div>
                    <h4 className="font-semibold text-sm mb-3 relative z-10 flex items-center gap-2">
                        Lembretes Pendentes
                    </h4>
                    <ul className="space-y-2 relative z-10">
                        <li className="flex items-start gap-2 text-xs text-gray-300">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></span>
                            <span>Enviar proposta para TechCorp após a call.</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-gray-300">
                            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span>Confirmar presença no workshop.</span>
                        </li>
                    </ul>
                </div>
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
                                        value={newEvent.lead}
                                        onChange={(e) => setNewEvent({...newEvent, lead: e.target.value})}
                                    >
                                        <option value="" disabled>Selecionar Lead...</option>
                                        <option value="TechCorp">TechCorp - Mariana Souza</option>
                                        <option value="Grupo ABC">Grupo ABC - Roberto Campos</option>
                                        <option value="Farmácias Unidas">Farmácias Unidas - Dr. Paulo</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
                                </div>
                            </div>

                            {/* Type Selector */}
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700">Tipo de Reunião</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-2.5 text-gray-400">
                                        {/* Icon for type, abstract shape */}
                                        <div className="w-4 h-4 border-2 border-gray-400 rounded-sm"></div>
                                    </div>
                                    <select 
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer"
                                        value={newEvent.type}
                                        onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
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
                                        <CalendarIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                        <input 
                                            type="date" 
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                            value={newEvent.date}
                                            onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
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
                                            onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
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
                                                onChange={(e) => setNewEvent({...newEvent, duration: e.target.value})}
                                                className="sr-only"
                                            />
                                            {mins === '60' ? '1h' : mins === '90' ? '1h 30m' : '30 min'}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Google Meet Toggle */}
                            <div className="flex items-center justify-between py-3 border-t border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Video size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Google Meet</p>
                                        <p className="text-xs text-gray-500">Gerar link automaticamente</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={newEvent.autoLink} onChange={(e) => setNewEvent({...newEvent, autoLink: e.target.checked})} />
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
                                    onChange={(e) => setNewEvent({...newEvent, notes: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
                            <button 
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                className="px-4 py-2 rounded-lg bg-[#DF362D] hover:bg-[#c92b23] text-white text-sm font-medium shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                            >
                                <Check size={16} />
                                Confirmar Agendamento
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

    </div>
  );
};

// --- VIEW COMPONENTS ---

const WeekGrid = () => (
    <div className="min-w-[800px] h-full">
        {/* Header Row (Days) */}
        <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-gray-200 sticky top-0 bg-white z-20 shadow-sm">
            <div className="h-16 border-r border-gray-100"></div> 
            <DayHeader day="Seg" date="10" />
            <DayHeader day="Ter" date="11" active />
            <DayHeader day="Qua" date="12" />
            <DayHeader day="Qui" date="13" />
            <DayHeader day="Sex" date="14" />
        </div>

        {/* Calendar Grid Body */}
        <div className="relative grid grid-cols-[60px_repeat(5,1fr)]">
            
            {/* Current Time Indicator Line (Absolute) */}
            <div className="absolute w-full border-t-2 border-primary z-10 pointer-events-none flex items-center" style={{top: '340px'}}>
                <div className="absolute -left-1.5 w-3 h-3 bg-primary rounded-full ring-2 ring-white"></div>
            </div>

            {/* Time Slots Column */}
            <TimeSlotColumn />

            {/* Day Columns with Grid Lines & Events */}
            
            {/* Monday */}
            <div className="border-r border-gray-100 relative border-b border-dashed border-b-gray-100">
                <GridLines />
                {/* Event Card */}
                <div className="absolute top-[85px] left-1 right-1 h-[70px] bg-white border-l-4 border-blue-500 rounded p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer group overflow-hidden ring-1 ring-gray-200">
                    <p className="text-xs font-semibold text-gray-800 truncate">Reunião Interna: Planejamento</p>
                    <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                        <Clock size={10} /> 09:00 - 10:00
                    </p>
                </div>
            </div>

            {/* Tuesday (Today) */}
            <div className="border-r border-gray-100 relative bg-primary/5 min-h-[800px]">
                <GridLines />
                
                {/* High Priority Event */}
                <div className="absolute top-[165px] left-1 right-1 h-[70px] bg-white border-l-4 border-primary rounded p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer group ring-1 ring-primary/20">
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-primary truncate w-10/12">Call Diagnóstico - TechCorp</p>
                        <Video size={14} className="text-primary"/>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <p className="text-[10px] text-primary/80 font-medium">10:00 - 11:00 • Lead Quente</p>
                    </div>
                </div>

                {/* Confirmed Event */}
                <div className="absolute top-[330px] left-1 right-1 h-[70px] bg-emerald-50 border-l-4 border-emerald-500 rounded p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer group ring-1 ring-emerald-100">
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-semibold text-gray-800 truncate w-10/12">Demo Produto - Grupo ABC</p>
                        <Video size={14} className="text-emerald-600"/>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                        <Clock size={10} /> 13:00 - 14:00
                    </p>
                </div>
            </div>

            {/* Wednesday */}
            <div className="border-r border-gray-100 relative">
                <GridLines />
                {/* Standard Event */}
                <div className="absolute top-[250px] left-1 right-1 h-[70px] bg-white border-l-4 border-gray-400 rounded p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer ring-1 ring-gray-200">
                    <p className="text-xs font-semibold text-gray-800 truncate">Almoço com Parceiros</p>
                    <p className="text-xs text-gray-500 mt-1">12:00 - 13:00</p>
                </div>
            </div>

            {/* Thursday */}
            <div className="border-r border-gray-100 relative">
                <GridLines />
                {/* Empty State Cue */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center opacity-30 pointer-events-none">
                    <CalendarIcon size={40} className="text-gray-300 mx-auto mb-2" />
                </div>
            </div>

            {/* Friday */}
            <div className="relative">
                <GridLines />
                <div className="absolute top-[85px] left-1 right-1 h-[70px] bg-primary/5 border-l-4 border-primary rounded p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer ring-1 ring-primary/20">
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-primary truncate w-10/12">Fechamento Mensal</p>
                        <Video size={14} className="text-primary"/>
                    </div>
                    <p className="text-[10px] text-primary/80 mt-1">09:00 - 10:00</p>
                </div>
            </div>
        </div>
    </div>
);

const MonthGrid = () => {
    const days = [
        { date: 29, prev: true }, { date: 30, prev: true }, { date: 1 }, { date: 2 }, { date: 3 }, { date: 4 }, { date: 5 },
        { date: 6 }, { date: 7 }, { date: 8 }, { date: 9 }, { date: 10 }, { date: 11, today: true }, { date: 12, holiday: 'N. Sra Aparecida' },
        { date: 13 }, { date: 14 }, { date: 15 }, { date: 16 }, { date: 17 }, { date: 18 }, { date: 19 },
        { date: 20 }, { date: 21 }, { date: 22 }, { date: 23 }, { date: 24 }, { date: 25 }, { date: 26 },
        { date: 27 }, { date: 28 }, { date: 29 }, { date: 30 }, { date: 31 }, { date: 1, next: true }, { date: 2, next: true }
    ];

    return (
        <div className="h-full flex flex-col">
            <div className="grid grid-cols-7 border-b border-gray-200">
                {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => (
                    <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-100 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-5">
                {days.map((d, i) => (
                    <div key={i} className={`min-h-[100px] border-b border-r border-gray-100 p-2 relative group hover:bg-gray-50 transition-colors ${d.prev || d.next ? 'bg-gray-50/50' : 'bg-white'}`}>
                        <div className="flex justify-between items-start mb-2">
                             <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${d.today ? 'bg-primary text-white shadow-md' : (d.prev || d.next ? 'text-gray-400' : 'text-gray-900')}`}>
                                {d.date}
                             </span>
                             {d.holiday && <span className="text-[10px] text-red-500 font-medium bg-red-50 px-1 rounded">{d.holiday}</span>}
                        </div>
                        
                        {/* Mock Events for Month View */}
                        {d.date === 11 && !d.prev && (
                            <div className="space-y-1">
                                <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold truncate">
                                    10:00 Call Diagnóstico
                                </div>
                                <div className="px-2 py-1 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-medium truncate">
                                    13:00 Demo Produto
                                </div>
                            </div>
                        )}
                        {d.date === 10 && !d.prev && (
                             <div className="px-2 py-1 rounded bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-medium truncate">
                                09:00 Reunião Interna
                             </div>
                        )}
                         {d.date === 14 && !d.prev && (
                             <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-[10px] font-medium truncate">
                                09:00 Fechamento
                             </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const DayGrid = () => (
    <div className="min-w-[600px] h-full flex">
         {/* Time Column */}
         <div className="w-16 border-r border-gray-200 bg-white z-20 flex-shrink-0 pt-16">
             {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
                <div key={t} className="h-32 -mt-2.5 relative text-right pr-2">
                    <span className="relative z-10 bg-white pl-1 text-xs text-gray-500 font-medium">{t}</span>
                </div>
            ))}
         </div>
         
         {/* Main Day Area */}
         <div className="flex-1 relative bg-white">
            <div className="absolute top-0 w-full h-16 border-b border-gray-200 flex items-center px-4 bg-gray-50">
                <div className="w-12 h-12 bg-primary rounded-lg flex flex-col items-center justify-center text-white mr-4 shadow-sm">
                    <span className="text-xs font-medium uppercase opacity-80">Ter</span>
                    <span className="text-xl font-bold">11</span>
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">Terça-feira</h3>
                    <p className="text-xs text-gray-500">4 Reuniões agendadas</p>
                </div>
            </div>

            {/* Grid Lines */}
            <div className="pt-16">
                 {[1,2,3,4,5,6,7,8,9,10].map(i => (
                     <div key={i} className="h-32 border-b border-gray-100 w-full"></div>
                 ))}
                 
                 {/* Current Time Line */}
                 <div className="absolute w-full border-t-2 border-primary z-10 pointer-events-none flex items-center" style={{top: '320px'}}>
                     <div className="absolute -left-1.5 w-3 h-3 bg-primary rounded-full ring-2 ring-white"></div>
                     <div className="absolute right-4 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">10:30</div>
                 </div>

                 {/* Events (Expanded) */}
                 {/* 10:00 - 11:00 */}
                 <div className="absolute top-[290px] left-4 right-4 h-[110px] bg-primary/5 border-l-4 border-primary rounded-r-lg p-4 shadow-sm border-t border-b border-r border-gray-200 flex flex-col justify-center hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-primary text-lg">Call Diagnóstico - TechCorp</h4>
                          <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold animate-pulse">Em andamento</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                          <span className="flex items-center gap-1"><Clock size={16}/> 10:00 - 11:00</span>
                          <span className="flex items-center gap-1"><Video size={16}/> Google Meet</span>
                          <span className="flex items-center gap-1"><MapPin size={16}/> Curitiba, PR</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                          <div className="flex -space-x-2">
                              <img className="w-6 h-6 rounded-full border-2 border-white" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpgPCdwfXn8Vx1TRcNDJ5_sBfEsPSLcZ3f0UhAowrox233QZMpiA4_uQq2dUeTrhOkyMqEoxP4dybaXJ9QzGptb4PJVDrdTAEqKmB80x5Ud1Tfx-af1wSbgWDsKim4pMsDPG3IrqtKO1ABB3FqYb18PcTeAnPgFWX4UsnzZWtbmnj8ht3rZJQ7tqr-bWBFaairw9Prgyr4dXhhd_N8mjKtm6nPx8YJwNScnCiYYD5ZmYEAKHdM3t0vpHLWJ8oefjLP3F8ahT_TYwI" alt=""/>
                              <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">+2</div>
                          </div>
                          <p className="text-xs text-gray-400 self-center">Mariana Souza (CEO) + 2 convidados</p>
                      </div>
                 </div>

                 {/* 13:00 - 14:00 */}
                 <div className="absolute top-[670px] left-4 right-32 h-[110px] bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg p-4 shadow-sm border-t border-b border-r border-emerald-100 flex flex-col justify-center hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-emerald-800 text-lg">Demo Produto - Grupo ABC</h4>
                          <span className="bg-white border border-gray-200 text-gray-500 px-2 py-1 rounded text-xs font-bold">Confirmado</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-emerald-700/80">
                          <span className="flex items-center gap-1"><Clock size={16}/> 13:00 - 14:00</span>
                          <span className="flex items-center gap-1"><Video size={16}/> Google Meet</span>
                      </div>
                 </div>
            </div>
         </div>
    </div>
);

// --- HELPER COMPONENTS ---

const DayHeader = ({ day, date, active }: any) => (
    <div className={`h-16 border-r border-gray-100 flex flex-col items-center justify-center transition-colors ${active ? 'bg-primary/5' : ''}`}>
        <span className={`text-xs font-medium uppercase mb-1 ${active ? 'text-primary font-bold' : 'text-gray-400'}`}>{day}</span>
        <span className={`text-lg font-semibold w-8 h-8 flex items-center justify-center rounded-full ${active ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-gray-900'}`}>{date}</span>
    </div>
);

const TimeSlotColumn = () => (
    <div className="flex flex-col text-xs text-gray-400 font-medium text-right pr-2 bg-white pt-2.5">
        {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
            <div key={t} className="h-20 -mt-2.5 relative">
                <span className="relative z-10 bg-white pl-1">{t}</span>
            </div>
        ))}
    </div>
);

const GridLines = () => (
    <>
        <div className="absolute w-full h-px bg-gray-100 top-20"></div>
        <div className="absolute w-full h-px bg-gray-100 top-40"></div>
        <div className="absolute w-full h-px bg-gray-100 top-60"></div>
        <div className="absolute w-full h-px bg-gray-100 top-80"></div>
    </>
);

export default CalendarView;