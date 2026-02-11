import React from 'react';
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react';

interface PrivacyPolicyProps {
    onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 font-display text-gray-800">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
                <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
                    <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">H</div>
                    <span className="font-bold text-2xl text-secondary tracking-tight">Hiperfarma</span>
                </div>
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                >
                    <ArrowLeft size={18} /> Voltar ao início
                </button>
            </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6 text-primary">
                <ShieldCheck size={32} />
                <h1 className="text-3xl font-bold text-gray-900">Política de Privacidade</h1>
            </div>
            
            <p className="text-sm text-gray-500 mb-8">Última atualização: 10 de Fevereiro de 2026</p>

            <div className="prose prose-slate max-w-none space-y-6 text-gray-600 leading-relaxed">
                <p>
                    A <strong>Rede Hiperfarma</strong> valoriza a privacidade de seus usuários e está comprometida com a proteção de seus dados pessoais. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e compartilhamos suas informações ao utilizar nosso site e preencher nossos formulários de expansão e qualificação.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. Coleta de Dados</h3>
                <p>
                    Coletamos informações pessoais que você nos fornece voluntariamente ao preencher o formulário "Seja um Associado" ou entrar em contato conosco. Os dados coletados podem incluir:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Dados de Identificação:</strong> Nome completo, cargo, e-mail profissional e telefone/WhatsApp.</li>
                    <li><strong>Dados Empresariais:</strong> Nome da farmácia, número de lojas, faturamento médio, tempo de mercado e localização (Estado/Cidade).</li>
                    <li><strong>Dados Estratégicos:</strong> Motivações para associação, desafios do negócio e urgência na tomada de decisão.</li>
                </ul>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. Finalidade do Uso dos Dados</h3>
                <p>Utilizamos seus dados estritamente para fins comerciais e de expansão da rede, incluindo:</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Realizar a pré-qualificação e análise de perfil para associação à Rede Hiperfarma.</li>
                    <li>Entrar em contato para agendar reuniões, apresentar propostas e tirar dúvidas.</li>
                    <li>Enviar materiais educativos, newsletters e informações sobre o mercado farmacêutico (caso consentido).</li>
                    <li>Melhorar nossos serviços e entender o perfil demográfico dos interessados na rede.</li>
                </ul>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Compartilhamento de Dados</h3>
                <p>
                    A Hiperfarma <strong>não vende</strong> seus dados pessoais. Podemos compartilhar suas informações apenas nas seguintes circunstâncias:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Com prestadores de serviço:</strong> Empresas que nos auxiliam na operação do site, sistemas de CRM e automação de marketing, desde que sigam normas rigorosas de segurança.</li>
                    <li><strong>Obrigações Legais:</strong> Quando exigido por lei ou ordem judicial.</li>
                </ul>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. Segurança das Informações</h3>
                <p>
                    Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acesso não autorizado, perda ou alteração. Utilizamos criptografia (SSL) na transmissão de dados e armazenamos as informações em servidores seguros.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. Seus Direitos (LGPD)</h3>
                <p>
                    Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem o direito de:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Confirmar a existência de tratamento de dados.</li>
                    <li>Acessar os dados que possuímos sobre você.</li>
                    <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
                    <li>Solicitar a eliminação dos dados pessoais (exceto quando a manutenção for necessária por lei).</li>
                    <li>Revogar seu consentimento a qualquer momento.</li>
                </ul>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">6. Cookies e Tecnologias de Rastreamento</h3>
                <p>
                    Utilizamos cookies para melhorar sua experiência de navegação e analisar o tráfego do site. Você pode gerenciar suas preferências de cookies nas configurações do seu navegador.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">7. Contato</h3>
                <p>
                    Para exercer seus direitos ou tirar dúvidas sobre esta Política de Privacidade, entre em contato com nosso Encarregado de Dados (DPO) através do e-mail:
                </p>
                <p className="font-medium text-primary mt-2">
                    lgpd@redehiperfarma.com.br
                </p>

                <div className="mt-8 pt-8 border-t border-gray-100">
                    <p className="font-bold text-gray-900">Hiperfarma - Administração Central</p>
                    <p>R. Roberto Faria, 180 - Fanny, Curitiba - PR, 81030-150</p>
                </div>
            </div>
        </div>

        <div className="text-center mt-8 text-sm text-gray-400 flex items-center justify-center gap-2">
            <Lock size={12} /> Seus dados estão protegidos.
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;