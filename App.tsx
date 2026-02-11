import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar as CalendarIcon, 
  Settings, 
  BarChart3, 
  Home, 
  LogOut,
  Menu,
  X,
  Plus,
  Bell,
  Search,
  ChevronDown,
  UserCog
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import KanbanBoard from './components/KanbanBoard';
import CalendarView from './components/CalendarView';
import SettingsPage from './components/SettingsPage';
import Analytics from './components/Analytics';
import FormWizard from './components/FormWizard';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import LeadDetail from './components/LeadDetail';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfUse from './components/TermsOfUse';
import UserManagement from './components/UserManagement';
import ScheduleCall from './components/ScheduleCall';

// Navigation types
type Page = 'login' | 'landing' | 'dashboard' | 'kanban' | 'calendar' | 'settings' | 'analytics' | 'wizard' | 'lead-detail' | 'privacy' | 'terms' | 'user-management' | 'schedule-call';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Simple router switch
  const renderPage = () => {
    switch (currentPage) {
      case 'login': return <Login onLogin={() => setCurrentPage('dashboard')} />;
      case 'landing': return <LandingPage onNavigate={setCurrentPage} />;
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'kanban': return <KanbanBoard onNavigate={setCurrentPage} />;
      case 'calendar': return <CalendarView />;
      case 'settings': return <SettingsPage />;
      case 'analytics': return <Analytics />;
      case 'user-management': return <UserManagement />;
      case 'wizard': return <FormWizard onBack={() => setCurrentPage('landing')} />;
      case 'lead-detail': return <LeadDetail onBack={() => setCurrentPage('kanban')} />;
      case 'privacy': return <PrivacyPolicy onBack={() => setCurrentPage('landing')} />;
      case 'terms': return <TermsOfUse onBack={() => setCurrentPage('landing')} />;
      case 'schedule-call': return <ScheduleCall onBack={() => setCurrentPage('landing')} />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  // If landing, login, wizard, privacy, terms, or schedule-call, render without dashboard layout
  if (currentPage === 'landing' || currentPage === 'login' || currentPage === 'wizard' || currentPage === 'privacy' || currentPage === 'terms' || currentPage === 'schedule-call') {
    return renderPage();
  }

  // Dashboard Layout
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center h-16 px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl mr-3">H</div>
          <span className="font-bold text-xl text-secondary">Hiperfarma</span>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          <NavButton active={currentPage === 'dashboard'} onClick={() => setCurrentPage('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavButton active={currentPage === 'kanban'} onClick={() => setCurrentPage('kanban')} icon={<Users size={20} />} label="Leads CRM" />
          <NavButton active={currentPage === 'calendar'} onClick={() => setCurrentPage('calendar')} icon={<CalendarIcon size={20} />} label="Agenda" />
          <NavButton active={currentPage === 'analytics'} onClick={() => setCurrentPage('analytics')} icon={<BarChart3 size={20} />} label="Relatórios" />
          <NavButton active={currentPage === 'user-management'} onClick={() => setCurrentPage('user-management')} icon={<UserCog size={20} />} label="Gestão de Usuários" />
          <NavButton active={currentPage === 'settings'} onClick={() => setCurrentPage('settings')} icon={<Settings size={20} />} label="Configurações" />
          
          <div className="pt-8 mt-8 border-t border-gray-100">
             <NavButton active={false} onClick={() => setCurrentPage('landing')} icon={<Home size={20} />} label="Voltar ao Site" />
             <NavButton active={false} onClick={() => setCurrentPage('login')} icon={<LogOut size={20} />} label="Sair" />
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 hidden sm:block">
              {currentPage === 'dashboard' && 'Visão Geral'}
              {currentPage === 'kanban' && 'Funil de Vendas'}
              {currentPage === 'calendar' && 'Agenda'}
              {currentPage === 'settings' && 'Configurações'}
              {currentPage === 'analytics' && 'Analytics Pro'}
              {currentPage === 'lead-detail' && 'Detalhes do Lead'}
              {currentPage === 'user-management' && 'Gestão de Acesso'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
               <input 
                 type="text" 
                 placeholder="Buscar..." 
                 className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/20 outline-none"
               />
            </div>
            
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
            </button>

            <div className="h-8 w-px bg-gray-200 mx-1"></div>

            <button className="flex items-center gap-2">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrS3KDcRAElWPePn7USGvrhdHgJWr--E0m1Eg96fh2QjjkwTRI_woJpolEcuXjSf5p6IViMoCfmeXJBLKGi-Ql6JhEcnpU5bbX38vte0c7HWKQJhFLRTgbx42JEFdSMHRZUe-37PWtsSbcQjnEaKpHPAozd2SUY7-YGtMpI75Wgxpx-WGlRvj-UQdtPRLzC0UPu1NHn4xcxPqyYgL5y5NbeDoIWEhy0RUlAHpSaFVIoUS4zLrmV8UuVWDpldb4t_RKRAZ3lwXBKO4" 
                alt="Profile" 
                className="w-8 h-8 rounded-full border border-gray-200"
              />
              <span className="hidden md:block text-sm font-medium text-gray-700">Ricardo Mendes</span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      active 
        ? 'bg-primary/10 text-primary font-medium' 
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default App;