'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { submitStepThree } from '../actions';
import { loadDraft, saveDraft } from '../_utils/draft';

const DESAFIOS = [
    { value: 'negociacao', label: 'Negociação com fornecedores' },
    { value: 'competicao', label: 'Competição com grandes redes' },
    { value: 'margens', label: 'Margens apertadas / preços' },
    { value: 'estoque', label: 'Gestão de estoque / ruptura' },
    { value: 'captacao', label: 'Captação e retenção de clientes' },
    { value: 'tecnologia', label: 'Tecnologia / sistemas defasados' },
    { value: 'marketing', label: 'Marketing e divulgação' },
    { value: 'financeiro', label: 'Gestão financeira / fluxo de caixa' },
    { value: 'rh', label: 'Equipe / RH' },
    { value: 'compliance', label: 'Compliance / regulamentações' },
    { value: 'logistica', label: 'Logística / distribuição' },
    { value: 'nenhum', label: 'Não tenho desafios significativos' },
];

const MOTIVACOES = [
    { value: 'poder-compra', label: 'Aumentar poder de compra', tag: 'IDEAL' },
    { value: 'reduzir-custos', label: 'Reduzir custos operacionais', tag: 'IDEAL' },
    { value: 'suporte', label: 'Ter suporte de gestão', tag: 'IDEAL' },
    { value: 'marca', label: 'Fortalecer marca', tag: '' },
    { value: 'networking', label: 'Networking com outros associados', tag: '' },
    { value: 'pesquisando', label: 'Só estou pesquisando', tag: 'FRIO' },
    { value: 'nao-sei', label: 'Ainda não sei se quero', tag: 'MUITO_FRIO' },
];

type StepThreeDraft = {
    desafios: string[];
    motivacao: string;
};

function buildStepThreeDraftKey(leadId: string) {
    return `funnel:step3:${leadId}`;
}

function DesafiosPageContent() {
    const searchParams = useSearchParams();
    const leadId = searchParams.get('leadId') || '';
    const token = searchParams.get('token') || '';
    const hasSession = Boolean(leadId && token);
    const initialDraft = hasSession ? loadDraft<StepThreeDraft>(buildStepThreeDraftKey(leadId)) : null;

    const [desafios, setDesafios] = useState<string[]>(
        () => (Array.isArray(initialDraft?.desafios) ? initialDraft.desafios.slice(0, 3) : [])
    );
    const [motivacao, setMotivacao] = useState(() => initialDraft?.motivacao || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isFormValid = useMemo(
        () => desafios.length > 0 && Boolean(motivacao),
        [desafios, motivacao]
    );

    useEffect(() => {
        if (!leadId) return;
        saveDraft<StepThreeDraft>(buildStepThreeDraftKey(leadId), {
            desafios,
            motivacao,
        });
    }, [leadId, desafios, motivacao]);

    const toggleDesafio = (value: string) => {
        if (value === 'nenhum') {
            setDesafios(['nenhum']);
            return;
        }
        setDesafios((prev) => {
            const filtered = prev.filter((item) => item !== 'nenhum');
            if (filtered.includes(value)) return filtered.filter((item) => item !== value);
            if (filtered.length >= 3) return filtered;
            return [...filtered, value];
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasSession) {
            setError('Sessão de qualificação inválida. Recomece o formulário.');
            return;
        }
        if (!isFormValid) {
            setError('Selecione pelo menos um desafio e a motivação principal.');
            return;
        }

        setLoading(true);
        setError('');

        const result = await submitStepThree(leadId, token, { desafios, motivacao });
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 h-2 w-full">
                <div className="bg-primary h-full w-[60%] transition-all duration-500" />
            </div>
            <div className="p-6 md:p-10">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">ETAPA 3 DE 5</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Desafios e motivações</h1>
                <p className="text-sm text-slate-500 mb-6">Entenda como a Hiperfarma pode ajudar sua farmácia.</p>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">Quais os principais desafios da sua farmácia?</label>
                        <p className="text-xs text-slate-400 mb-3">Selecione até 3 opções.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {DESAFIOS.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => toggleDesafio(item.value)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-all ${desafios.includes(item.value)
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 font-medium'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        } ${item.value === 'nenhum' ? 'md:col-span-2 bg-gray-50' : ''}`}
                                >
                                    <span className="text-slate-700">{item.label}</span>
                                    {desafios.includes(item.value) && <span className="ml-auto text-primary">Selecionado</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">Qual a principal motivação para buscar a Hiperfarma?</label>
                        <p className="text-xs text-slate-400 mb-3">Selecione 1 opção.</p>
                        <div className="space-y-2">
                            {MOTIVACOES.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setMotivacao(item.value)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-all ${motivacao === item.value
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 font-medium'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${motivacao === item.value ? 'border-primary' : 'border-gray-300'}`}>
                                        {motivacao === item.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                                    </div>
                                    <span className="text-slate-700">{item.label}</span>
                                    {item.tag === 'IDEAL' && <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ideal</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!isFormValid && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                            Selecione ao menos um desafio e uma motivação principal.
                        </p>
                    )}

                    {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading || !isFormValid || !hasSession}
                        className="w-full bg-primary text-white py-3.5 px-6 rounded-xl font-semibold text-base hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                        {loading ? 'Processando...' : 'Continuar ->'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function DesafiosPage() {
    return (
        <React.Suspense fallback={<div className="text-center p-12">Carregando...</div>}>
            <DesafiosPageContent />
        </React.Suspense>
    );
}
