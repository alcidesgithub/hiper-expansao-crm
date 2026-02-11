import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Store, 
  Lock, 
  ShieldCheck, 
  ChevronDown, 
  MapPin, 
  DollarSign, 
  AlertTriangle, 
  UserCheck, 
  TrendingUp, 
  AlertCircle, 
  Briefcase, 
  Calendar, 
  Target, 
  X, 
  Mail, 
  Phone, 
  CheckCircle2,
  Clock,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface FormWizardProps {
    onBack: () => void;
}

const FormWizard: React.FC<FormWizardProps> = ({ onBack }) => {
  const [step, setStep] = useState(0); // 0: Gate, 1: Ident, 2: Profile, 3: Challenges, 4: Urgency, 5: Finance
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Robust Form State
  const [formData, setFormData] = useState({
     // Step 1
     name: '',
     email: '',
     phone: '',
     pharmacyName: '',
     
     // Step 2
     role: '',
     roleDetail: '', // Holding vs Pessoa Fisica
     storeCount: '',
     storeCountExact: '', // For > 10
     revenue: '',
     timeInMarket: '',
     locationState: '',
     
     // Step 3
     challenges: [] as string[],
     
     // Step 4
     motivation: '',
     urgency: '',
     urgencyReason: '', // If immediate
     networkExperience: '',
     
     // Step 5
     investmentAwareness: '',
     roiExpectation: '',
     partnershipVision: '',
     financialCapacity: [] as string[]
  });

  const handleNext = () => {
      setLoading(true);
      setTimeout(() => {
          window.scrollTo(0, 0);
          setStep(prev => prev + 1);
          setLoading(false);
      }, 400); // Simulate processing
  };

  const handleBack = () => {
      if (step === 0) onBack();
      else setStep(prev => prev - 1);
  };

  const handleGateSelection = (isDecisionMaker: boolean) => {
      if (isDecisionMaker) {
          handleNext();
      } else {
          setIsDisqualified(true);
      }
  };

  const handleChange = (field: string, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleChallenge = (challenge: string) => {
      setFormData(prev => {
          if (challenge === 'no_challenges') return { ...prev, challenges: ['no_challenges'] };
          
          const exists = prev.challenges.includes(challenge);
          let newChallenges = exists 
            ? prev.challenges.filter(c => c !== challenge) 
            : [...prev.challenges.filter(c => c !== 'no_challenges'), challenge];
            
          if (newChallenges.length > 3) return prev; // Max 3 limit logic
          return { ...prev, challenges: newChallenges };
      });
  };

  const toggleCapacity = (item: string) => {
      setFormData(prev => {
          const exists = prev.financialCapacity.includes(item);
          return {
              ...prev,
              financialCapacity: exists 
                ? prev.financialCapacity.filter(i => i !== item)
                : [...prev.financialCapacity, item]
          };
      });
  };

  // Render Gate Step (0) - "Perder o lead duvidoso" principle
  if (step === 0) {
      if (isDisqualified) {
          return (
              <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-display">
                  <div className="bg-white max-w-lg w-full p-8 rounded-2xl shadow-xl text-center border border-gray-100">
                      <div className="w-16 h-16 bg-blue-100 text-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                          <Briefcase size={32} />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Agradecemos seu interesse!</h2>
                      <p className="text-gray-600 mb-8 leading-relaxed">
                          No momento, nosso processo de expansão é focado exclusivamente em proprietários e gestores com autonomia de decisão. Para profissionais em outras funções, preparamos uma trilha de conteúdo educativo exclusiva.
                      </p>
                      <button onClick={onBack} className="w-full py-3 bg-white border-2 border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-colors">
                          Voltar ao início
                      </button>
                  </div>
              </div>
          );
      }

      return (
        <div className="min-h-screen bg-secondary/5 flex flex-col font-display">
            <nav className="w-full bg-white border-b border-gray-100 py-4 px-8 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">H</div>
                    <span className="font-bold text-xl text-secondary">Hiperfarma</span>
                </div>
                <button onClick={onBack} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </nav>
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-bold border border-yellow-200 mb-6">
                        <AlertTriangle size={12} /> Filtro de Decisão
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Você é o(a) decisor(a) na farmácia?</h1>
                    <p className="text-gray-600 mb-10">
                        (Proprietário, Sócio, Farmacêutico Responsável Técnico ou Gerente Geral)
                    </p>
                    <div className="space-y-4">
                        <button onClick={() => handleGateSelection(true)} className="w-full p-5 border-2 border-gray-100 hover:border-primary/50 hover:bg-primary/5 rounded-xl flex items-center gap-4 transition-all group text-left shadow-sm hover:shadow-md">
                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                <UserCheck size={24} />
                            </div>
                            <div>
                                <span className="block font-bold text-gray-900 text-lg">SIM, sou decisor</span>
                                <span className="text-sm text-gray-500">Tenho autonomia para fechar parcerias.</span>
                            </div>
                        </button>
                        <button onClick={() => handleGateSelection(false)} className="w-full p-5 border-2 border-gray-100 hover:border-gray-300 hover:bg-gray-50 rounded-xl flex items-center gap-4 transition-all group text-left">
                            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center group-hover:bg-gray-200">
                                <UserCheck size={24} />
                            </div>
                            <div>
                                <span className="block font-bold text-gray-900 text-lg">NÃO, estou pesquisando</span>
                                <span className="text-sm text-gray-500">Sou farmacêutico(a), balconista ou estudante.</span>
                            </div>
                        </button>
                    </div>
                </div>
            </main>
        </div>
      );
  }

  // Progress Calculation
  const progress = ((step - 1) / 5) * 100;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-display text-gray-800">
      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-gradient-to-b from-[#FFE4E1] to-transparent opacity-40 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gradient-to-t from-blue-50 to-transparent opacity-40 blur-3xl"></div>
      </div>

      {/* Navbar */}
      <nav className="w-full bg-white relative z-10 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="flex justify-between h-20 items-center">
                <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
                    <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">H</div>
                    <span className="font-bold text-2xl text-secondary tracking-tight">Hiperfarma</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Progresso</span>
                    <div className="text-sm font-bold text-primary">
                        Etapa {step} <span className="text-gray-400 font-normal">de 5</span>
                    </div>
                </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mb-[-2px]">
                <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
      </nav>

      {/* Main Form Area */}
      <main className="flex-grow flex items-start justify-center py-12 px-4 relative z-10">
         <div className="max-w-2xl w-full">
            <form onSubmit={(e) => e.preventDefault()}>
                
                {/* STEP 1: IDENTIFICAÇÃO + VALIDAÇÃO */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Identificação</h2>
                            <p className="text-gray-500">Seus dados serão validados automaticamente para garantir a segurança.</p>
                        </div>
                        
                        <div className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nome Completo</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-3.5 bg-white rounded-lg border border-gray-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all placeholder:text-gray-300" 
                                    placeholder="Ex: João da Silva Santos"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                                <p className="text-[10px] text-gray-400 mt-1 ml-1">Mínimo 2 palavras.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">E-mail Profissional</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-4 text-gray-400" size={20} />
                                    <input 
                                        type="email" 
                                        className="w-full pl-12 pr-4 py-3.5 bg-white rounded-lg border border-gray-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all placeholder:text-gray-300" 
                                        placeholder="joao@suafarmacia.com.br" 
                                        value={formData.email}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                    />
                                </div>
                                <p className="text-[10px] text-green-600 mt-2 flex items-center gap-1 font-medium"><CheckCircle2 size={10}/> Priorizamos e-mails corporativos (@empresa).</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Celular / WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-4 text-gray-400" size={20} />
                                    <input 
                                        type="tel" 
                                        className="w-full pl-12 pr-4 py-3.5 bg-white rounded-lg border border-gray-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all placeholder:text-gray-300" 
                                        placeholder="(00) 99999-0000" 
                                        value={formData.phone}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Farmácia</label>
                                <div className="relative">
                                    <Store className="absolute left-4 top-4 text-gray-400" size={20} />
                                    <input 
                                        type="text" 
                                        className="w-full pl-12 pr-4 py-3.5 bg-white rounded-lg border border-gray-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all placeholder:text-gray-300" 
                                        placeholder="Ex: Farmácia Saúde & Vida"
                                        value={formData.pharmacyName}
                                        onChange={(e) => handleChange('pharmacyName', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: PERFIL EMPRESARIAL (CRÍTICO) */}
                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Perfil do Negócio</h2>
                            <p className="text-gray-500">Critérios fundamentais para nossa análise de viabilidade e scoring.</p>
                        </div>
                        
                        <div className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                             {/* Cargo */}
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Qual seu cargo principal?</label>
                                <div className="relative">
                                    <select 
                                        className="w-full pl-4 pr-10 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none bg-white appearance-none"
                                        value={formData.role}
                                        onChange={(e) => handleChange('role', e.target.value)}
                                    >
                                        <option value="" disabled>Selecione...</option>
                                        <option value="Proprietário">Proprietário / Sócio</option>
                                        <option value="Farmacêutico RT">Farmacêutico Responsável Técnico</option>
                                        <option value="Gerente Geral">Gerente Geral (com autonomia)</option>
                                        <option value="Gerente Comercial">Gerente Comercial/Compras</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-4 text-gray-400 pointer-events-none" size={16} />
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-6">
                                 {/* Lojas - Updated to PRD Ranges */}
                                 <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Nº de Lojas</label>
                                    <select 
                                        className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none bg-white"
                                        value={formData.storeCount}
                                        onChange={(e) => handleChange('storeCount', e.target.value)}
                                    >
                                        <option value="">Selecione</option>
                                        <option value="1">1 loja</option>
                                        <option value="2-3">2 a 3 lojas</option>
                                        <option value="4-5">4 a 5 lojas</option>
                                        <option value="6-10">6 a 10 lojas</option>
                                        <option value=">10">Mais de 10 lojas</option>
                                        <option value="0">Ainda não tenho (planejando)</option>
                                    </select>
                                 </div>
                                 {/* Tempo */}
                                 <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Tempo Mercado</label>
                                    <select 
                                        className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none bg-white"
                                        value={formData.timeInMarket}
                                        onChange={(e) => handleChange('timeInMarket', e.target.value)}
                                    >
                                        <option value="">Selecione</option>
                                        <option value="<1">Menos de 1 ano</option>
                                        <option value="1-3">1 a 3 anos</option>
                                        <option value="3-5">3 a 5 anos</option>
                                        <option value="5-10">5 a 10 anos</option>
                                        <option value=">10">Mais de 10 anos</option>
                                    </select>
                                 </div>
                             </div>

                             {/* Conditional exact count for >10 */}
                             {formData.storeCount === '>10' && (
                                 <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                                     <label className="block text-sm font-bold text-primary mb-2">Quantas lojas exatamente?</label>
                                     <input 
                                        type="number" 
                                        className="w-full px-4 py-2 rounded border border-gray-300"
                                        placeholder="Ex: 15"
                                        value={formData.storeCountExact}
                                        onChange={(e) => handleChange('storeCountExact', e.target.value)}
                                     />
                                 </div>
                             )}

                             {/* Faturamento */}
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Faturamento Médio Mensal (por loja)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-4 text-gray-400" size={20} />
                                    <select 
                                        className="w-full pl-12 pr-10 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none bg-white appearance-none"
                                        value={formData.revenue}
                                        onChange={(e) => handleChange('revenue', e.target.value)}
                                    >
                                        <option value="" disabled>Selecione uma faixa...</option>
                                        <option value="<50k">Até R$ 50.000</option>
                                        <option value="50k-100k">R$ 50.001 a R$ 100.000</option>
                                        <option value="100k-200k">R$ 100.001 a R$ 200.000</option>
                                        <option value="200k-500k">R$ 200.001 a R$ 500.000</option>
                                        <option value=">500k">Acima de R$ 500.000</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-4 text-gray-400 pointer-events-none" size={16} />
                                </div>
                             </div>

                             {/* Location */}
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Localização Principal</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-4 text-gray-400" size={20} />
                                    <select 
                                        className="w-full pl-12 pr-10 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none bg-white appearance-none"
                                        value={formData.locationState}
                                        onChange={(e) => handleChange('locationState', e.target.value)}
                                    >
                                        <option value="" disabled>Estado (UF)</option>
                                        <optgroup label="Prioritários">
                                            <option value="PR">Paraná (PR)</option>
                                            <option value="SC">Santa Catarina (SC)</option>
                                        </optgroup>
                                        <optgroup label="Expansão">
                                            <option value="RS">Rio Grande do Sul (RS)</option>
                                            <option value="SP">São Paulo (SP)</option>
                                            <option value="MG">Minas Gerais (MG)</option>
                                        </optgroup>
                                        <option value="OUT">Outros</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-4 text-gray-400 pointer-events-none" size={16} />
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: DESAFIOS E DORES (Fit Analysis) */}
                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Desafios e Dores</h2>
                            <p className="text-gray-500">Selecione <span className="font-bold text-gray-800">ATÉ 3</span> principais desafios que mais impactam seu negócio hoje.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {[
                                 { id: "negociacao", label: "Negociação com fornecedores (Preço)", score: "⭐⭐⭐" },
                                 { id: "competicao", label: "Competição com grandes redes", score: "⭐⭐⭐" },
                                 { id: "margens", label: "Margens apertadas / Lucro", score: "⭐⭐⭐" },
                                 { id: "estoque", label: "Gestão de estoque / Ruptura", score: "⭐⭐" },
                                 { id: "clientes", label: "Captação de clientes / Marketing", score: "⭐⭐" },
                                 { id: "tecnologia", label: "Tecnologia / Sistemas defasados", score: "⭐" },
                                 { id: "financeiro", label: "Gestão financeira / Fluxo caixa", score: "⭐" },
                                 { id: "no_challenges", label: "Não tenho desafios significativos", score: "" }
                             ].map((challenge) => (
                                 <button 
                                    key={challenge.id}
                                    onClick={() => toggleChallenge(challenge.id)}
                                    disabled={!formData.challenges.includes(challenge.id) && formData.challenges.length >= 3 && !formData.challenges.includes('no_challenges')}
                                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between group
                                        ${formData.challenges.includes(challenge.id) 
                                            ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm' 
                                            : 'border-gray-100 hover:border-primary/30 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                                        }
                                        ${challenge.id === 'no_challenges' && formData.challenges.includes('no_challenges') ? 'bg-red-50 border-red-200 text-red-700' : ''}
                                    `}
                                 >
                                     <span className="text-sm">{challenge.label}</span>
                                     {formData.challenges.includes(challenge.id) && <Check size={20} className={challenge.id === 'no_challenges' ? "text-red-500" : "text-primary"}/>}
                                 </button>
                             ))}
                        </div>
                        {formData.challenges.length === 3 && !formData.challenges.includes('no_challenges') && (
                            <p className="text-sm text-orange-500 flex items-center gap-2 font-medium bg-orange-50 p-3 rounded-lg border border-orange-100">
                                <AlertCircle size={16}/> Máximo de 3 opções atingido.
                            </p>
                        )}
                        {formData.challenges.includes('no_challenges') && (
                            <p className="text-sm text-red-600 flex items-center gap-2 font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                                <AlertCircle size={16}/> Atenção: Se não houver desafios, a Hiperfarma pode não agregar valor ao seu negócio.
                            </p>
                        )}
                    </div>
                )}

                {/* STEP 4: MOTIVAÇÃO E URGÊNCIA (Decisiva) */}
                {step === 4 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Motivação e Urgência</h2>
                            <p className="text-gray-500">Para priorizarmos seu atendimento na fila de espera.</p>
                        </div>
                        
                        <div className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                             {/* Motivação */}
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3">Principal Motivação</label>
                                <select 
                                    className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none bg-white"
                                    value={formData.motivation}
                                    onChange={(e) => handleChange('motivation', e.target.value)}
                                >
                                    <option value="" disabled>Selecione...</option>
                                    <option value="compras">Reduzir custos de compras / Poder de negociação</option>
                                    <option value="competicao">Competir com grandes redes</option>
                                    <option value="gestao">Profissionalizar a gestão</option>
                                    <option value="suporte">Ter suporte estratégico</option>
                                    <option value="pesquisa">Apenas conhecer opções (Curiosidade)</option>
                                </select>
                             </div>

                             {/* Urgência */}
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3">Quando pretende tomar uma decisão?</label>
                                <div className="space-y-3">
                                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.urgency === 'imediata' ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="urgency" value="imediata" checked={formData.urgency === 'imediata'} onChange={(e) => handleChange('urgency', e.target.value)} className="w-5 h-5 text-primary focus:ring-primary border-gray-300" />
                                        <div className="ml-3">
                                            <span className="block font-bold text-gray-900 flex items-center gap-2"><Target size={16} className="text-red-500"/> Imediatamente (até 15 dias)</span>
                                        </div>
                                    </label>
                                    {formData.urgency === 'imediata' && (
                                        <div className="ml-4 animate-in slide-in-from-top-2">
                                            <label className="block text-xs font-bold text-red-700 mb-1">O que está impulsionando essa urgência?</label>
                                            <textarea className="w-full border border-red-200 rounded p-2 text-sm focus:ring-red-500 focus:border-red-500" placeholder="Ex: Inauguração de concorrente, ruptura de estoque..." rows={2} value={formData.urgencyReason} onChange={(e) => handleChange('urgencyReason', e.target.value)}></textarea>
                                        </div>
                                    )}
                                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer hover:bg-gray-50 ${formData.urgency === '30dias' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-200'}`}>
                                        <input type="radio" name="urgency" value="30dias" checked={formData.urgency === '30dias'} onChange={(e) => handleChange('urgency', e.target.value)} className="w-5 h-5 text-primary focus:ring-primary border-gray-300" />
                                        <div className="ml-3">
                                            <span className="block font-bold text-gray-900">Este mês (até 30 dias)</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                                        <input type="radio" name="urgency" value="medio" checked={formData.urgency === 'medio'} onChange={(e) => handleChange('urgency', e.target.value)} className="w-5 h-5 text-primary focus:ring-primary border-gray-300" />
                                        <div className="ml-3">
                                            <span className="block font-bold text-gray-900">Médio Prazo (2-3 meses)</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                                        <input type="radio" name="urgency" value="sem_prazo" checked={formData.urgency === 'sem_prazo'} onChange={(e) => handleChange('urgency', e.target.value)} className="w-5 h-5 text-primary focus:ring-primary border-gray-300" />
                                        <div className="ml-3">
                                            <span className="block font-bold text-gray-900 text-gray-400">Sem prazo definido</span>
                                        </div>
                                    </label>
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {/* STEP 5: COMPROMETIMENTO FINANCEIRO (Final) */}
                {step === 5 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Investimento e Visão</h2>
                            <p className="text-gray-500">Última etapa para calcularmos seu score de compatibilidade.</p>
                        </div>
                        
                        <div className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                             <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-6">
                                 <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><TrendingUp size={18}/> Retorno sobre Investimento</h4>
                                 <p className="text-sm text-blue-700 leading-relaxed">
                                     A associação Hiperfarma requer um investimento mensal que retorna em forma de competitividade, descontos em compras e marketing. Você está ciente?
                                 </p>
                             </div>

                             {/* Consciência */}
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3">Consciência de Investimento</label>
                                <div className="space-y-3">
                                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${formData.investmentAwareness === 'preparado' ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="invest" value="preparado" checked={formData.investmentAwareness === 'preparado'} onChange={(e) => handleChange('investmentAwareness', e.target.value)} className="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-300" />
                                        <div className="ml-3">
                                            <span className="block font-bold text-gray-900">Sim, já pesquisei e estou preparado</span>
                                            <span className="text-xs text-gray-500">Entendo o valor estratégico.</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                                        <input type="radio" name="invest" value="conhecer" checked={formData.investmentAwareness === 'conhecer'} onChange={(e) => handleChange('investmentAwareness', e.target.value)} className="w-5 h-5 text-primary focus:ring-primary border-gray-300" />
                                        <div className="ml-3">
                                            <span className="block font-bold text-gray-900">Sei que existe, quero conhecer valores</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                                        <input type="radio" name="invest" value="nao_sabia" checked={formData.investmentAwareness === 'nao_sabia'} onChange={(e) => handleChange('investmentAwareness', e.target.value)} className="w-5 h-5 text-primary focus:ring-primary border-gray-300" />
                                        <div className="ml-3">
                                            <span className="block font-bold text-gray-900">Não sabia sobre custos (Me preocupa)</span>
                                        </div>
                                    </label>
                                </div>
                             </div>

                             {/* ROI */}
                             <div>
                                 <label className="block text-sm font-bold text-gray-700 mb-2">Expectativa de ROI (Retorno)</label>
                                 <select 
                                    className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none bg-white"
                                    value={formData.roiExpectation}
                                    onChange={(e) => handleChange('roiExpectation', e.target.value)}
                                 >
                                    <option value="" disabled>Selecione...</option>
                                    <option value="imediato">Imediato (1-3 meses)</option>
                                    <option value="curto">Curto prazo (4-6 meses)</option>
                                    <option value="medio">Médio prazo (7-12 meses)</option>
                                    <option value="longo">Longo prazo (1-2 anos)</option>
                                </select>
                             </div>

                             {/* Capacidade (Verificação) */}
                             <div>
                                 <label className="block text-sm font-bold text-gray-700 mb-2">Capacidade Financeira (Marque o que se aplica)</label>
                                 <div className="space-y-2">
                                     {['Investimento inicial', 'Mensalidade recorrente', 'Eventuais custos de adequação'].map((cap) => (
                                         <label key={cap} className="flex items-center gap-2 cursor-pointer">
                                             <input 
                                                type="checkbox" 
                                                className="w-4 h-4 text-primary rounded focus:ring-primary border-gray-300"
                                                checked={formData.financialCapacity.includes(cap)}
                                                onChange={() => toggleCapacity(cap)}
                                             />
                                             <span className="text-gray-700 text-sm">{cap}</span>
                                         </label>
                                     ))}
                                 </div>
                             </div>
                        </div>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-6 flex items-center justify-between mt-8 border-t border-gray-200">
                     <button onClick={handleBack} type="button" className="inline-flex items-center px-6 py-3.5 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all disabled:opacity-50" disabled={loading}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                     </button>
                     
                     {step < 5 ? (
                         <button 
                            onClick={handleNext} 
                            disabled={loading}
                            type="button" 
                            className="inline-flex items-center px-8 py-3.5 border border-transparent text-sm font-bold rounded-lg shadow-lg shadow-primary/20 text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processando...' : 'Próxima Etapa'} {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                         </button>
                     ) : (
                         <button 
                            onClick={() => alert("Análise concluída! O sistema calculou o Score: GRADE A (Hot Lead). Redirecionando para Dashboard...")} 
                            type="button" 
                            className="inline-flex items-center px-8 py-3.5 border border-transparent text-sm font-bold rounded-lg shadow-lg shadow-green-500/30 text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all transform hover:-translate-y-0.5 animate-pulse"
                        >
                            Finalizar Análise <Check className="ml-2 h-4 w-4" />
                         </button>
                     )}
                </div>
            </form>
         </div>
      </main>
      
      {/* Privacy Footer */}
      <div className="py-6 text-center text-xs text-gray-400 bg-[#F8F9FA]">
          <div className="flex items-center justify-center gap-4 mb-2">
              <span className="flex items-center gap-1"><Lock size={10}/> Dados Criptografados</span>
              <span className="flex items-center gap-1"><ShieldCheck size={10}/> LGPD Compliance</span>
          </div>
          <p>© 2024 Hiperfarma. Qualificação v2.0</p>
      </div>
    </div>
  );
};

export default FormWizard;