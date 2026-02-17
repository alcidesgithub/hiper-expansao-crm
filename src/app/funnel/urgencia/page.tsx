'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { submitStepFour } from '../actions';
import { loadDraft, saveDraft } from '../_utils/draft';
import { toast } from 'sonner';

const URGENCIA_OPTIONS = [
    { value: 'imediato', label: 'Imediatamente (próximos 15 dias)', tag: 'HOT' },
    { value: 'este-mes', label: 'Este mês (até 30 dias)', tag: '' },
    { value: 'proximo-mes', label: 'Próximo mês', tag: '' },
    { value: '2-3-meses', label: 'Em 2-3 meses', tag: '' },
    { value: '4-6-meses', label: 'Em 4-6 meses', tag: '' },
    { value: 'sem-prazo', label: 'Sem prazo definido', tag: 'FRIO' },
];

const HISTORICO_OPTIONS = [
    { value: 'nunca', label: 'Não, e estou buscando a primeira rede', tag: 'IDEAL' },
    { value: 'conheco', label: 'Conheço mas nunca participei', tag: '' },
    { value: 'ja-participei', label: 'Já fiz parte de uma rede mas saí', tag: 'INVESTIGAR' },
    { value: 'atualmente', label: 'Sim, atualmente faço parte de uma rede', tag: 'BAIXO' },
];

type StepFourDraft = {
    urgencia: string;
    historico: string;
};

function buildStepFourDraftKey(leadId: string) {
    return `funnel:step4:${leadId}`;
}

function UrgenciaPageContent() {
    const searchParams = useSearchParams();
    const leadId = searchParams.get('leadId') || '';
    const token = searchParams.get('token') || '';
    const hasSession = Boolean(leadId && token);
    const initialDraft = hasSession ? loadDraft<StepFourDraft>(buildStepFourDraftKey(leadId)) : null;

    const [urgencia, setUrgencia] = useState(() => initialDraft?.urgencia || '');
    const [historico, setHistorico] = useState(() => initialDraft?.historico || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isFormValid = useMemo(
        () => Boolean(urgencia && historico),
        [urgencia, historico]
    );

    useEffect(() => {
        if (!leadId) return;
        saveDraft<StepFourDraft>(buildStepFourDraftKey(leadId), {
            urgencia,
            historico,
        });
    }, [leadId, urgencia, historico]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasSession) {
            setError('Sessão de qualificação inválida. Recomece o formulário.');
            return;
        }
        if (!isFormValid) {
            setError('Selecione o prazo de decisão e o histórico com redes.');
            return;
        }

        setLoading(true);
        setError('');

        const result = await submitStepFour(leadId, token, {
            urgencia,
            historicoRedes: historico,
        });
        if (result?.error) {
            setError(result.error);
            toast.error(result.error);
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 h-2 w-full">
                <div className="bg-primary h-full w-[75%] transition-all duration-500" />
            </div>
            <div className="p-6 md:p-10">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">ETAPA 4 DE 5</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Urgência e histórico</h1>
                <p className="text-sm text-slate-500 mb-6">Entender seu momento ajuda no melhor suporte.</p>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">Quando pretende tomar uma decisão sobre a associação?</label>
                        <p className="text-xs text-slate-400 mb-3">Isso nos ajuda a priorizar seu atendimento.</p>
                        <div className="space-y-2">
                            {URGENCIA_OPTIONS.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setUrgencia(item.value)}
                                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm transition-all ${urgencia === item.value
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 font-medium'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="text-slate-700 flex-1">{item.label}</span>
                                    {item.tag === 'HOT' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Urgente</span>}
                                    {urgencia === item.value && <span className="text-primary">Selecionado</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">Já fez parte de alguma rede ou associação de farmácias?</label>
                        <p className="text-xs text-slate-400 mb-3">Sua experiência anterior é importante para entender expectativas.</p>
                        <div className="space-y-2">
                            {HISTORICO_OPTIONS.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setHistorico(item.value)}
                                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm transition-all ${historico === item.value
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 font-medium'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="text-slate-700 flex-1">{item.label}</span>
                                    {item.tag === 'IDEAL' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ideal</span>}
                                    {item.tag === 'INVESTIGAR' && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Investigar</span>}
                                    {historico === item.value && <span className="text-primary">Selecionado</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!isFormValid && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                            Selecione o prazo e o histórico para continuar.
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

export default function UrgenciaPage() {
    return (
        <React.Suspense fallback={<div className="text-center p-12">Carregando...</div>}>
            <UrgenciaPageContent />
        </React.Suspense>
    );
}
