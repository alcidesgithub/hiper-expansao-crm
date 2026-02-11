import React, { useState } from 'react';
import { 
  Save, 
  Briefcase, 
  Building2, 
  MapPin, 
  Download, 
  Mail, 
  Plus, 
  Zap, 
  GripVertical, 
  CheckCircle2, 
  Lightbulb, 
  Trash2, 
  Sliders, 
  LayoutList,
  ArrowRight,
  PlusCircle,
  FileDown,
  MailOpen
} from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <div className="w-full font-display text-slate-800 pb-20 space-y-8">
      
      {/* Top Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-900">Configurações de Lead Scoring & Automação</h1>
           <p className="mt-2 text-slate-500">Defina pesos, crie regras de automação e organize seu pipeline de vendas.</p>
        </div>
        <button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2 self-start md:self-auto">
            <Save size={18} />
            Salvar Alterações
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* LEFT COLUMN (WIDER) */}
         <div className="lg:col-span-2 space-y-8">
            
            {/* 1. SCORING MATRIX */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                  <div>
                     <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Sliders className="text-primary" size={20} /> Matriz de Pontuação
                     </h3>
                     <p className="mt-1 text-sm text-slate-500">Atribua pontos baseados no perfil e engajamento.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded">Score Max: 100</span>
                  </div>
               </div>

               <div className="p-6 space-y-8">
                  
                  {/* Demographics Section */}
                  <div>
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Dados Demográficos</h4>
                     <div className="space-y-1">
                        <ScoringRow 
                            icon={<Briefcase size={18} />} 
                            iconBg="bg-blue-50 text-blue-600"
                            title="Cargo de Decisão" 
                            subtitle="CEO, Diretor, VP, Head" 
                            defaultValue={30} 
                        />
                        <ScoringRow 
                            icon={<Building2 size={18} />} 
                            iconBg="bg-indigo-50 text-indigo-600"
                            title="Empresa Enterprise" 
                            subtitle="> 500 funcionários" 
                            defaultValue={20} 
                        />
                        <ScoringRow 
                            icon={<MapPin size={18} />} 
                            iconBg="bg-teal-50 text-teal-600"
                            title="Localização Estratégica" 
                            subtitle="SP, RJ, Exterior" 
                            defaultValue={10} 
                        />
                     </div>
                  </div>

                  {/* Behavioral Section */}
                  <div>
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Engajamento</h4>
                     <div className="space-y-1">
                        <ScoringRow 
                            icon={<FileDown size={18} />} 
                            iconBg="bg-orange-50 text-orange-600"
                            title="Download de E-book" 
                            subtitle="Material rico baixado" 
                            defaultValue={15} 
                        />
                        <ScoringRow 
                            icon={<MailOpen size={18} />} 
                            iconBg="bg-purple-50 text-purple-600"
                            title="Abertura de Email" 
                            subtitle="Taxa de abertura > 20%" 
                            defaultValue={5} 
                        />
                     </div>
                     <button className="w-full mt-6 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 text-sm font-medium">
                        <Plus size={18} />
                        Adicionar Critério
                    </button>
                  </div>

               </div>
            </div>

            {/* 2. AUTOMATION RULES */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Zap className="text-primary" size={20} /> Regras de Automação
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">Defina "Gatilhos" e "Ações" para automatizar o fluxo.</p>
                </div>
                
                <div className="p-6 space-y-4">
                    {/* Rule 1 */}
                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-sm text-slate-900">Regra #1: Notificação de Lead Quente</h4>
                            <ToggleSwitch defaultChecked />
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">SE (Condição)</label>
                                <div className="flex gap-2">
                                    <select className="w-full bg-white border border-gray-300 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm">
                                        <option>Lead Score</option>
                                        <option>Cargo</option>
                                    </select>
                                    <select className="w-32 bg-white border border-gray-300 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm">
                                        <option>Maior que</option>
                                        <option>Igual a</option>
                                    </select>
                                    <input type="number" defaultValue={80} className="w-20 bg-white border border-gray-300 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                                </div>
                            </div>
                            <ArrowRight className="text-slate-300 mt-6 hidden md:block" />
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">ENTÃO (Ação)</label>
                                <div className="flex gap-2">
                                    <select className="w-full bg-white border border-gray-300 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm">
                                        <option>Notificar Usuário</option>
                                        <option>Mudar Estágio</option>
                                    </select>
                                    <select className="w-full bg-white border border-gray-300 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm">
                                        <option>Diretor Comercial</option>
                                        <option>SDR Lider</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rule 2 (Inactive/Template) */}
                    <div className="bg-gray-50/50 rounded-lg p-5 border border-gray-200 opacity-60 hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-sm text-slate-900">Regra #2: Nutrição Fria</h4>
                            <ToggleSwitch />
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 items-center grayscale opacity-50">
                             <div className="h-9 w-full bg-gray-200 rounded-lg"></div>
                             <ArrowRight className="text-slate-300 hidden md:block" />
                             <div className="h-9 w-full bg-gray-200 rounded-lg"></div>
                        </div>
                    </div>

                    <div className="pt-2 text-right">
                        <button className="text-primary hover:text-primary-hover font-medium text-sm inline-flex items-center gap-1">
                            <PlusCircle size={16} /> Criar Nova Regra
                        </button>
                    </div>
                </div>
            </div>
         </div>

         {/* RIGHT COLUMN */}
         <div className="space-y-8">
            
            {/* 3. PIPELINE STAGES */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <LayoutList className="text-primary" size={20} /> Estágios do Pipeline
                    </h3>
                </div>
                <div className="p-6">
                    <div className="space-y-3">
                        <PipelineStage name="Prospecção" color="bg-slate-400" probability="0%" />
                        <PipelineStage name="Qualificação" color="bg-blue-500" probability="20%" />
                        <PipelineStage name="Proposta" color="bg-yellow-500" probability="60%" />
                        <PipelineStage name="Fechamento" color="bg-green-500" probability="90%" />
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex gap-2">
                            <input type="text" placeholder="Nome do novo estágio..." className="flex-1 bg-gray-50 border border-gray-300 text-sm rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none" />
                            <button className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 transition-colors">
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. SIMULATION */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <h4 className="text-primary font-bold text-sm uppercase tracking-wide mb-4">Simulação de Score</h4>
                
                <div className="flex items-center gap-4 mb-6">
                    <img 
                        alt="Persona Avatar" 
                        className="h-12 w-12 rounded-full border-2 border-white shadow-sm" 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3AaG1bjoj7Dfc7SV0DI6dU2z70SMY1YGLahsHZPWqKRdZWdR13rn1T3fj4sB9CvQzwsUYZYaglnWSIAolufM6e-AdjUAO14pr-rQKMf93Z7Owd_v_Cuu-Gxo2CXk4sNh-eG5pOq2Nm2lbVMk5ws695Yax5IBrTfftnX7Lc9NBE4nFOFjryjiOJSSqkoLtQogcqzn4YpYwceNMkADe1R7jhNWSKzDEZGFQ338i1pobEIXpk8SrpPHi1HPImcpzKwelQMW4idGwe4E"
                    />
                    <div>
                        <p className="font-bold text-slate-900">Lead Exemplo</p>
                        <p className="text-xs text-slate-500">CEO @ TechCorp</p>
                    </div>
                    <div className="ml-auto text-right">
                        <span className="block text-3xl font-bold text-primary">85</span>
                        <span className="text-xs font-bold text-slate-400 uppercase">Pontos</span>
                    </div>
                </div>

                <div className="space-y-2 text-sm border-t border-primary/10 pt-4">
                    <div className="flex justify-between text-slate-600">
                        <span>Cargo: CEO</span>
                        <span className="font-mono text-green-600 font-bold">+30</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>Empresa: Enterprise</span>
                        <span className="font-mono text-green-600 font-bold">+20</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>Email Corporativo</span>
                        <span className="font-mono text-green-600 font-bold">+20</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>Download Ebook</span>
                        <span className="font-mono text-green-600 font-bold">+15</span>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-primary/10">
                    <div className="bg-green-100 text-green-800 text-xs px-3 py-3 rounded-lg border border-green-200 flex items-start gap-2">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                        <p className="font-medium leading-tight">Este lead seria qualificado automaticamente e enviado para o Diretor Comercial.</p>
                    </div>
                </div>
            </div>

            {/* 5. TIPS */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex gap-3">
                <Lightbulb className="text-blue-500 shrink-0" size={20} />
                <div>
                    <h5 className="text-sm font-bold text-blue-800">Dica de Especialista</h5>
                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                        Evite dar pontuações muito altas para ações isoladas. O ideal é que o lead precise de um conjunto de ações (perfil + engajamento) para atingir a pontuação de corte.
                    </p>
                </div>
            </div>

         </div>
      </div>
    </div>
  );
};

// --- Helper Components ---

const ScoringRow = ({ icon, iconBg, title, subtitle, defaultValue }: any) => {
    const [value, setValue] = useState(defaultValue);

    return (
        <div className="group flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-dashed border-gray-200 last:border-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors gap-4">
            <div className="flex-1">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${iconBg}`}>
                        {icon}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">{title}</p>
                        <p className="text-xs text-slate-500">{subtitle}</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <input 
                    type="range" 
                    min="0" 
                    max="50" 
                    value={value} 
                    onChange={(e) => setValue(parseInt(e.target.value))}
                    className="w-full sm:w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="relative">
                    <input 
                        type="number" 
                        value={value}
                        onChange={(e) => setValue(parseInt(e.target.value))}
                        className="w-16 pl-2 pr-1 py-1 text-sm border border-gray-300 rounded bg-white text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary text-center font-mono"
                    />
                </div>
            </div>
        </div>
    );
};

const ToggleSwitch = ({ defaultChecked }: { defaultChecked?: boolean }) => {
    const [checked, setChecked] = useState(defaultChecked || false);
    return (
        <button 
            onClick={() => setChecked(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${checked ? 'bg-primary' : 'bg-gray-300'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );
};

const PipelineStage = ({ name, color, probability }: any) => (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-move hover:shadow-md transition-shadow group">
        <GripVertical className="text-gray-300 cursor-grab" size={20} />
        <div className={`w-3 h-3 rounded-full ${color}`}></div>
        <input 
            type="text" 
            defaultValue={name}
            className="bg-transparent border-none text-sm font-bold text-slate-700 w-full focus:ring-0 px-0 outline-none" 
        />
        <span className="text-xs text-gray-400 whitespace-nowrap">{probability} prob.</span>
        <button className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 size={16} />
        </button>
    </div>
);

export default SettingsPage;