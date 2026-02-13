'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Calendar, Mail, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { clearDraft } from '../_utils/draft';

function ResultadoPageContent() {
    const searchParams = useSearchParams();
    const grade = searchParams.get('grade') || 'C';
    const leadId = searchParams.get('leadId') || '';
    const token = searchParams.get('token') || '';

    useEffect(() => {
        clearDraft('funnel:step1');
        if (leadId) {
            clearDraft(`funnel:step2:${leadId}`);
            clearDraft(`funnel:step3:${leadId}`);
            clearDraft(`funnel:step4:${leadId}`);
        }
    }, [leadId]);

    if (grade === 'A' || grade === 'B') {
        return (
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 h-2 w-full"><div className="bg-green-500 h-full w-[100%]" /></div>
                <div className="p-8 md:p-12 text-center">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
                        <CheckCircle2 size={40} />
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                        Parabéns!
                    </h1>
                    <p className="text-slate-600 mb-2 max-w-md mx-auto">
                        Seu perfil é exatamente o tipo de parceiro que a Hiperfarma busca.
                    </p>
                    <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                        <CheckCircle2 size={16} /> Avaliação: aprovado
                    </div>
                    <p className="text-slate-500 text-sm mb-8 max-w-md mx-auto">
                        Nosso time está preparado para conversar sobre como a rede pode transformar sua farmácia.
                    </p>

                    <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-6 mb-6 max-w-md mx-auto">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <Calendar className="text-primary" size={24} />
                            <h3 className="font-bold text-slate-800">Agende sua reunião</h3>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">
                            Escolha o melhor dia e horário para conhecer a Hiperfarma de perto.
                        </p>
                        <Link
                            data-testid="result-schedule-link"
                            href={`/funnel/calendar?leadId=${encodeURIComponent(leadId)}&token=${encodeURIComponent(token)}`}
                            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                        >
                            Agendar agora <ArrowRight size={18} />
                        </Link>
                    </div>

                    <Link
                        href="/"
                        className="text-slate-400 text-sm hover:text-slate-600 transition-colors"
                    >
                        Pular por enquanto - entraremos em contato
                    </Link>
                </div>
            </div>
        );
    }

    if (grade === 'C' || grade === 'D') {
        return (
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 h-2 w-full"><div className="bg-blue-500 h-full w-[100%]" /></div>
                <div className="p-8 md:p-12 text-center">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail size={40} />
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                        Recebemos suas informações!
                    </h1>
                    <p className="text-slate-600 mb-6 max-w-md mx-auto">
                        Nosso time vai analisar seu perfil e entrará em contato em breve.
                    </p>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 max-w-md mx-auto flex items-center gap-3">
                        <Clock className="text-blue-600 flex-shrink-0" size={20} />
                        <p className="text-sm text-blue-700 text-left">
                            Retornaremos em até <strong>48 horas</strong> com mais informações sobre como a Hiperfarma pode ajudar sua farmácia.
                        </p>
                    </div>

                    <p className="text-slate-500 text-sm mb-4">
                        Enquanto isso, confira nossos conteúdos sobre o mercado farmacêutico:
                    </p>

                    <Link
                        href="/funnel/educacao"
                        className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-6 py-3 rounded-xl font-semibold hover:bg-blue-100 transition-all"
                    >
                        <BookOpen size={18} /> Ver conteúdos
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 h-2 w-full"><div className="bg-gray-400 h-full w-[100%]" /></div>
            <div className="p-8 md:p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail size={40} />
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                    Obrigado pelo interesse!
                </h1>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                    No momento, nosso modelo de expansão está focado em perfis específicos de farmácias.
                    Cadastramos seu email para novidades futuras.
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
                    <p className="text-sm text-gray-600">
                        Acompanhe nossas novidades e conteúdos educativos sobre o mercado farmacêutico.
                    </p>
                </div>

                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
                >
                    Voltar ao início
                </Link>
            </div>
        </div>
    );
}

export default function ResultadoPage() {
    return (
        <React.Suspense fallback={<div className="text-center p-12">Carregando...</div>}>
            <ResultadoPageContent />
        </React.Suspense>
    );
}
