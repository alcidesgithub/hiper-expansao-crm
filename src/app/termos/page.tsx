'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function TermsOfUsePage() {
    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <Link href="/" className="cursor-pointer">
                            <Logo height={40} />
                        </Link>
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                        >
                            <ArrowLeft size={18} /> Voltar ao início
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
                    <div className="flex items-center gap-3 mb-6 text-secondary">
                        <FileText size={32} />
                        <h1 className="text-3xl font-bold text-gray-900">Termos de Uso</h1>
                    </div>

                    <p className="text-sm text-gray-500 mb-8">Última atualização: 10 de Fevereiro de 2026</p>

                    <div className="prose prose-slate max-w-none space-y-6 text-gray-600 leading-relaxed">
                        <p>
                            Bem-vindo ao portal de expansão da <strong>Rede Hiperfarma</strong>. Ao acessar este site e utilizar nossos serviços, você concorda em cumprir estes Termos de Uso. Caso não concorde com algum dos termos, recomendamos que não utilize nossos serviços.
                        </p>

                        <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. Objeto</h3>
                        <p>
                            Este site tem como objetivo fornecer informações sobre o modelo de associativismo da Rede Hiperfarma e captar interessados (proprietários e gestores de farmácias) em se tornar associados. O site oferece formulários de qualificação, materiais educativos e canais de contato.
                        </p>

                        <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. Uso do Site e Veracidade das Informações</h3>
                        <p>
                            Ao preencher nossos formulários de cadastro ou qualificação, você se compromete a:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Fornecer informações verdadeiras, exatas, atuais e completas sobre você e sua empresa.</li>
                            <li>Não utilizar identidade falsa ou declarar falsamente sua afiliação a qualquer pessoa ou entidade.</li>
                            <li>A Rede Hiperfarma se reserva o direito de desqualificar leads ou recusar associações caso sejam detectadas informações inconsistentes ou fraudulentas.</li>
                        </ul>

                        <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Propriedade Intelectual</h3>
                        <p>
                            Todo o conteúdo deste site, incluindo textos, gráficos, logotipos, ícones, imagens, clipes de áudio, downloads digitais e compilações de dados, é de propriedade exclusiva da <strong>Rede Hiperfarma</strong> ou de seus fornecedores de conteúdo e é protegido pelas leis de direitos autorais do Brasil. É proibida a reprodução, duplicação, cópia, venda ou exploração comercial de qualquer parte do site sem consentimento expresso por escrito.
                        </p>

                        <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. Limitação de Responsabilidade</h3>
                        <p>
                            A Hiperfarma envida seus melhores esforços para manter as informações do site atualizadas e precisas. No entanto, não garantimos que o conteúdo seja livre de erros. A Hiperfarma não será responsável por quaisquer danos diretos, indiretos, incidentais ou consequenciais decorrentes do uso ou da incapacidade de uso deste site.
                        </p>

                        <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. Links para Terceiros</h3>
                        <p>
                            Nosso site pode conter links para sites de terceiros (ex: parceiros, redes sociais). A Hiperfarma não controla e não é responsável pelo conteúdo ou pelas práticas de privacidade desses sites.
                        </p>

                        <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">6. Alterações nos Termos</h3>
                        <p>
                            Podemos atualizar estes Termos de Uso periodicamente. Recomendamos que você revise esta página regularmente para estar ciente de quaisquer alterações. O uso continuado do site após a publicação de alterações constitui aceitação dos novos termos.
                        </p>

                        <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">7. Legislação e Foro</h3>
                        <p>
                            Estes Termos serão regidos e interpretados de acordo com as leis da República Federativa do Brasil. Fica eleito o Foro da Comarca de Curitiba, Estado do Paraná, para dirimir quaisquer questões oriundas destes Termos, com renúncia a qualquer outro, por mais privilegiado que seja.
                        </p>

                        <div className="mt-8 pt-8 border-t border-gray-100">
                            <p className="font-bold text-gray-900">Hiperfarma - Administração Central</p>
                            <p>R. Roberto Faria, 180 - Fanny, Curitiba - PR, 81030-150</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
