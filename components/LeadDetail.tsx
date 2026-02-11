import React, { useState } from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  History, 
  Store, 
  StickyNote, 
  CheckSquare, 
  Paperclip, 
  Bold, 
  Timer, 
  User, 
  Smartphone
} from 'lucide-react';

interface LeadDetailProps {
  onBack: () => void;
}

const LeadDetail: React.FC<LeadDetailProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('timeline');

  return (
    <div className="h-full bg-[#F8F6F6] font-display text-gray-800">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar */}
        <aside className="lg:col-span-3 xl:col-span-3 space-y-6">
          
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 relative">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Roberto Almeida</h1>
                  <p className="text-sm text-gray-500">Gerente de Compras</p>
                  <p className="text-xs font-semibold text-primary mt-1">Farmácia São João - Filial 04</p>
                </div>
              </div>
              
              <div className="mt-6 bg-red-50 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  A
                </div>
                <div>
                  <p className="text-xs text-primary font-semibold uppercase tracking-wider">Lead Score</p>
                  <p className="text-sm font-medium text-gray-900">Prioridade Máxima</p>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <button className="w-full bg-primary hover:bg-red-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm shadow-primary/30 transition-all">
                  <Calendar size={18} />
                  Agendar Reunião
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button className="bg-white border border-gray-200 hover:border-primary/50 text-gray-700 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium">
                    <Mail size={18} />
                    Email
                  </button>
                  <button className="bg-white border border-gray-200 hover:border-primary/50 text-gray-700 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium">
                    <Phone size={18} />
                    Ligar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Informações de Contato</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="text-gray-400 mt-0.5" size={18} />
                <div className="text-sm overflow-hidden">
                  <p className="text-gray-500 text-xs">Email Comercial</p>
                  <a href="#" className="text-gray-900 hover:text-primary transition-colors font-medium break-all" title="compras@farmasaojoao.com">
                    compras@farmasaojoao.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Smartphone className="text-gray-400 mt-0.5" size={18} />
                <div className="text-sm">
                  <p className="text-gray-500 text-xs">Celular / WhatsApp</p>
                  <span className="text-gray-900 font-medium">(11) 98765-4321</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="text-gray-400 mt-0.5" size={18} />
                <div className="text-sm">
                  <p className="text-gray-500 text-xs">Localização</p>
                  <span className="text-gray-900 font-medium">Av. Paulista, 1000 - SP</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Metrics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Métricas Chave</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500">Dias no Funil</p>
                <p className="text-xl font-bold text-gray-900">12</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500">Interações</p>
                <p className="text-xl font-bold text-gray-900">8</p>
              </div>
              <div className="col-span-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500">Probabilidade de Fechamento</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <span className="text-sm font-bold text-green-600">75%</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-9 xl:col-span-9 flex flex-col gap-6">
          
          {/* Pipeline Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="w-full">
              <div className="flex justify-between text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                <span>Novo Lead</span>
                <span>Qualificação</span>
                <span className="text-primary font-bold">Negociação</span>
                <span>Fechamento</span>
              </div>
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-primary w-3/4 rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button className="bg-white border border-gray-200 hover:border-primary/50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Perdido
              </button>
              <button className="bg-primary hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm shadow-primary/30 transition-all flex items-center gap-2">
                Mudar Estágio
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Timeline & Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[600px]">
            <div className="border-b border-gray-200 px-6">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                <button 
                  onClick={() => setActiveTab('timeline')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'timeline' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  <History size={18} />
                  Timeline
                </button>
                <button 
                  onClick={() => setActiveTab('data')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'data' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  <Store size={18} />
                  Dados da Farmácia
                </button>
                <button 
                  onClick={() => setActiveTab('notes')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'notes' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  <StickyNote size={18} />
                  Notas
                  <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs ml-1">3</span>
                </button>
                <button 
                  onClick={() => setActiveTab('tasks')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'tasks' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  <CheckSquare size={18} />
                  Tarefas
                </button>
              </nav>
            </div>

            <div className="p-6 bg-[#fafafa] flex-1">
              
              {/* Input Area */}
              <div className="mb-8 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">JD</div>
                  <div className="w-full">
                    <textarea 
                      className="w-full border-0 bg-transparent focus:ring-0 p-0 text-gray-700 placeholder-gray-400 resize-none h-12 outline-none" 
                      placeholder="Adicione uma nota rápida ou registre uma interação..."
                    ></textarea>
                    <div className="flex justify-between items-center mt-2 border-t border-gray-100 pt-2">
                      <div className="flex gap-2">
                        <button className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-full transition-colors">
                          <Paperclip size={18} />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-full transition-colors">
                          <Bold size={18} />
                        </button>
                      </div>
                      <button className="bg-gray-900 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-800 transition-colors">Registrar</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="relative pl-4 sm:pl-6 space-y-8 before:absolute before:inset-0 before:ml-4 sm:before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-200 before:via-gray-200 before:to-transparent">
                
                {/* Item 1 */}
                <div className="relative group">
                  <div className="absolute -left-4 sm:-left-6 mt-1.5 h-3 w-3 rounded-full border-2 border-primary bg-white"></div>
                  <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Mail size={18} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-gray-900 text-sm">Proposta Comercial Enviada</h4>
                        <span className="text-xs text-gray-400">Hoje, 10:30</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Envio da proposta v2 com desconto de volume aplicado conforme solicitado na última reunião.</p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          <Paperclip size={10} /> proposta_v2.pdf
                        </span>
                        <button className="text-xs text-primary font-medium hover:underline ml-auto">Ver Email</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="relative group">
                  <div className="absolute -left-4 sm:-left-6 mt-1.5 h-3 w-3 rounded-full border-2 border-gray-300 bg-white"></div>
                  <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                        <Phone size={18} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-gray-900 text-sm">Ligação de Qualificação</h4>
                        <span className="text-xs text-gray-400">Ontem, 14:15</span>
                      </div>
                      <p className="text-sm text-gray-600">Conversa com Roberto sobre o mix de produtos de inverno. Ele demonstrou interesse em aumentar o estoque de vitaminas.</p>
                      <div className="mt-2 text-xs text-gray-500 flex gap-4">
                        <span className="flex items-center gap-1"><Timer size={14} /> 12 min</span>
                        <span className="flex items-center gap-1"><User size={14} /> João D.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="relative group">
                  <div className="absolute -left-4 sm:-left-6 mt-1.5 h-3 w-3 rounded-full border-2 border-gray-300 bg-white"></div>
                  <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center">
                        <StickyNote size={18} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-gray-900 text-sm">Nota Interna</h4>
                        <span className="text-xs text-gray-400">23 Mar, 09:00</span>
                      </div>
                      <p className="text-sm text-gray-600">Cliente possui contrato com concorrente expirando em 30 dias. Momento ideal para abordagem agressiva em preço.</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Pharmacy Data Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Store className="text-primary" size={20} />
                Dados Detalhados da Farmácia
              </h3>
              <button className="text-xs text-primary font-medium hover:underline">Editar Dados</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">CNPJ</label>
                  <div className="text-gray-900 text-sm">12.345.678/0001-90</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Faturamento Mensal Estimado</label>
                  <div className="text-gray-900 text-sm font-semibold">R$ 150.000,00</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Ticket Médio</label>
                  <div className="text-gray-900 text-sm">R$ 45,00</div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Software de Gestão</label>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-gray-900 text-sm">TriFarma (Integrado)</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Perfil da Loja</label>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      Farmácia de Bairro
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      Popular
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Principais Fornecedores</label>
                  <div className="text-gray-900 text-sm">Eurofarma, EMS, NeoQuímica</div>
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Localização</label>
                <div className="h-32 w-full rounded-lg overflow-hidden relative bg-gray-200">
                  <img 
                    alt="Map location" 
                    className="w-full h-full object-cover opacity-80" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAWHjILk2v492wkOwiTBtbazSsmkit8yxf-IEUqWdrtzV5U72a6KXOOfG057eXjr88GUXJ5aDVoxDrIfH2zUbgWDr6cmZLlSuzKD821fFN5_Ja5KeQQrc_dK-nQjw0DiT955HczavJhPslL5Idz0yucUj0RDUl4Qj4CBCL4WAWNgI4Kv1rqSZ2qQnY_bHXZ2zff5tfgW-yssVKP2fyPUwBcWhpk58cjxxKc7LPqdBvPAJGZdJZrKPFCIUIFnLOa0z9OqWNqaxPkgPg"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-primary text-white p-1 rounded-full shadow-lg">
                      <MapPin size={16} />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Zona Sul / São Paulo - SP</p>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default LeadDetail;