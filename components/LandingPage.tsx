import React, { useState } from 'react';
import { 
  Menu, 
  ArrowRight, 
  PlayCircle, 
  Handshake, 
  Store, 
  Megaphone, 
  TrendingUp, 
  CreditCard, 
  Building2, 
  Tag, 
  ChevronDown, 
  Rocket, 
  Phone, 
  Mail, 
  Facebook, 
  Instagram,
  Linkedin,
  CheckCircle2,
  Users,
  ShoppingBag,
  Pill,
  BarChart3, 
  HelpCircle,
  MapPin,
  X,
  LayoutDashboard,
  Calendar,
  Settings,
  FileText,
  ShieldCheck,
  Video
} from 'lucide-react';

interface LandingPageProps {
    onNavigate: (page: any) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPagesMenuOpen, setIsPagesMenuOpen] = useState(false);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);

  const navigateTo = (page: any) => {
    onNavigate(page);
    setIsPagesMenuOpen(false);
    closeMenu();
  }

  return (
    <div className="font-display text-gray-800 bg-background-light selection:bg-primary/30">
        <style>{`html { scroll-behavior: smooth; }`}</style>

        {/* Navbar */}
        <nav className="fixed w-full z-50 bg-surface-light/95 backdrop-blur-md border-b border-gray-200 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
                        <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">H</div>
                        <span className="font-bold text-2xl text-secondary tracking-tight">Hiperfarma</span>
                    </div>
                    
                    {/* Desktop Menu */}
                    <div className="hidden md:flex space-x-8 items-center">
                        <a href="#vantagens" className="text-gray-600 hover:text-primary font-medium transition-colors">Vantagens</a>
                        <a href="#ferramentas" className="text-gray-600 hover:text-primary font-medium transition-colors">Ferramentas</a>
                        <a href="#faq" className="text-gray-600 hover:text-primary font-medium transition-colors">Dúvidas</a>
                        
                        {/* Pages Dropdown */}
                        <div className="relative">
                            <button 
                                onClick={() => setIsPagesMenuOpen(!isPagesMenuOpen)}
                                className="flex items-center gap-1 text-gray-600 hover:text-primary font-medium transition-colors outline-none"
                            >
                                Telas <ChevronDown size={16} className={`transition-transform duration-200 ${isPagesMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isPagesMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsPagesMenuOpen(false)}></div>
                                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Área Logada (App)</p>
                                        </div>
                                        <button onClick={() => navigateTo('dashboard')} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-3">
                                            <LayoutDashboard size={16} className="text-gray-400"/> Dashboard
                                        </button>
                                        <button onClick={() => navigateTo('kanban')} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-3">
                                            <Users size={16} className="text-gray-400"/> CRM Leads
                                        </button>
                                        <button onClick={() => navigateTo('lead-detail')} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-3">
                                            <div className="w-4"/> Detalhe do Lead
                                        </button>
                                        <button onClick={() => navigateTo('calendar')} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-3">
                                            <Calendar size={16} className="text-gray-400"/> Agenda
                                        </button>
                                        <button onClick={() => navigateTo('analytics')} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-3">
                                            <BarChart3 size={16} className="text-gray-400"/> Relatórios
                                        </button>
                                        <button onClick={() => navigateTo('settings')} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-3">
                                            <Settings size={16} className="text-gray-400"/> Configurações
                                        </button>
                                        
                                        <div className="border-t border-gray-100 my-1"></div>
                                        <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Páginas Públicas</p>
                                        </div>
                                        <button onClick={() => navigateTo('login')} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-3">
                                            <ArrowRight size={16} className="text-gray-400"/> Login
                                        </button>
                                        <button onClick={() => navigateTo('wizard')} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-3">
                                            <Rocket size={16} className="text-gray-400"/> Wizard de Adesão
                                        </button>
                                        <button onClick={() => navigateTo('schedule-call')} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-3">
                                            <Video size={16} className="text-gray-400"/> Agendamento de Call
                                        </button>
                                        <button onClick={() => navigateTo('privacy')} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-3">
                                            <ShieldCheck size={16} className="text-gray-400"/> Política de Privacidade
                                        </button>
                                        <button onClick={() => navigateTo('terms')} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-3">
                                            <FileText size={16} className="text-gray-400"/> Termos de Uso
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <button 
                            onClick={() => onNavigate('wizard')}
                            className="border-2 border-primary text-primary hover:bg-primary hover:text-white px-5 py-2 rounded-lg font-semibold transition-all duration-300"
                        >
                            Seja um Associado
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button 
                            onClick={toggleMenu}
                            className="text-gray-600 hover:text-primary p-2 focus:outline-none transition-colors"
                            aria-label="Menu principal"
                        >
                            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-surface-light border-b border-gray-200 animate-in slide-in-from-top-5 duration-200 absolute w-full z-40 shadow-xl max-h-[90vh] overflow-y-auto">
                    <div className="px-4 pt-2 pb-6 space-y-2">
                        <a 
                            href="#vantagens" 
                            onClick={closeMenu}
                            className="block px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-primary hover:bg-primary/5 transition-colors"
                        >
                            Vantagens
                        </a>
                        <a 
                            href="#ferramentas" 
                            onClick={closeMenu}
                            className="block px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-primary hover:bg-primary/5 transition-colors"
                        >
                            Ferramentas
                        </a>
                        <a 
                            href="#faq" 
                            onClick={closeMenu}
                            className="block px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-primary hover:bg-primary/5 transition-colors"
                        >
                            Dúvidas
                        </a>

                        <div className="border-t border-gray-100 pt-2 mt-2">
                             <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Acesso Rápido</p>
                             <button onClick={() => navigateTo('dashboard')} className="block w-full text-left px-3 py-2 text-base text-gray-600 hover:text-primary">Dashboard</button>
                             <button onClick={() => navigateTo('kanban')} className="block w-full text-left px-3 py-2 text-base text-gray-600 hover:text-primary">CRM Leads</button>
                             <button onClick={() => navigateTo('calendar')} className="block w-full text-left px-3 py-2 text-base text-gray-600 hover:text-primary">Agenda</button>
                             <button onClick={() => navigateTo('analytics')} className="block w-full text-left px-3 py-2 text-base text-gray-600 hover:text-primary">Relatórios</button>
                             <button onClick={() => navigateTo('schedule-call')} className="block w-full text-left px-3 py-2 text-base text-gray-600 hover:text-primary">Agendamento de Call</button>
                             <button onClick={() => navigateTo('login')} className="block w-full text-left px-3 py-2 text-base text-gray-600 hover:text-primary">Login</button>
                        </div>

                        <div className="pt-2 mt-2 border-t border-gray-100">
                             <button 
                                onClick={() => { closeMenu(); onNavigate('wizard'); }}
                                className="w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-bold rounded-lg text-white bg-primary hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
                            >
                                Seja um Associado
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20">
                            <span className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                            A rede que mais cresce no Sul do Brasil
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                            Sua farmácia muito mais <span className="text-primary">competitiva e lucrativa</span>
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            Associe-se à Hiperfarma e tenha acesso a negociações exclusivas, marketing de impacto e ferramentas de gestão que transformam o seu negócio.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                            <button 
                                onClick={() => onNavigate('wizard')}
                                className="inline-flex justify-center items-center px-8 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg text-lg transition-all duration-300 shadow-lg shadow-primary/30 transform hover:-translate-y-1"
                            >
                                Quero ser um Associado
                                <ArrowRight className="ml-2" size={20} />
                            </button>
                            <button 
                                onClick={() => setIsVideoOpen(true)}
                                className="inline-flex justify-center items-center px-8 py-4 bg-surface-light border border-gray-300 text-gray-700 font-semibold rounded-lg text-lg hover:border-primary hover:text-primary transition-all duration-300"
                            >
                                <PlayCircle className="mr-2 text-primary" size={20} />
                                Conheça a Rede
                            </button>
                        </div>
                        <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-gray-500">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white overflow-hidden">
                                    <img alt="Portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHH6HQ0LiEoc3kYKDUH4wJaWTMUJdkSXZkYB8aSBMqRRnZjLP2CjmnfEcwWeL4jrZgKYZGSw8rVt-NFzddSHX4IvsFAErfePs8ukPHVEm06HuKrOdBhnFVcDhI3Si22Pm2IMYBV3oPmC8VFK74vJzMNF_HunJCn_qX1KQzNxVoDTJMbWcQ8I3HeKvDAdLH_9mPBrWUeAj6Dc5OARIkiXjD-Wi3zZUg6kLeHUQBnh24rbghPZYayfesfyDXLlGG01BK_fQd7gVUVeM"/>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white overflow-hidden">
                                    <img alt="Portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDiFFUXLpBbHP5Dg8-mGZ2oApYtfXbhpRlRrNkUsYYOV_Ja9_EZOlzuqsJ_ibKyenKETxKulWHqYYGdVI6FVAG2CinqsT9qEHPqlBpqK6X5ZyXOcQI_cbRIvMsMn1tMi25G6-IKusL2vAP-SfhFY09Kd7fsixoBDDNWJP-YFMgx1Y49YRYbbo2XSb8PTyhCHkMXB-w8asiw11hgztoiNTE-rl_-4c_k3BPTUNu0QPRY53Oc3Glap03JnVw8BSfE3RmKwzg4UrvqWfQ"/>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white overflow-hidden">
                                    <img alt="Portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkBYhXeMYkopMp_hPAyIt1SPi9eQKFoSRz6XSNcJdNijpCr_65hwl0C8KZ0L1lY8JiGBDiViUn9ZHH4D-_Tl--Ebk-AxuamFLBHltgXL-iOW2pA3aMOykkoee0JyE2YjwcGB9dbC50buihsrc9nftxObNiI4_59qxjqdjJwKWn5dSCNU6dArhrR9n5itJjefN2OcogWbOGUBZ9C1K_4vCHVOpgPRu8IdoLwJIAuBcMQNURMMtN0MoJeLNDGQ6X7P5_fmJG0d60-ds"/>
                                </div>
                            </div>
                            <p>Junte-se a <span className="font-bold text-gray-900">200+</span> lojas associadas</p>
                        </div>
                    </div>
                    <div className="relative lg:h-full flex items-center justify-center">
                        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent z-10"></div>
                            <img 
                                alt="Equipe Hiperfarma" 
                                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700" 
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMDdUOiDm4V4Il7X17QQ_fbxCndUueQtEcP8Bnjl515ORoVy4ILWoat0VqIDVTMl6HCjxZmyog1_ucpaP6bd2ScSnZJUIPBrtjN2oquJJvdfLUN2DUfaDHtvJcGX3myokFTOOuKsQOIEofAz02acxIyPkEn8obIWkhtiDfnT26_zECJUWfvPGbuiKjIUecbQWvv1mEJhYi390MHV3TIiwF3tCRJZt0hrlToLA1KvYc-6klyIchIdWM8lxNZDnKpu_XchGY5wxER3Q"
                            />
                        </div>
                        <div className="absolute -bottom-6 -left-6 bg-surface-light p-4 rounded-xl shadow-xl border border-gray-100 flex items-center gap-3 z-20 animate-bounce" style={{animationDuration: '3s'}}>
                            <div className="bg-blue-100 p-2 rounded-lg">
                                <Handshake className="text-blue-600" size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Parceria Estratégica</p>
                                <p className="text-lg font-bold text-gray-900">Febrafar + Hiperfarma</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-secondary/5 rounded-full blur-3xl -z-10"></div>
        </section>

        {/* Stats Section */}
        <section className="bg-secondary py-12 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/10">
                    <div className="p-2">
                        <p className="text-3xl lg:text-4xl font-extrabold text-white mb-2">200+</p>
                        <p className="text-white/80 font-medium text-sm lg:text-base">Lojas Associadas</p>
                    </div>
                    <div className="p-2">
                        <p className="text-3xl lg:text-4xl font-extrabold text-white mb-2">500+</p>
                        <p className="text-white/80 font-medium text-sm lg:text-base">Empresas Conveniadas no PR e SC</p>
                    </div>
                    <div className="p-2">
                        <p className="text-3xl lg:text-4xl font-extrabold text-white mb-2">2M+</p>
                        <p className="text-white/80 font-medium text-sm lg:text-base">Clientes Conveniados</p>
                    </div>
                    <div className="p-2">
                        <p className="text-3xl lg:text-4xl font-extrabold text-white mb-2">1M+</p>
                        <p className="text-white/80 font-medium text-sm lg:text-base">Clientes no Hiper Club</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Vantagens */}
        <section className="py-20 bg-background-light scroll-mt-24" id="vantagens">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-primary font-bold tracking-wider uppercase text-sm mb-3">Nossos Pilares</h2>
                    <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Por que escolher a Hiperfarma?</h3>
                    <p className="text-gray-600 text-lg">Entregamos ferramentas reais que aumentam a competitividade, o fluxo de clientes e a rentabilidade da sua farmácia.</p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Pilar 1 */}
                    <div className="group bg-surface-light p-8 rounded-2xl shadow-lg border border-gray-100 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
                        <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                            <ShoppingBag size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 mb-3">Poder de Compra</h4>
                        <p className="text-gray-600 leading-relaxed text-sm">
                            Acesse condições comerciais exclusivas. Negociações em bloco, OLs e transferências com as principais indústrias e distribuidoras garantem sua competitividade.
                        </p>
                    </div>

                    {/* Pilar 2 */}
                    <div className="group bg-surface-light p-8 rounded-2xl shadow-lg border border-gray-100 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
                        <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                            <CreditCard size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 mb-3">Hiper Club de Descontos</h4>
                        <p className="text-gray-600 leading-relaxed text-sm">
                            Nossa ferramenta mais forte. Com mais de <strong>1 milhão de clientes fidelizados</strong>, você oferece descontos reais, acumula inteligência de dados e retém seu público.
                        </p>
                    </div>

                    {/* Pilar 3 */}
                    <div className="group bg-surface-light p-8 rounded-2xl shadow-lg border border-gray-100 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
                        <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                            <Building2 size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 mb-3">Convênios Corporativos</h4>
                        <p className="text-gray-600 leading-relaxed text-sm">
                            Mais de <strong>500 empresas conveniadas</strong> no PR e SC. Direcionamos fluxo garantido de colaboradores que compram na sua farmácia.
                        </p>
                    </div>

                    {/* Pilar 4 */}
                    <div className="group bg-surface-light p-8 rounded-2xl shadow-lg border border-gray-100 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
                        <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                            <Pill size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 mb-3">Gestão de PBMs</h4>
                        <p className="text-gray-600 leading-relaxed text-sm">
                            Esteja conectado aos principais programas de laboratórios (VidaLink, e-Pharma, Funcional), oferecendo os descontos que o cliente procura.
                        </p>
                    </div>

                    {/* Pilar 5 */}
                    <div className="group bg-surface-light p-8 rounded-2xl shadow-lg border border-gray-100 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
                        <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                            <Megaphone size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 mb-3">Marketing Cooperado</h4>
                        <p className="text-gray-600 leading-relaxed text-sm">
                            Tablóides de ofertas mensais, gestão profissional de redes sociais, rádio interna e materiais de ponto de venda para manter sua marca ativa.
                        </p>
                    </div>

                    {/* Pilar 6 */}
                    <div className="group bg-surface-light p-8 rounded-2xl shadow-lg border border-gray-100 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
                        <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                            <Store size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 mb-3">Marca e Credibilidade</h4>
                        <p className="text-gray-600 leading-relaxed text-sm">
                            Faça parte de uma história de mais de 25 anos. A marca Hiperfarma é sinônimo de confiança e preço justo para o consumidor paranaense e catarinense.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* Ferramentas e Convenios */}
        <section className="py-20 bg-white border-y border-gray-100 scroll-mt-24" id="ferramentas">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="order-2 lg:order-1 relative">
                        <div className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl opacity-30"></div>
                        <div className="relative bg-gradient-to-br from-primary to-secondary rounded-2xl p-1 shadow-2xl">
                            <div className="bg-surface-light rounded-xl overflow-hidden h-full">
                                <img alt="Loyalty card" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMDdUOiDm4V4Il7X17QQ_fbxCndUueQtEcP8Bnjl515ORoVy4ILWoat0VqIDVTMl6HCjxZmyog1_ucpaP6bd2ScSnZJUIPBrtjN2oquJJvdfLUN2DUfaDHtvJcGX3myokFTOOuKsQOIEofAz02acxIyPkEn8obIWkhtiDfnT26_zECJUWfvPGbuiKjIUecbQWvv1mEJhYi390MHV3TIiwF3tCRJZt0hrlToLA1KvYc-6klyIchIdWM8lxNZDnKpu_XchGY5wxER3Q"/>
                            </div>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-4 border border-secondary/20">
                            <CreditCard size={16} className="mr-2" />
                            Ferramentas de Venda
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">Fidelize e Venda Mais</h2>
                        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                            A Hiperfarma entrega tecnologia e parcerias para você não perder nenhuma venda no balcão.
                        </p>
                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Building2 className="text-primary" size={24} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-gray-900">Rede de Convênios</h4>
                                    <p className="text-gray-600 mt-2">
                                        Mais de <strong>500 empresas parceiras</strong> e <strong>2 milhões de clientes conveniados</strong>. Direcionamos colaboradores de indústrias e comércios locais para comprar na sua farmácia.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                                    <Tag className="text-secondary" size={24} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-gray-900">Hiper Club de Descontos</h4>
                                    <p className="text-gray-600 mt-2">
                                        Sistema de fidelização robusto com APP exclusivo e mais de <strong>1 milhão de usuários</strong>. Ofereça descontos personalizados e acumule pontos para fazer o cliente voltar sempre.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <button onClick={() => onNavigate('wizard')} className="text-primary hover:text-primary-dark font-bold inline-flex items-center group">
                                Quero habilitar essas ferramentas
                                <ArrowRight className="ml-2 transform group-hover:translate-x-1 transition-transform" size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* FAQ */}
        <section className="py-20 bg-background-light scroll-mt-24" id="faq">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Perguntas Frequentes</h2>
                    <p className="text-gray-600">Tudo o que você precisa saber sobre o modelo de licenciamento Hiperfarma.</p>
                </div>
                <div className="space-y-4">
                    <details className="group bg-surface-light p-6 rounded-xl border border-gray-200 open:border-primary/50 cursor-pointer transition-all">
                        <summary className="flex justify-between items-center font-bold text-lg text-gray-900 list-none">
                            <span className="flex items-center gap-3"><HelpCircle className="text-primary" size={20}/> Porque ser um associado Hiperfarma?</span>
                            <ChevronDown className="transition-transform group-open:rotate-180 text-primary" size={24} />
                        </summary>
                        <div className="mt-4 text-gray-600 leading-relaxed pl-8 border-l-2 border-primary/20">
                            O mercado está cada vez mais competitivo e em constante transformação. Uma forma de se manter nesta constante mudança, é se unindo a uma Rede forte, com valores consolidados e que possua toda uma infraestrutura capaz de suprir estas necessidades do empresário atual. União de tecnologia, inteligência de mercado, equipe qualificada e principalmente o foco no objetivo em comum, tudo que hoje a Hiperfarma oferece ao seu associado.
                        </div>
                    </details>
                    
                    <details className="group bg-surface-light p-6 rounded-xl border border-gray-200 open:border-primary/50 cursor-pointer transition-all">
                        <summary className="flex justify-between items-center font-bold text-lg text-gray-900 list-none">
                             <span className="flex items-center gap-3"><TrendingUp className="text-primary" size={20}/> Qual o meu investimento x benefício?</span>
                            <ChevronDown className="transition-transform group-open:rotate-180 text-primary" size={24} />
                        </summary>
                        <div className="mt-4 text-gray-600 leading-relaxed pl-8 border-l-2 border-primary/20">
                             Possuímos 2 taxas fixas mensais. Por sermos uma Associação, todas as verbas arrecadadas, seja através das mensalidades dos associados ou de negociações com fornecedores, são revertidas em benefício ao associado, podendo ser em forma de campanhas, materiais de divulgação ou até mesmo produtos. Possuímos também uma taxa de adesão para a pessoa física representante da loja. Esta pode ser paga à vista ou parcelada. Para consultas de valores, basta entrar em contato conosco.
                        </div>
                    </details>

                    <details className="group bg-surface-light p-6 rounded-xl border border-gray-200 open:border-primary/50 cursor-pointer transition-all">
                        <summary className="flex justify-between items-center font-bold text-lg text-gray-900 list-none">
                             <span className="flex items-center gap-3"><Store className="text-primary" size={20}/> Existe um padrão de layoutização?</span>
                            <ChevronDown className="transition-transform group-open:rotate-180 text-primary" size={24} />
                        </summary>
                        <div className="mt-4 text-gray-600 leading-relaxed pl-8 border-l-2 border-primary/20">
                            Sim, possuímos um padrão de comunicação interno e externo, que orienta o cliente a ter uma visão de unidade da Rede. Nosso associado em seu primeiro contato já toma conhecimento do padrão, através do nosso manual de comunicação constantemente atualizado pelo departamento de marketing. Contamos com um quadro de diretores qualificados, sempre à disposição dos seus associados, e entendem no seu dia-a-dia o que faz a diferença na sua empresa. Uma assembleia mensal, onde de forma transparente, todos os seus associados são ouvidos e recebem informações voltadas ao seu negócio. Um modelo de associativismo que em conjunto fortalece sua marca.
                        </div>
                    </details>

                    <details className="group bg-surface-light p-6 rounded-xl border border-gray-200 open:border-primary/50 cursor-pointer transition-all">
                        <summary className="flex justify-between items-center font-bold text-lg text-gray-900 list-none">
                             <span className="flex items-center gap-3"><CheckCircle2 className="text-primary" size={20}/> O que difere a associação Hiperfarma de uma rede de franquias?</span>
                            <ChevronDown className="transition-transform group-open:rotate-180 text-primary" size={24} />
                        </summary>
                        <div className="mt-4 text-gray-600 leading-relaxed pl-8 border-l-2 border-primary/20">
                             Na Hiperfarma o associado não é somente mais uma farmácia ou número. É um empresário em fase de crescimento, com total administração do seu estabelecimento comercial. Ele usufrui de todas as ferramentas disponibilizadas pela Rede que trabalham interligados: Sistema de informação gerencial, Departamento de Convênios, Departamento Comercial e Negociação, Departamento de Marketing. Contamos com um quadro de diretores qualificados, sempre à disposição dos seus associados, e entendem no seu dia-a-dia o que faz a diferença na sua empresa. Uma assembleia mensal, onde de forma transparente, todos os seus associados são ouvidos e recebem informações voltadas ao seu negócio. Um modelo de associativismo que em conjunto fortalece sua marca.
                        </div>
                    </details>
                </div>
            </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden scroll-mt-24" id="iniciar-analise">
            <div className="absolute inset-0 bg-secondary skew-y-3 transform origin-bottom-right scale-110"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="bg-surface-light rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row max-w-6xl mx-auto border border-gray-200">
                    <div className="p-8 lg:p-16 w-full lg:w-3/5 order-2 lg:order-1 flex flex-col justify-center">
                        <div className="mb-10">
                            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
                                Leve sua farmácia para o próximo nível.
                            </h2>
                            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                Não lute sozinho no mercado. Junte-se à Hiperfarma e cresça com a segurança de uma rede forte.
                            </p>
                            <div className="flex flex-col gap-6 mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">Análise de Perfil Gratuita</h4>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">Estudo de Viabilidade</h4>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">Apresentação do Plano de Negócios</h4>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => onNavigate('wizard')} className="w-full sm:w-auto inline-flex justify-center items-center py-5 px-10 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-xl shadow-primary/30 transform hover:-translate-y-1 transition-all duration-300 text-xl">
                                Solicitar Proposta Agora
                                <Rocket className="ml-3" size={24} />
                            </button>
                            <p className="text-xs text-gray-400 mt-4 text-center sm:text-left">
                                Processo 100% online e sem compromisso.
                            </p>
                        </div>
                    </div>
                    <div className="w-full lg:w-2/5 bg-gray-100 order-1 lg:order-2 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/20 z-10 mix-blend-multiply group-hover:bg-primary/10 transition-all duration-700"></div>
                        <img 
                            alt="Pharmacists discussion" 
                            className="w-full h-full object-cover transform scale-100 group-hover:scale-110 transition-transform duration-1000" 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMDdUOiDm4V4Il7X17QQ_fbxCndUueQtEcP8Bnjl515ORoVy4ILWoat0VqIDVTMl6HCjxZmyog1_ucpaP6bd2ScSnZJUIPBrtjN2oquJJvdfLUN2DUfaDHtvJcGX3myokFTOOuKsQOIEofAz02acxIyPkEn8obIWkhtiDfnT26_zECJUWfvPGbuiKjIUecbQWvv1mEJhYi390MHV3TIiwF3tCRJZt0hrlToLA1KvYc-6klyIchIdWM8lxNZDnKpu_XchGY5wxER3Q"
                        />
                        <div className="absolute bottom-0 left-0 w-full p-10 z-20 bg-gradient-to-t from-black/90 to-transparent">
                            <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20">
                                <p className="text-white font-bold text-xl italic mb-4">"A melhor decisão que tomei para o meu negócio. O suporte da Hiperfarma foi essencial para dobrarmos o faturamento em 12 meses."</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold text-sm uppercase tracking-wide">Ricardo M.</span>
                                        <span className="text-white/70 text-xs">Associado em Curitiba - PR</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="bg-surface-light pt-12 pb-8 border-t border-gray-200 text-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">H</div>
                        <span className="font-bold text-2xl text-gray-900">Hiperfarma</span>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto">
                        R. Roberto Faria, 180 - Fanny<br/>
                        Curitiba - PR, 81030-150
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-8 text-sm text-gray-600">
                    <a className="flex items-center gap-2 hover:text-primary transition-colors" href="tel:+554133301300">
                        <Phone size={16} className="text-primary" /> (41) 3330-1300
                    </a>
                    <a className="flex items-center gap-2 hover:text-primary transition-colors" href="mailto:expansao@redehiperfarma.com.br">
                        <Mail size={16} className="text-primary" /> expansao@redehiperfarma.com.br
                    </a>
                </div>
                <div className="mb-10">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Parceiro Oficial</p>
                    <div className="flex flex-wrap justify-center gap-4 opacity-60">
                        <span className="px-3 py-1 bg-gray-100 rounded text-xs font-bold text-gray-500 flex items-center gap-1">
                            <Handshake size={14} /> Febrafar
                        </span>
                    </div>
                </div>
                <div className="flex justify-center space-x-6 mb-8">
                    <a href="https://www.facebook.com/redehiperfarma" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors transform hover:scale-110">
                        <Facebook size={24} />
                    </a>
                    <a href="https://www.instagram.com/redehiperfarma/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors transform hover:scale-110">
                        <Instagram size={24} />
                    </a>
                    <a href="https://www.linkedin.com/company/redehiperfarma" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors transform hover:scale-110">
                        <Linkedin size={24} />
                    </a>
                </div>
                <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-center items-center gap-6 text-xs text-gray-500">
                    <p>© 2024 Hiperfarma. Todos os direitos reservados.</p>
                    <div className="flex gap-6">
                        <button onClick={() => onNavigate('privacy')} className="hover:text-gray-900 transition-colors">Política de Privacidade</button>
                        <button onClick={() => onNavigate('terms')} className="hover:text-gray-900 transition-colors">Termos de Uso</button>
                    </div>
                </div>
            </div>
        </footer>

        {/* Whatsapp Float */}
        <a href="https://wa.me/5541984060755" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-3 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 group">
            <span className="font-bold hidden group-hover:block whitespace-nowrap">Falar com Expansão</span>
            <svg className="w-6 h-6 fill-current" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l121.7-31.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"></path></svg>
        </a>

        {/* Video Modal */}
        {isVideoOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsVideoOpen(false)}>
            <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
               <button className="absolute top-4 right-4 text-white hover:text-primary z-10 bg-black/50 rounded-full p-2 transition-colors" onClick={() => setIsVideoOpen(false)}>
                 <X size={24} />
               </button>
               <iframe
                 width="100%"
                 height="100%"
                 src="https://www.youtube-nocookie.com/embed/1GUk5sEe-to?si=lqKS0wSbjagfit4W&autoplay=1"
                 title="YouTube video player"
                 frameBorder="0"
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                 referrerPolicy="strict-origin-when-cross-origin"
                 allowFullScreen
               ></iframe>
            </div>
          </div>
        )}
    </div>
  );
};

export default LandingPage;