'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Logo } from '@/components/ui/Logo';
import { buildAssociarHref, shouldTrackLpView, trackAcquisitionEvent } from '@/app/funnel/_utils/attribution';
import {
  Menu, ArrowRight, PlayCircle, Handshake, Store, Megaphone,
  TrendingUp, CreditCard, Building2, Tag, ChevronDown, Rocket,
  Phone, Mail, Facebook, Instagram, Linkedin, CheckCircle2,
  ShoppingBag, Pill, HelpCircle, ShieldCheck, BadgeCheck, Clock3, X,
  Star, Quote, Package, Percent, Users
} from 'lucide-react';

const LP_DEFAULT_VARIANT = process.env.NEXT_PUBLIC_LP_VARIANT_V1 || process.env.NEXT_PUBLIC_LP_VARIANT || 'control';

export default function LandingPage() {
  const router = useRouter();
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!shouldTrackLpView()) return;
    void trackAcquisitionEvent({
      eventName: 'LP_VIEW',
      page: '/',
      variant: LP_DEFAULT_VARIANT,
      metadata: { referrer: typeof document !== 'undefined' ? document.referrer : '' },
    });
  }, []);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);

  const navigateTo = (page: string, ctaId?: string) => {

    closeMenu();

    const routes: Record<string, string> = {
      'wizard': buildAssociarHref(LP_DEFAULT_VARIANT),
      'privacy': '/privacidade',
      'terms': '/termos'
    };

    const route = routes[page];
    if (route) {
      if (page === 'wizard') {
        void trackAcquisitionEvent({
          eventName: 'LP_CTA_CLICK',
          page: '/',
          ctaId: ctaId || 'unknown',
          variant: LP_DEFAULT_VARIANT,
        });
      }
      router.push(route);
    }
  }

  return (
    <div className="font-sans text-gray-800 bg-white selection:bg-primary/30">
      <style>{`html { scroll-behavior: smooth; }`}</style>

      {/* Navbar */}
      <nav aria-label="Navegacao principal" className="fixed w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex-shrink-0 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
              <Logo height={40} />
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex space-x-8 items-center">
              <a href="#vantagens" className="text-gray-600 hover:text-primary font-medium transition-colors">Vantagens</a>
              <a href="#ferramentas" className="text-gray-600 hover:text-primary font-medium transition-colors">Ferramentas</a>
              <a href="#como-funciona" className="text-gray-600 hover:text-primary font-medium transition-colors">Como Funciona</a>
              <a href="#faq" className="text-gray-600 hover:text-primary font-medium transition-colors">Dúvidas</a>



              <button
                onClick={() => navigateTo('wizard', 'nav_desktop_primary')}
                className="min-h-11 border-2 border-primary text-primary hover:bg-primary hover:text-white px-5 py-2 rounded-lg font-semibold transition-all duration-300"
              >
                Seja um Associado
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={toggleMenu}
                className="text-gray-600 hover:text-primary p-3 focus:outline-none transition-colors"
                aria-label="Menu principal"
              >
                {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-200 animate-in slide-in-from-top-5 duration-200 absolute w-full z-40 shadow-xl max-h-[90vh] overflow-y-auto">
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
                href="#como-funciona"
                onClick={closeMenu}
                className="block px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-primary hover:bg-primary/5 transition-colors"
              >
                Como Funciona
              </a>
              <a
                href="#faq"
                onClick={closeMenu}
                className="block px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-primary hover:bg-primary/5 transition-colors"
              >
                Dúvidas
              </a>
              <div className="pt-2 mt-2 border-t border-gray-100">
                <button
                  onClick={() => { closeMenu(); navigateTo('wizard', 'nav_mobile_primary'); }}
                  className="min-h-11 w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-bold rounded-lg text-white bg-primary hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
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
                Aqui, quem caminha junto, vai mais longe
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight mb-6">
                Sua farmácia muito mais <span className="text-primary">competitiva e lucrativa</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-[65ch] mx-auto lg:mx-0 leading-relaxed">
                Associe-se à Hiperfarma e tenha acesso a negociações exclusivas, marketing de impacto e ferramentas de gestão que transformam o seu negócio.
              </p>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                <button
                  onClick={() => navigateTo('wizard', 'hero_primary')}
                  className="inline-flex justify-center items-center px-8 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg text-lg transition-all duration-300 shadow-lg shadow-primary/30 transform hover:-translate-y-1"
                >
                  Quero ser um Associado
                  <ArrowRight className="ml-2" size={20} />
                </button>
                <button
                  onClick={() => setIsVideoOpen(true)}
                  className="inline-flex justify-center items-center px-8 py-4 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg text-lg hover:border-primary hover:text-primary transition-all duration-300"
                >
                  <PlayCircle className="mr-2 text-primary" size={20} />
                  Conheça a Rede
                </button>
              </div>
              <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-gray-500">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white overflow-hidden">
                    <Image alt="Portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHH6HQ0LiEoc3kYKDUH4wJaWTMUJdkSXZkYB8aSBMqRRnZjLP2CjmnfEcwWeL4jrZgKYZGSw8rVt-NFzddSHX4IvsFAErfePs8ukPHVEm06HuKrOdBhnFVcDhI3Si22Pm2IMYBV3oPmC8VFK74vJzMNF_HunJCn_qX1KQzNxVoDTJMbWcQ8I3HeKvDAdLH_9mPBrWUeAj6Dc5OARIkiXjD-Wi3zZUg6kLeHUQBnh24rbghPZYayfesfyDXLlGG01BK_fQd7gVUVeM" width={32} height={32} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white overflow-hidden">
                    <Image alt="Portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDiFFUXLpBbHP5Dg8-mGZ2oApYtfXbhpRlRrNkUsYYOV_Ja9_EZOlzuqsJ_ibKyenKETxKulWHqYYGdVI6FVAG2CinqsT9qEHPqlBpqK6X5ZyXOcQI_cbRIvMsMn1tMi25G6-IKusL2vAP-SfhFY09Kd7fsixoBDDNWJP-YFMgx1Y49YRYbbo2XSb8PTyhCHkMXB-w8asiw11hgztoiNTE-rl_-4c_k3BPTUNu0QPRY53Oc3Glap03JnVw8BSfE3RmKwzg4UrvqWfQ" width={32} height={32} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white overflow-hidden">
                    <Image alt="Portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkBYhXeMYkopMp_hPAyIt1SPi9eQKFoSRz6XSNcJdNijpCr_65hwl0C8KZ0L1lY8JiGBDiViUn9ZHH4D-_Tl--Ebk-AxuamFLBHltgXL-iOW2pA3aMOykkoee0JyE2YjwcGB9dbC50buihsrc9nftxObNiI4_59qxjqdjJwKWn5dSCNU6dArhrR9n5itJjefN2OcogWbOGUBZ9C1K_4vCHVOpgPRu8IdoLwJIAuBcMQNURMMtN0MoJeLNDGQ6X7P5_fmJG0d60-ds" width={32} height={32} />
                  </div>
                </div>
                <p>Junte-se a <span className="font-bold text-gray-900">200+</span> lojas associadas</p>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto lg:mx-0">
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <ShieldCheck size={16} className="text-primary flex-shrink-0" />
                  Sem franquia
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <BadgeCheck size={16} className="text-primary flex-shrink-0" />
                  25+ anos de rede
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <Clock3 size={16} className="text-primary flex-shrink-0" />
                  Suporte especializado
                </div>
              </div>
            </div>
            <div className="relative lg:h-full flex items-center justify-center">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-white">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent z-10"></div>
                <Image
                  alt="Expansão Hiperfarma Hero"
                  className="w-full h-full object-contain"
                  src="/expansao-hiperfarma-hero.png"
                  width={1200}
                  height={900}
                  priority
                  fetchPriority="high"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-gray-100 flex items-center gap-3 z-20 animate-bounce [animation-duration:3s]">
                <div className="bg-secondary/10 p-2 rounded-lg">
                  <Handshake className="text-secondary" size={24} />
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
            <div className="p-3">
              <p className="text-3xl lg:text-4xl font-extrabold text-white mb-2">200+</p>
              <p className="text-white/80 font-medium text-sm">Lojas Associadas</p>
            </div>
            <div className="p-3">
              <p className="text-3xl lg:text-4xl font-extrabold text-white mb-2">500+</p>
              <p className="text-white/80 font-medium text-sm">Empresas Conveniadas</p>
            </div>
            <div className="p-3">
              <p className="text-3xl lg:text-4xl font-extrabold text-white mb-2">2M+</p>
              <p className="text-white/80 font-medium text-sm">Clientes Conveniados</p>
            </div>
            <div className="p-3">
              <p className="text-3xl lg:text-4xl font-extrabold text-white mb-2">1M+</p>
              <p className="text-white/80 font-medium text-sm">Clientes Hiper Club</p>
            </div>
            <div className="p-3 relative">
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse hidden lg:block"></div>
              <p className="text-3xl lg:text-4xl font-extrabold text-white mb-2">15,8%</p>
              <p className="text-white/80 font-medium text-sm">Crescimento Médio a.a.</p>
            </div>
            <div className="p-3 relative">
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse hidden lg:block"></div>
              <p className="text-3xl lg:text-4xl font-extrabold text-white mb-2">12-18%</p>
              <p className="text-white/80 font-medium text-sm">Economia em Compras</p>
            </div>
          </div>
          <p className="text-center text-white/50 text-xs mt-4">* Dados do setor associativista farmacêutico (Febrafar, 2025)</p>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-20 bg-gray-50 border-b border-gray-100 scroll-mt-24" id="como-funciona">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-primary font-bold tracking-wider uppercase text-sm mb-3">Passo a Passo</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Como entrar para a rede</h2>
            <p className="text-lg text-gray-600 max-w-[65ch] mx-auto">
              Processo claro, com previsibilidade desde o primeiro contato até a ativação da sua farmácia.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Passo 1</p>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Diagnóstico do Perfil</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Entendemos o momento da sua loja e validamos aderência ao modelo associativo.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Passo 2</p>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Estudo de Viabilidade</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Avaliamos potencial de ganho com convênios, compra coletiva e fidelização.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Passo 3</p>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Plano e Implantação</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Formalização simples, ativação das ferramentas e suporte para acelerar resultados.
              </p>
            </div>
          </div>

          <div className="mt-10 max-w-2xl mx-auto">
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden" role="presentation" aria-hidden="true">
              <div className="h-full w-1/3 bg-primary"></div>
            </div>
            <p className="mt-2 text-sm text-gray-500 text-center">Passo 1 de 3: inicie com uma análise gratuita</p>
          </div>
        </div>
      </section>

      {/* Vantagens */}
      <section className="py-20 bg-white scroll-mt-24" id="vantagens">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-primary font-bold tracking-wider uppercase text-sm mb-3">Nossos Pilares</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Por que escolher a Hiperfarma?</h2>
            <p className="text-gray-600 text-lg">Entregamos ferramentas reais que aumentam a competitividade, o fluxo de clientes e a rentabilidade da sua farmácia.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Pilar 1 */}
            <div className="group bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                <ShoppingBag size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Poder de Compra</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Acesse condições comerciais exclusivas. Negociações em bloco, OLs e transferências com as principais indústrias e distribuidoras garantem sua competitividade.
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="group bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                <CreditCard size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Hiper Club de Descontos</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Nossa ferramenta mais forte. Com mais de <strong>1 milhão de clientes fidelizados</strong>, você oferece descontos reais, acumula inteligência de dados e retém seu público.
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="group bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                <Building2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Convênios Corporativos</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Mais de <strong>500 empresas conveniadas</strong> no PR e SC. Direcionamos fluxo garantido de colaboradores que compram na sua farmácia.
              </p>
            </div>

            {/* Pilar 4 */}
            <div className="group bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                <Pill size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Gestão de PBMs</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Esteja conectado aos principais programas de laboratórios (VidaLink, e-Pharma, Funcional), oferecendo os descontos que o cliente procura.
              </p>
            </div>

            {/* Pilar 5 */}
            <div className="group bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                <Megaphone size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Marketing Cooperado</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Tablóides de ofertas mensais, gestão profissional de redes sociais, rádio interna e materiais de ponto de venda para manter sua marca ativa.
              </p>
            </div>

            {/* Pilar 6 */}
            <div className="group bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                <Store size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Marca e Credibilidade</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Faça parte de uma história de mais de 25 anos. A marca Hiperfarma é sinônimo de confiança e preço justo para o consumidor paranaense e catarinense.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* OLs e Marca Propria */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden" id="ols">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-primary rounded-full blur-[120px]"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-secondary rounded-full blur-[120px]"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-semibold mb-4 border border-primary/30">
                <Package size={16} className="mr-2" />
                Diferencial Exclusivo
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6 leading-tight">
                Ofertas de Laboratório e <span className="text-primary">Marca Própria</span>
              </h2>
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Além das negociações em bloco, nossos associados têm acesso a ofertas exclusivas de laboratórios (OLs) e produtos de marca própria com margens superiores às do mercado.
              </p>
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Percent className="text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Margem Superior</h3>
                    <p className="text-gray-400 mt-1">Produtos com margens de 40-60%, muito acima dos genéricos tradicionais. Mais lucro por unidade vendida.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <ShieldCheck className="text-secondary" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Exclusividade Regional</h3>
                    <p className="text-gray-400 mt-1">Ofertas negociadas exclusivamente para a rede — seus concorrentes não têm acesso às mesmas condições.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Users className="text-green-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Suporte de Implantação</h3>
                    <p className="text-gray-400 mt-1">Treinamento de equipe, material de PDV e apoio do departamento comercial para maximizar suas vendas.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center hover:border-primary/50 transition-colors">
                <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Package className="text-primary" size={28} />
                </div>
                <p className="text-2xl font-extrabold text-white mb-1">OLs</p>
                <p className="text-gray-400 text-sm">Ofertas de Laboratório com desconto exclusivo</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center hover:border-primary/50 transition-colors">
                <div className="w-14 h-14 bg-secondary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Store className="text-secondary" size={28} />
                </div>
                <p className="text-2xl font-extrabold text-white mb-1">Marca Própria</p>
                <p className="text-gray-400 text-sm">Produtos exclusivos da rede Hiperfarma</p>
              </div>
              <div className="col-span-2 bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center hover:border-primary/50 transition-colors">
                <p className="text-3xl font-extrabold text-white mb-2">40-60%</p>
                <p className="text-gray-300 text-sm">Margens médias em produtos de marca própria</p>
                <p className="text-gray-500 text-xs mt-2">vs. 15-25% em genéricos convencionais</p>
              </div>
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
              <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-white">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent z-10"></div>
                <Image
                  alt="Hiperfarma Club e Convenios"
                  className="w-full h-full object-cover"
                  src="/expansao-hiperfarma-conv-club.png"
                  width={1200}
                  height={900}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
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
                    <h3 className="text-xl font-bold text-gray-900">Rede de Convênios</h3>
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
                    <h3 className="text-xl font-bold text-gray-900">Hiper Club de Descontos</h3>
                    <p className="text-gray-600 mt-2">
                      Sistema de fidelização robusto com APP exclusivo e mais de <strong>1 milhão de usuários</strong>. Ofereça descontos personalizados e acumule pontos para fazer o cliente voltar sempre.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100">
                <button onClick={() => navigateTo('wizard', 'tools_section_primary')} className="text-primary hover:text-primary-dark font-bold inline-flex items-center group">
                  Quero habilitar essas ferramentas
                  <ArrowRight className="ml-2 transform group-hover:translate-x-1 transition-transform" size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white scroll-mt-24" id="faq">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Perguntas Frequentes</h2>
            <p className="text-gray-600">Tudo o que você precisa saber sobre o modelo de licenciamento Hiperfarma.</p>
          </div>
          <div className="space-y-4">
            <details className="group bg-white p-6 rounded-xl border border-gray-200 open:border-primary/50 cursor-pointer transition-all">
              <summary className="flex justify-between items-center font-bold text-lg text-gray-900 list-none">
                <span className="flex items-center gap-3"><HelpCircle className="text-primary" size={20} /> Porque ser um associado Hiperfarma?</span>
                <ChevronDown className="transition-transform group-open:rotate-180 text-primary" size={24} />
              </summary>
              <div className="mt-4 max-w-[65ch] text-gray-600 leading-relaxed pl-8 border-l-2 border-primary/20">
                O mercado está cada vez mais competitivo e em constante transformação. Uma forma de se manter nesta constante mudança, é se unindo a uma Rede forte, com valores consolidados e que possua toda uma infraestrutura capaz de suprir estas necessidades do empresário atual. União de tecnologia, inteligência de mercado, equipe qualificada e principalmente o foco no objetivo em comum, tudo que hoje a Hiperfarma oferece ao seu associado.
              </div>
            </details>

            <details className="group bg-white p-6 rounded-xl border border-gray-200 open:border-primary/50 cursor-pointer transition-all">
              <summary className="flex justify-between items-center font-bold text-lg text-gray-900 list-none">
                <span className="flex items-center gap-3"><TrendingUp className="text-primary" size={20} /> Qual o meu investimento x benefício?</span>
                <ChevronDown className="transition-transform group-open:rotate-180 text-primary" size={24} />
              </summary>
              <div className="mt-4 max-w-[65ch] text-gray-600 leading-relaxed pl-8 border-l-2 border-primary/20">
                Possuímos 2 taxas fixas mensais. Por sermos uma Associação, todas as verbas arrecadadas, seja através das mensalidades dos associados ou de negociações com fornecedores, são revertidas em benefício ao associado, podendo ser em forma de campanhas, materiais de divulgação ou até mesmo produtos. Possuímos também uma taxa de adesão para a pessoa física representante da loja. Esta pode ser paga à vista ou parcelada. Para consultas de valores, basta entrar em contato conosco.
              </div>
            </details>

            <details className="group bg-white p-6 rounded-xl border border-gray-200 open:border-primary/50 cursor-pointer transition-all">
              <summary className="flex justify-between items-center font-bold text-lg text-gray-900 list-none">
                <span className="flex items-center gap-3"><Store className="text-primary" size={20} /> Existe um padrão de layoutização?</span>
                <ChevronDown className="transition-transform group-open:rotate-180 text-primary" size={24} />
              </summary>
              <div className="mt-4 max-w-[65ch] text-gray-600 leading-relaxed pl-8 border-l-2 border-primary/20">
                Sim, possuímos um padrão de comunicação interno e externo, que orienta o cliente a ter uma visão de unidade da Rede. Nosso associado em seu primeiro contato já toma conhecimento do padrão, através do nosso manual de comunicação constantemente atualizado pelo departamento de marketing. Contamos com um quadro de diretores qualificados, sempre à disposição dos seus associados, e entendem no seu dia-a-dia o que faz a diferença na sua empresa. Uma assembleia mensal, onde de forma transparente, todos os seus associados são ouvidos e recebem informações voltadas ao seu negócio. Um modelo de associativismo que em conjunto fortalece sua marca.
              </div>
            </details>

            <details className="group bg-white p-6 rounded-xl border border-gray-200 open:border-primary/50 cursor-pointer transition-all">
              <summary className="flex justify-between items-center font-bold text-lg text-gray-900 list-none">
                <span className="flex items-center gap-3"><CheckCircle2 className="text-primary" size={20} /> O que difere a associação Hiperfarma de uma rede de franquias?</span>
                <ChevronDown className="transition-transform group-open:rotate-180 text-primary" size={24} />
              </summary>
              <div className="mt-4 max-w-[65ch] text-gray-600 leading-relaxed pl-8 border-l-2 border-primary/20">
                Na Hiperfarma o associado não é somente mais uma farmácia ou número. É um empresário em fase de crescimento, com total administração do seu estabelecimento comercial. Ele usufrui de todas as ferramentas disponibilizadas pela Rede que trabalham interligados: Sistema de informação gerencial, Departamento de Convênios, Departamento Comercial e Negociação, Departamento de Marketing. Contamos com um quadro de diretores qualificados, sempre à disposição dos seus associados, e entendem no seu dia-a-dia o que faz a diferença na sua empresa. Uma assembleia mensal, onde de forma transparente, todos os seus associados são ouvidos e recebem informações voltadas ao seu negócio. Um modelo de associativismo que em conjunto fortalece sua marca.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-20 bg-gray-50 border-y border-gray-100" id="depoimentos">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-primary font-bold tracking-wider uppercase text-sm mb-3">O que Dizem Nossos Associados</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Histórias reais de quem já faz parte</h2>
            <p className="text-gray-600 text-lg">Farmácias de diferentes portes e regiões que transformaram seus resultados com a Hiperfarma.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Depoimento 1 — 1 loja, interior */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 relative">
              <div className="absolute -top-4 left-8">
                <div className="bg-primary text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                  <Quote size={20} />
                </div>
              </div>
              <div className="flex items-center gap-1 mb-4 mt-2">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-gray-700 leading-relaxed mb-6 italic">
                &quot;Com os convênios da rede, minha farmácia recebeu mais de 40% de clientes novos no primeiro trimestre. Gente que nunca tinha entrado na loja passou a ser cliente fiel.&quot;
              </p>
              <div className="border-t border-gray-100 pt-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">FS</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Fernanda S.</p>
                  <p className="text-sm text-gray-500">Proprietária · 1 loja · Londrina - PR</p>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200">+40% clientes novos</span>
              </div>
            </div>

            {/* Depoimento 2 — Rede média */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 relative">
              <div className="absolute -top-4 left-8">
                <div className="bg-secondary text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-secondary/30">
                  <Quote size={20} />
                </div>
              </div>
              <div className="flex items-center gap-1 mb-4 mt-2">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-gray-700 leading-relaxed mb-6 italic">
                &quot;A negociação em bloco foi um divisor de águas. Economizamos 18% nas compras e conseguimos repassar parte dessa economia em preços mais competitivos para os clientes.&quot;
              </p>
              <div className="border-t border-gray-100 pt-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <span className="text-secondary font-bold text-lg">CA</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Carlos A.</p>
                  <p className="text-sm text-gray-500">Sócio-proprietário · 3 lojas · Florianópolis - SC</p>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">18% economia em compras</span>
              </div>
            </div>

            {/* Depoimento 3 — Farmacêutico RT sócio */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 relative">
              <div className="absolute -top-4 left-8">
                <div className="bg-primary text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                  <Quote size={20} />
                </div>
              </div>
              <div className="flex items-center gap-1 mb-4 mt-2">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-gray-700 leading-relaxed mb-6 italic">
                &quot;O Hiper Club transformou minha relação com os clientes. Em seis meses fidelizamos mais de 3.000 pessoas. A ferramenta praticamente se paga com o retorno de clientes recorrentes.&quot;
              </p>
              <div className="border-t border-gray-100 pt-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">JP</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Juliana P.</p>
                  <p className="text-sm text-gray-500">Farmacêutica RT · 2 lojas · Maringá - PR</p>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-2 py-1 rounded-full border border-purple-200">+3.000 clientes fidelizados</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <button onClick={() => navigateTo('wizard', 'testimonials_cta')} className="inline-flex items-center px-8 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg text-lg transition-all duration-300 shadow-lg shadow-primary/30 transform hover:-translate-y-1">
              Quero resultados assim
              <ArrowRight className="ml-2" size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden scroll-mt-24" id="iniciar-analise">
        <div className="absolute inset-0 bg-secondary skew-y-3 transform origin-bottom-right scale-110"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row max-w-6xl mx-auto border border-gray-200">
            <div className="p-8 lg:p-16 w-full lg:w-3/5 order-2 lg:order-1 flex flex-col justify-center">
              <div className="mb-10">
                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
                  Leve sua farmácia para o próximo nível
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
                      <h3 className="font-bold text-gray-900">Análise de Perfil Gratuita</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Estudo de Viabilidade</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Apresentação do Plano de Negócios</h3>
                    </div>
                  </div>
                </div>
                <button onClick={() => navigateTo('wizard', 'final_cta_primary')} className="w-full sm:w-auto inline-flex justify-center items-center py-5 px-10 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-xl shadow-primary/30 transform hover:-translate-y-1 transition-all duration-300 text-xl">
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
              <Image
                alt="Depoimento Hiperfarma"
                className="w-full h-full object-cover transform scale-100 group-hover:scale-110 transition-transform duration-1000"
                src="/expansao-hiperfarma-depo.png"
                width={1200}
                height={900}
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
              <div className="absolute bottom-0 left-0 w-full p-10 z-20 bg-gradient-to-t from-black/90 to-transparent">
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20">
                  <p className="text-white font-bold text-xl italic mb-4">&quot;A melhor decisão que tomei para o meu negócio. O suporte da Hiperfarma foi essencial para dobrarmos o faturamento em 12 meses.&quot;</p>
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
      <footer className="bg-white pt-12 pb-8 border-t border-gray-200 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4">
              <Logo height={40} />
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto">
              R. Roberto Faria, 180 - Fanny<br />
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
            <a href="https://www.facebook.com/redehiperfarma" target="_blank" rel="noopener noreferrer" aria-label="Facebook da Rede Hiperfarma" title="Facebook da Rede Hiperfarma" className="text-gray-400 hover:text-primary transition-colors transform hover:scale-110">
              <Facebook size={24} />
            </a>
            <a href="https://www.instagram.com/redehiperfarma/" target="_blank" rel="noopener noreferrer" aria-label="Instagram da Rede Hiperfarma" title="Instagram da Rede Hiperfarma" className="text-gray-400 hover:text-primary transition-colors transform hover:scale-110">
              <Instagram size={24} />
            </a>
            <a href="https://www.linkedin.com/company/redehiperfarma" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn da Rede Hiperfarma" title="LinkedIn da Rede Hiperfarma" className="text-gray-400 hover:text-primary transition-colors transform hover:scale-110">
              <Linkedin size={24} />
            </a>
          </div>
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-center items-center gap-6 text-xs text-gray-500">
            <p>© {new Date().getFullYear()} Hiperfarma. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">Política de Privacidade</a>
              <a href="/termos" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">Termos de Uso</a>
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
            <button type="button" aria-label="Fechar video" title="Fechar video" className="absolute top-4 right-4 text-white hover:text-primary z-10 bg-black/50 rounded-full p-2 transition-colors" onClick={() => setIsVideoOpen(false)}>
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
