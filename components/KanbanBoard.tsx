import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  ChevronRight, 
  CheckCircle, 
  Layout,
  ChevronDown,
  Edit2,
  XCircle,
  X,
  User,
  Building,
  Mail,
  Phone,
  DollarSign,
  ArrowRight
} from 'lucide-react';

interface KanbanBoardProps {
    onNavigate: (page: any) => void;
}

// Data Types
interface LeadCard {
  id: string;
  name: string;
  company: string;
  score: string;
  scoreClass: string;
  time: string;
  avatar?: string;
  avatars?: string[];
  initials?: string;
  initialsBg?: string;
  amount?: string;
  amountColor?: string;
  isLate?: boolean;
  urgent?: boolean;
  emailOpen?: boolean;
  event?: { time: string; type?: 'future' | 'urgent' };
  highlight?: boolean;
  borderLeft?: string;
  canEdit?: boolean;
  isWin?: boolean;
  isLoss?: boolean;
}

interface ColumnData {
  id: string;
  title: string;
  count: number;
  dotColor: string;
  isWinColumn?: boolean;
  isLossColumn?: boolean;
  cards: LeadCard[];
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ onNavigate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({
      name: '',
      email: '',
      whatsapp: '',
      pharmacyName: '',
      stores: '',
      revenue: '',
      role: '',
      state: '',
      source: ''
  });

