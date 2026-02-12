'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const contents = [
    {
        title: 'Como expandir sua rede de farmácias',
        description: 'Guia completo com estratégias comprovadas para expandir seu negócio farmacêutico de forma sustentável.',
        url: 'https://blog.hiperfarma.com.br/expansao',
        tag: 'Guia',
    },
    {
        title: 'Vantagens de uma rede associativista',
        description: 'Entenda como a força da associação pode reduzir custos e aumentar seu poder de compra.',
        url: 'https://blog.hiperfarma.com.br/vantagens-associacao',
        tag: 'Artigo',
    },
    {
        title: 'Cases de sucesso Hiperfarma',
        description: 'Conheça histórias reais de farmácias que cresceram com a Rede Hiperfarma.',
        url: 'https://hiperfarma.com.br/cases',
        tag: 'Cases',
    },
    {
        title: 'Webinar: o futuro do varejo farmacêutico',
        description: 'Assista nossa palestra sobre tendências e oportunidades no setor farmacêutico.',
        url: 'https://hiperfarma.com.br/webinar',
        tag: 'Vídeo',
    },
    {
        title: 'Ferramentas de gestão para farmácias',
        description: 'Descubra as melhores ferramentas e práticas para otimizar a gestão da sua farmácia.',
        url: 'https://blog.hiperfarma.com.br/gestao-farmacias',
        tag: 'Ferramentas',
    },
    {
        title: 'Checklist: sua farmácia está pronta para crescer?',
        description: 'Avalie se o momento da sua farmácia é ideal para expansão com nosso checklist gratuito.',
        url: 'https://hiperfarma.com.br/checklist-expansao',
        tag: 'Checklist',
    },
];

function getPageCopy(perfil: string | null) {
    if (perfil === 'influenciador') {
        return {
            badge: 'Conteúdo para influenciadores',
            title: 'Materiais para apoiar a decisão',
            description:
                'Você pode influenciar a escolha. Use os conteúdos abaixo para estruturar uma recomendação clara ao decisor.',
        };
    }

    if (perfil === 'pesquisador') {
        return {
            badge: 'Conteúdo introdutório',
            title: 'Conheça o modelo Hiperfarma',
            description:
                'Explore os materiais e entenda como funciona a associação antes de envolver sua diretoria.',
        };
    }

    return {
        badge: 'Conteúdo exclusivo',
        title: 'Prepare-se para o próximo passo',
        description:
            'Enquanto nossa equipe analisa seu perfil, aproveite para conhecer mais sobre expansão farmacêutica e as vantagens da Rede Hiperfarma.',
    };
}

function EducationContent() {
    const searchParams = useSearchParams();
    const perfil = searchParams.get('perfil');
    const copy = getPageCopy(perfil);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                        {copy.badge}
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">
                        {copy.title}
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        {copy.description}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-10">
                    {contents.map((content) => (
                        <a
                            key={content.title}
                            href={content.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all duration-200"
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                            {content.tag}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                        {content.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">{content.description}</p>
                                </div>
                                <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </div>
                        </a>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Tem dúvidas?</h2>
                    <p className="text-gray-600 mb-6">
                        Nossa equipe está disponível para ajudar. Entre em contato para saber mais sobre a Rede Hiperfarma.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href="https://wa.me/5541999990001"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
                        >
                            WhatsApp
                        </a>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Voltar ao site
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function EducationPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                </div>
            }
        >
            <EducationContent />
        </Suspense>
    );
}