  // Initial State based on previous hardcoded data
  const [columns, setColumns] = useState<ColumnData[]>([
      {
          id: 'new', title: 'Leads novos', count: 5, dotColor: 'bg-yellow-400',
          cards: [
              { id: '1', score: '95 (A)', scoreClass: 'bg-green-100 text-green-800', name: 'Roberto Santos', company: 'TechSolutions Ltda', time: '1d na etapa', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpgPCdwfXn8Vx1TRcNDJ5_sBfEsPSLcZ3f0UhAowrox233QZMpiA4_uQq2dUeTrhOkyMqEoxP4dybaXJ9QzGptb4PJVDrdTAEqKmB80x5Ud1Tfx-af1wSbgWDsKim4pMsDPG3IrqtKO1ABB3FqYb18PcTeAnPgFWX4UsnzZWtbmnj8ht3rZJQ7tqr-bWBFaairw9Prgyr4dXhhd_N8mjKtm6nPx8YJwNScnCiYYD5ZmYEAKHdM3t0vpHLWJ8oefjLP3F8ahT_TYwI', canEdit: true },
              { id: '2', score: '55 (C)', scoreClass: 'bg-gray-100 text-gray-600', name: 'Mariana Costa', company: 'Varejo Express', time: '2h na etapa', initials: 'MC', initialsBg: 'bg-gray-200 text-gray-500' }
          ]
      },
      {
          id: 'contact', title: 'Contato realizado', count: 3, dotColor: 'bg-yellow-400',
          cards: [
              { id: '3', score: '72 (B)', scoreClass: 'bg-yellow-100 text-yellow-800', name: 'Carla Mendes', company: 'Agência Criativa', time: '2d na etapa', emailOpen: true, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDO0A1kiusfYLZV6xPiznqaOU_ewwvE1zFvYEdnSBTCE4QGNFSUwz_iFlu0iGO9T-8T9k9Zy27EEZtYCLLS3U0e0TEoRj5AMclf_KvYbxEgRfg_cEM7QN5PEuGkpyf-bixxEaA1ngbGY1vHr7Q4mKxtVKj7oi44rj7eCy4KY8G_FyppSiRGqu65ltcSobUYiScybc8RxTQUF6Ag8T78voxo7AOxr7ALXFb0FNarHvZuqU_37sRHLdYVat3gJwEpBKsNpWOW4zNL8pM' },
              { id: '4', score: '65 (B)', scoreClass: 'bg-yellow-100 text-yellow-800', name: 'Pedro Alvares', company: 'Logística BR', time: '5d na etapa', isLate: true, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC2rzFBholhlzimqmr9iZHqifNZRvMP6Ot8HaaA8Hft-9epleKo2smMMMEjakfZh9vtQQvW73338WzQDQaBxh-PET73v7TScXlzufa-W0u5VCdDBgozT3V38V6AFpvN888exSnqNcxHxyJqqMCGF-M71ARNhfP4_N7miWDVKc9lzqbOxieP4srJuFbl6mglDUqTUyDe4n7ckIedWAyCSs56RmYGzocUYZjT9QHf1Uom6OhQeUneXX3njtNlvP28hOEuW6hGK2to9eg' }
          ]
      },
      {
          id: 'schedule', title: 'Call agendada', count: 4, dotColor: 'bg-yellow-400',
          cards: [
              { id: '5', score: '90 (A)', scoreClass: 'bg-green-100 text-green-800', name: 'Grupo Horizon', company: 'CEO: Lucas Ferraz', time: '1d na etapa', borderLeft: 'border-l-4 border-l-purple-500', event: { time: "Hoje, 14:00" }, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1yi5BKFKtCBh8KqWIvhGilqcGPoJfnzLt9Xp_OzraFG43P6u4JJLSPsffouEvySt9ID_aY4Za8jYophR4I68fdLmljAXR3N41an5rk80xosmyqAc4CkqYaLppmPWqjiQrASYrnbMEaMp3i7iGFfKg_ksBxpEeqjAiWxObDfJs_rxg4zeR55tyf1602OW2QwjN5GfkGxhnJUpJlNsM1FjlAS7oV-jJOuxi8rK7ShO7edr6DsncV2JrSo49M0dPQLyOzX0KPPJ541A' },
              { id: '6', score: '75 (B)', scoreClass: 'bg-yellow-100 text-yellow-800', name: 'Fernanda Lima', company: 'SoftHouse', time: '3d na etapa', event: { time: "Amanhã, 10:30", type: "future" }, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDq7WBkLuSuMl--Z8JVh-wWl3xeyfy4gY4F-ykM2h77ahETROAw5DY9e--ul5PfCgw-T4AvmXZxxd5Pg0qdsQPbm2dJqRBSdb2YkyjxN5I-4L7VT6u0o_G94TNm8mtprcnX6gKWTeh6cpxqAwAzKpL4B3Y1iGt9Cc_5B3HRpqbnvDTgOFtCOzr3BMnCHlouTj_YG9lVxZiawdVIyuCdST-b4eXRaQ5C5-qCXmgNg9ye9HpAlgPqTgBO4LHzEksYGIAiUPpUrEbeqZY' }
          ]
      },
      {
          id: 'call_done', title: 'Call realizada', count: 2, dotColor: 'bg-yellow-400',
          cards: [
              { id: '7', score: '88 (A)', scoreClass: 'bg-green-100 text-green-800', name: 'Global Trading', company: 'Import/Export', time: '1d na etapa', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCthQCPXANzHHpVmp4AZj08xfcrq7hbeURHXCOUrT8S5qj7j0hynK3brVE4mHdrAkDpjxM1KpRU6qM5RwMIpjH__vn1S_4JD85FUgjjC3Y6pwTWl7L8P5Y80skfLtv9MLxJmkjJLrAyLNki-370UZ5jb6wy7b-oD197jXnnguLRh_z0J6TH8DAILWeuZs9bNmEUvW5dLqbg5JgdKY50apJHBnuhuaxWguzhfB1FgY8lNqqk6RwG9rotWh74YwumTXaWW84UBStHXoM' }
          ]
      },
      {
          id: 'proposal', title: 'Proposta enviada', count: 6, dotColor: 'bg-yellow-400',
          cards: [
              { id: '8', score: '92 (A)', scoreClass: 'bg-green-100 text-green-800', name: 'Banco Centralizado', company: 'Diretoria', amount: 'R$ 45.000', time: '2d na etapa', highlight: true, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCB43Tb6D3RStAcJt8LeGj9TP3vINw7uS6dqXetDdXQzVQUtlxrrXx1CU8FmjhTuvqm0N44yAWiKY6_udBzt-lcQ4hjpXmTCrkxgTXM5gEjJis7bwrB1NXKl9hd6lhuDv5qTfVtDoGvoBxNo8oBfOAyCVMDJ31mRJarfd9daFMGZL8QFcd-kj_pnUdx5Y8hUiXlp7NsiIo-AHz5RQPo8SpgR6MDnMZueWnf6Hpx956XPd5loCnqGridbwk1U2bb_ETm4TbwvigDtLE' },
              { id: '9', score: '68 (B)', scoreClass: 'bg-yellow-100 text-yellow-800', name: 'StartUp X', company: 'SaaS B2B', amount: 'R$ 12.000', time: '5d na etapa', initials: 'SX', initialsBg: 'bg-rose-200 text-rose-700' }
          ]
      },
      {
          id: 'decision', title: 'Em decisão', count: 2, dotColor: 'bg-yellow-400',
          cards: [
              { id: '10', score: '96 (A)', scoreClass: 'bg-green-100 text-green-800', name: 'Indústria Beta', company: 'Contrato Anual', amount: 'R$ 80.000', time: '1d na etapa', borderLeft: 'border-l-4 border-l-primary', urgent: true, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSJQImR1hnp-ZcupfAQXieg_gl-DAU6IgRuDicNCLfCYrNIbM57YPzwsF9eBAbwm8K-ECmfdCezY0US4bTTtMPoOY1xNgjDX_-DlehJ_sU2EtTQiFBOej4xU52p53GRVYN9PHGhQ9x7AMz8iaBzTLUDGhbmWMeq8BNVxFYQHp7TTbga32SrKrquGJPZ5vU9WUG8rekCiuyRy-72R7RMCOJrF_8BnSeGAhyNjpG2JORJjIqhZnm7AJFFVZAD7MyK1xUe0W79Y4fN_g' }
          ]
      },
      {
          id: 'won', title: 'Fechado', count: 12, dotColor: 'bg-green-500', isWinColumn: true,
          cards: [
              { id: '11', score: 'Ganho', scoreClass: 'bg-green-100 text-green-700', name: 'E-comm Brasil', company: 'Projeto Q3', amount: 'R$ 25.000', amountColor: 'text-green-700', time: '12 Fev', isWin: true, avatars: ["https://lh3.googleusercontent.com/aida-public/AB6AXuBSKAADD6YVrx7neZMn_7nDRHRYSGsKut6_ssmuKGL8oOOKZ3PChOertyvlZa8iP7guAOpy0tja3FPwMFchOx-TZ7mP7iDExdENXjijJlKZ45Tc4rYumhyn3aVusGaC-WxP6vDdRhdRiX40_QkOk39_5tOVscrYWfy5sLaeXgfpJHi_0TP8IeismxNjplwq4MSfMY-Xd4iTuN4qTwOAYcRaFk5KJ2HEwEbTRngRJl7UCT-r1o8MGeRq_CdcaHxQzqzt6-ramtCdI_I", "https://lh3.googleusercontent.com/aida-public/AB6AXuBkGC-J6ET_mkIXQ8oiyeVz5l-Jbp-sQ6BhXMAvw3p55EreFaKUUzt1crfRlpDu3RKL9V6rOD-k4pAEJXpA7vVSQdariE2JzW-Yg9Xt8lmtuAi5gayraqWeURGi8fMSKFoGcl2CFcWnl6cYWMq4_uKQNbSThzhmLursGiX9WiceD_Dh3AwQjiP3XmEiC4dwk56cPghArTM-_CLkWmm1R1dhTah3f9pGoyQTaEK47pQYK_XODg3PPIpq4xCgxxykzrG1jZoDLXROnHU"] },
              { id: '12', score: 'Ganho', scoreClass: 'bg-green-100 text-green-700', name: 'TechEdu', company: 'Assinatura', amount: 'R$ 15.000', amountColor: 'text-green-700', time: '12 Fev', isWin: true, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbapEUlQDge7loxt8Z2ZAY0Y-m027eJK0vwPMDboEJG6JbfGs9zjCulmIUOpQSFnye3tN7FZfWhBdDsmzYbNvpv6JUxxvVxeoUGec_DlAuGMS__jx_t0y92YF49n2UxbohkSjRKuBdfTcsVhzKXtgtK0dhBGUnvyf2wDU_OJkKbPv0EW3ItdNNNd-HrDQgyKE01dLmUE3UIYas82ad8gXcjjiXsH2kUs6UAOb5UVZLEHvUgCIcHQ76ipN426BRUrOArldtEvXHG30' }
          ]
      },
      {
          id: 'lost', title: 'Sem fit', count: 4, dotColor: 'bg-gray-400', isLossColumn: true,
          cards: [
              { id: '13', score: '25 (D)', scoreClass: 'bg-gray-100 text-gray-500', name: 'Farmácia Popular Bairro', company: 'Faturamento baixo', time: '15 Fev', isLoss: true, initials: 'FP', initialsBg: 'bg-gray-300 text-gray-600' },
              { id: '14', score: '30 (D)', scoreClass: 'bg-gray-100 text-gray-500', name: 'Drogaria Exemplo', company: 'Sem perfil', time: '10 Fev', isLoss: true, initials: 'DE', initialsBg: 'bg-gray-300 text-gray-600' }
          ]
      }
  ]);

  const handleAddLead = (e: React.FormEvent) => {
      e.preventDefault();
      
      const newCard: LeadCard = {
          id: Date.now().toString(),
          score: 'N/A', // New leads score is pending
          scoreClass: 'bg-gray-100 text-gray-600',
          name: newLead.name,
          company: newLead.pharmacyName + (newLead.stores ? ` (${newLead.stores} lojas)` : ''),
          // We could map revenue to amount, but keeping it simple for now
          time: 'Agora',
          initials: newLead.name.substring(0, 2).toUpperCase(),
          initialsBg: 'bg-blue-100 text-blue-700',
          canEdit: true
      };

      const updatedColumns = columns.map(col => {
          if (col.id === 'new') {
              return {
                  ...col,
                  count: col.count + 1,
                  cards: [newCard, ...col.cards]
              };
          }
          return col;
      });

      setColumns(updatedColumns);
      setIsModalOpen(false);
      setNewLead({ 
          name: '', 
          email: '', 
          whatsapp: '', 
          pharmacyName: '', 
          stores: '', 
          revenue: '', 
          role: '', 
          state: '', 
          source: '' 
      }); 
  };

  return (
    <div className="flex flex-col h-full bg-background-light font-display text-slate-800 overflow-hidden">
      
      {/* Custom Styles for this view */}
      <style>{`
        .kanban-container::-webkit-scrollbar {
            height: 10px;
            width: 10px;
        }
        .kanban-container::-webkit-scrollbar-track {
            background: transparent;
        }
        .kanban-container::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 20px;
            border: 3px solid transparent;
            background-clip: content-box;
        }
        .kanban-column::-webkit-scrollbar {
            width: 6px;
        }
        .kanban-column::-webkit-scrollbar-thumb {
            background-color: #e2e8f0;
            border-radius: 4px;
        }
      `}</style>

      {/* Header Specific to Kanban */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white shadow-sm shadow-primary/30">
                <Layout size={16} fill="currentColor" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-gray-900">Pipeline de Expansão</h1>
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            {/* Breadcrumb */}
            <nav className="hidden md:flex items-center text-sm text-gray-500">
                <span className="hover:text-primary cursor-pointer transition-colors">Vendas</span>
                <ChevronRight size={14} className="mx-1" />
                <span className="text-primary font-medium bg-primary/10 px-2 py-0.5 rounded text-xs">Funil Digital</span>
            </nav>
        </div>
        
        <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative group hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                    className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none placeholder:text-gray-400" 
                    placeholder="Buscar lead..." 
                    type="text"
                />
            </div>
            
            {/* Filters */}
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                <Filter size={18} />
                <span className="hidden md:inline">Filtros</span>
            </button>
            
            {/* User Filter */}
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden relative">
                    <img alt="Avatar" className="object-cover w-full h-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrS3KDcRAElWPePn7USGvrhdHgJWr--E0m1Eg96fh2QjjkwTRI_woJpolEcuXjSf5p6IViMoCfmeXJBLKGi-Ql6JhEcnpU5bbX38vte0c7HWKQJhFLRTgbx42JEFdSMHRZUe-37PWtsSbcQjnEaKpHPAozd2SUY7-YGtMpI75Wgxpx-WGlRvj-UQdtPRLzC0UPu1NHn4xcxPqyYgL5y5NbeDoIWEhy0RUlAHpSaFVIoUS4zLrmV8UuVWDpldb4t_RKRAZ3lwXBKO4"/>
                </div>
                <span className="hidden md:inline">Meus Leads</span>
                <ChevronDown size={16} />
            </button>

            {/* CTA - Now opens Modal */}
            <button 
                className="ml-2 flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-primary/20 transition-all active:scale-95"
                onClick={() => setIsModalOpen(true)}
            >
                <Plus size={18} />
                <span>Novo Lead</span>
            </button>
        </div>
      </header>

      {/* Main Board Area */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden kanban-container bg-background-light p-6">
        <div className="flex h-full gap-4 min-w-max pb-2">
            {columns.map((column) => (
                <Column 
                    key={column.id} 
                    title={column.title} 
                    count={column.cards.length} 
                    dotColor={column.dotColor} 
                    isWinColumn={column.isWinColumn} 
                    isLossColumn={column.isLossColumn}
                >
                    {column.cards.map((card) => (
                        <Card 
                            key={card.id}
                            {...card}
                            onClick={() => onNavigate('lead-detail')}
                        />
                    ))}
                </Column>
            ))}
        </div>
      </main>

      {/* New Lead Modal - Expanded */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all animate-in zoom-in-95 duration-200">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-slate-100">
                      <div>
                          <h2 className="text-xl font-bold text-slate-800">Adicionar Novo Lead</h2>
                          <p className="text-sm text-slate-500 mt-1">Insira os dados para cadastrar no CRM de expansão.</p>
                      </div>
                      <button 
                          onClick={() => setIsModalOpen(false)}
                          className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                      >
                          <X size={24} />
                      </button>
                  </div>
                  
                  {/* Form Content */}
                  <div className="p-6">
                      <form className="space-y-6">
                          {/* Informações Pessoais */}
                          <div>
                              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Informações Pessoais</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                      <label className="text-sm font-medium text-slate-700">Nome Completo</label>
                                      <input 
                                          type="text" 
                                          className="w-full rounded-lg border-slate-300 bg-white text-slate-800 text-sm focus:ring-primary focus:border-primary shadow-sm border py-2 px-3 outline-none" 
                                          placeholder="Ex: Ana Souza"
                                          value={newLead.name}
                                          onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                                      />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-sm font-medium text-slate-700">E-mail Profissional</label>
                                      <input 
                                          type="email" 
                                          className="w-full rounded-lg border-slate-300 bg-white text-slate-800 text-sm focus:ring-primary focus:border-primary shadow-sm border py-2 px-3 outline-none" 
                                          placeholder="nome@empresa.com"
                                          value={newLead.email}
                                          onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                                      />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-sm font-medium text-slate-700">WhatsApp</label>
                                      <input 
                                          type="tel" 
                                          className="w-full rounded-lg border-slate-300 bg-white text-slate-800 text-sm focus:ring-primary focus:border-primary shadow-sm border py-2 px-3 outline-none" 
                                          placeholder="(00) 00000-0000"
                                          value={newLead.whatsapp}
                                          onChange={(e) => setNewLead({...newLead, whatsapp: e.target.value})}
                                      />
                                  </div>
                              </div>
                          </div>

                          <div className="h-px bg-slate-100"></div>

                          {/* Dados da Farmácia */}
                          <div>
                              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Dados da Farmácia</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                      <label className="text-sm font-medium text-slate-700">Nome da Farmácia</label>
                                      <input 
                                          type="text" 
                                          className="w-full rounded-lg border-slate-300 bg-white text-slate-800 text-sm focus:ring-primary focus:border-primary shadow-sm border py-2 px-3 outline-none" 
                                          placeholder="Farmácia Exemplo Ltda"
                                          value={newLead.pharmacyName}
                                          onChange={(e) => setNewLead({...newLead, pharmacyName: e.target.value})}
                                      />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-sm font-medium text-slate-700">Número de Lojas</label>
                                      <select 
                                          className="w-full rounded-lg border-slate-300 bg-white text-slate-800 text-sm focus:ring-primary focus:border-primary shadow-sm border py-2 px-3 outline-none"
                                          value={newLead.stores}
                                          onChange={(e) => setNewLead({...newLead, stores: e.target.value})}
                                      >
                                          <option value="">Selecione...</option>
                                          <option value="1">1 Loja</option>
                                          <option value="2-5">2 a 5 Lojas</option>
                                          <option value="6-10">6 a 10 Lojas</option>
                                          <option value="10+">Mais de 10 Lojas</option>
                                      </select>
                                  </div>
                                  <div className="space-y-1.5 md:col-span-2">
                                      <label className="text-sm font-medium text-slate-700">Faturamento Estimado</label>
                                      <select 
                                          className="w-full rounded-lg border-slate-300 bg-white text-slate-800 text-sm focus:ring-primary focus:border-primary shadow-sm border py-2 px-3 outline-none"
                                          value={newLead.revenue}
                                          onChange={(e) => setNewLead({...newLead, revenue: e.target.value})}
                                      >
                                          <option value="">Selecione uma faixa...</option>
                                          <option value="<50k">Até R$ 50.000</option>
                                          <option value="50k-150k">R$ 50.000 - R$ 150.000</option>
                                          <option value="150k-500k">R$ 150.000 - R$ 500.000</option>
                                          <option value="500k+">Acima de R$ 500.000</option>
                                      </select>
                                  </div>
                              </div>
                          </div>

                          <div className="h-px bg-slate-100"></div>

                          {/* Qualificação */}
                          <div>
                              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Qualificação</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                      <label className="text-sm font-medium text-slate-700">Cargo do Lead</label>
                                      <select 
                                          className="w-full rounded-lg border-slate-300 bg-white text-slate-800 text-sm focus:ring-primary focus:border-primary shadow-sm border py-2 px-3 outline-none"
                                          value={newLead.role}
                                          onChange={(e) => setNewLead({...newLead, role: e.target.value})}
                                      >
                                          <option value="">Selecione...</option>
                                          <option value="owner">Proprietário / Sócio</option>
                                          <option value="manager">Gerente de Compras</option>
                                          <option value="pharmacist">Farmacêutico Responsável</option>
                                          <option value="other">Outro</option>
                                      </select>
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-sm font-medium text-slate-700">Estado</label>
                                      <select 
                                          className="w-full rounded-lg border-slate-300 bg-white text-slate-800 text-sm focus:ring-primary focus:border-primary shadow-sm border py-2 px-3 outline-none"
                                          value={newLead.state}
                                          onChange={(e) => setNewLead({...newLead, state: e.target.value})}
                                      >
                                          <option value="">Selecione...</option>
                                          <option value="PR">Paraná (PR)</option>
                                          <option value="SC">Santa Catarina (SC)</option>
                                          <option value="other">Outros Estados</option>
                                      </select>
                                  </div>
                                  <div className="space-y-1.5 md:col-span-2">
                                      <label className="text-sm font-medium text-slate-700">Origem</label>
                                      <select 
                                          className="w-full rounded-lg border-slate-300 bg-white text-slate-800 text-sm focus:ring-primary focus:border-primary shadow-sm border py-2 px-3 outline-none"
                                          value={newLead.source}
                                          onChange={(e) => setNewLead({...newLead, source: e.target.value})}
                                      >
                                          <option value="">Como chegou até nós?</option>
                                          <option value="referral">Indicação</option>
                                          <option value="google">Google / Busca Orgânica</option>
                                          <option value="meta">Meta Ads (Facebook/Instagram)</option>
                                          <option value="outbound">Prospecção Ativa</option>
                                          <option value="other">Outros Eventos</option>
                                      </select>
                                  </div>
                              </div>
                          </div>
                      </form>
                  </div>

                  {/* Footer Buttons */}
                  <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                      <button 
                          onClick={() => setIsModalOpen(false)}
                          className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={handleAddLead}
                          className="px-5 py-2.5 text-sm font-medium text-white bg-[#DF362D] hover:bg-[#c92e26] rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center gap-2 active:scale-95"
                      >
                          <span>Criar e Qualificar</span>
                          <ArrowRight size={16} />
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

// --- Sub-components ---

const Column = ({ title, count, dotColor, children, isWinColumn, isLossColumn }: any) => (
    <div className="w-80 flex-shrink-0 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
                <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isWinColumn ? 'bg-green-100 text-green-700' : isLossColumn ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-600'}`}>
                    {count}
                </span>
            </div>
            <button className="text-gray-400 hover:text-primary transition-colors">
                <MoreHorizontal size={18} />
            </button>
        </div>
        <div className={`flex-1 rounded-xl p-2 overflow-y-auto kanban-column space-y-3 border 
            ${isWinColumn ? 'bg-green-50/50 border-green-200 border-dashed' : 
              isLossColumn ? 'bg-gray-50/80 border-gray-200 border-dashed opacity-75' : 
              'bg-[#f0efef] border-gray-200'}`}>
            {children}
        </div>
    </div>
);

const Card = ({ 
    score, 
    scoreClass, 
    name, 
    company, 
    time, 
    avatar, 
    avatars,
    initials, 
    initialsBg, 
    amount, 
    amountColor,
    isLate, 
    urgent, 
    emailOpen, 
    event, 
    highlight, 
    borderLeft, 
    canEdit, 
    isWin, 
    isLoss,
    onClick 
}: any) => {
    return (
        <div 
            onClick={onClick}
            className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200/60 hover:border-primary/50 cursor-grab group transition-colors relative 
                ${borderLeft ? borderLeft : ''} 
                ${isWin ? 'opacity-80 hover:opacity-100 border-green-200' : ''}
                ${isLoss ? 'opacity-60 hover:opacity-100 border-gray-200 grayscale' : ''}
                ${highlight ? 'overflow-hidden' : ''}
            `}
        >
             {highlight && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/10 to-transparent pointer-events-none"></div>
             )}

            <div className="flex justify-between items-start mb-2 relative z-10">
                <span className={`${scoreClass} text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>
                    {score}
                </span>
                
                {/* Right side indicators */}
                <div className="flex gap-1 items-center">
                    {amount && <span className={`text-xs font-bold ${amountColor || 'text-gray-700'}`}>{amount}</span>}
                    {emailOpen && <span className="w-2 h-2 rounded-full bg-green-500" title="Email aberto"></span>}
                    {canEdit && <Edit2 size={16} className="text-gray-400 group-hover:opacity-100 opacity-0 transition-opacity cursor-pointer" />}
                </div>
            </div>

            <h4 className={`font-semibold text-gray-800 mb-0.5 relative z-10 ${isWin || isLoss ? 'line-through decoration-gray-400' : ''}`}>
                {name}
            </h4>
            <p className="text-xs text-gray-500 mb-3 font-medium relative z-10">{company}</p>

            {event && (
                <div className={`${event.type === 'future' ? 'bg-gray-50 text-gray-600' : 'bg-purple-50 text-purple-700'} rounded p-2 mb-3 flex items-center gap-2 text-xs`}>
                    <Calendar size={16} />
                    <span className="font-medium">{event.time}</span>
                </div>
            )}

            {urgent && (
                <div className="flex gap-2 mb-3">
                    <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-medium">Urgente</span>
                </div>
            )}

            <div className={`flex items-center justify-between pt-3 border-t ${isWin || isLoss ? 'border-transparent' : 'border-gray-100'} relative z-10`}>
                
                {!isWin && !isLoss ? (
                    <div className={`flex items-center gap-1.5 text-xs ${isLate ? 'text-orange-500 font-medium bg-orange-50 px-1.5 py-0.5 rounded' : 'text-gray-400'}`}>
                        {isLate ? <AlertTriangle size={14} /> : <Clock size={14} />}
                        <span>{time}</span>
                    </div>
                ) : (
                    <div className="w-full text-xs text-gray-400 flex items-center gap-1">
                        {isWin && <CheckCircle size={14} className="text-green-600"/>}
                        {isLoss && <XCircle size={14} className="text-gray-400"/>}
                        <span>{time}</span>
                    </div>
                )}

                <div className="flex -space-x-2">
                    {avatars ? (
                        <>
                            <img className="w-6 h-6 rounded-full border-2 border-white z-20" src={avatars[0]} alt="" />
                            <img className="w-6 h-6 rounded-full border-2 border-white z-10 opacity-60 grayscale" src={avatars[1]} alt="" />
                        </>
                    ) : (
                        <>
                            {avatar && <img className="w-6 h-6 rounded-full border-2 border-white" src={avatar} alt="" />}
                            {initials && (
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white ${initialsBg}`}>
                                    {initials}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default KanbanBoard;