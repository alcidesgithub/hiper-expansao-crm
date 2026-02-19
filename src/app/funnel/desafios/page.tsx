'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { submitStepThree } from '../actions';
import { loadDraft, saveDraft } from '../_utils/draft';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const DESAFIOS = [
    { value: 'negociacao', label: 'Negociação com fornecedores' },
    { value: 'competicao', label: 'Concorrência com grandes redes' },
    { value: 'margens', label: 'Margens de lucro apertadas' },
    { value: 'estoque', label: 'Gestão de estoque' },
    { value: 'captacao', label: 'Captação de clientes' },
    { value: 'tecnologia', label: 'Falta de tecnologia/sistemas' },
    { value: 'marketing', label: 'Marketing e divulgação' },
    { value: 'financeiro', label: 'Gestão financeira' },
    { value: 'rh', label: 'Gestão de equipe (RH)' },
    { value: 'compliance', label: 'Regulamentação e compliance' },
    { value: 'logistica', label: 'Logística e distribuição' },
    { value: 'nenhum', label: 'Nenhum desafio significativo' },
];

const MOTIVACOES = [
    { value: 'poder-compra', label: 'Aumentar poder de compra' },
    { value: 'reduzir-custos', label: 'Reduzir custos operacionais' },
    { value: 'suporte', label: 'Ter suporte e consultoria' },
    { value: 'marca', label: 'Fortalecer minha marca' },
    { value: 'networking', label: 'Fazer parte de um grupo (networking)' },
    { value: 'pesquisando', label: 'Ainda estou pesquisando opções' },
    { value: 'nao-sei', label: 'Não sei ao certo' },
];

const URGENCIA_OPTIONS = [
    { value: 'imediato', label: 'Imediatamente (próximos 15 dias)' },
    { value: 'este-mes', label: 'Este mês (até 30 dias)' },
    { value: 'proximo-mes', label: 'Próximo mês' },
    { value: '2-3-meses', label: 'Em 2-3 meses' },
    { value: '4-6-meses', label: 'Em 4-6 meses' },
    { value: 'sem-prazo', label: 'Sem prazo definido' },
];

const HISTORICO_OPTIONS = [
    { value: 'nunca', label: 'Não, e estou buscando a primeira rede' },
    { value: 'conheco', label: 'Conheço mas nunca participei' },
    { value: 'ja-participei', label: 'Já fiz parte de uma rede mas saí' },
    { value: 'atualmente', label: 'Sim, atualmente faço parte de uma rede' },
];

type StepThreeDraft = {
    desafios: string[];
    motivacao: string;
    urgencia: string;
    historico: string;
};

function buildStepThreeDraftKey(leadId: string) {
    return `funnel:step3:${leadId}`;
}

function DesafiosPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const leadId = searchParams.get('leadId') || '';
    const token = searchParams.get('token') || '';
    const hasSession = Boolean(leadId && token);
    const initialDraft = hasSession ? loadDraft<StepThreeDraft>(buildStepThreeDraftKey(leadId)) : null;

    const [desafios, setDesafios] = useState<string[]>(() => initialDraft?.desafios || []);
    const [motivacao, setMotivacao] = useState(() => initialDraft?.motivacao || '');
    const [urgencia, setUrgencia] = useState(() => initialDraft?.urgencia || '');
    const [historico, setHistorico] = useState(() => initialDraft?.historico || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isFormValid = useMemo(
        () => desafios.length > 0 && desafios.length <= 3 && Boolean(motivacao) && Boolean(urgencia) && Boolean(historico),
        [desafios, motivacao, urgencia, historico]
    );

    useEffect(() => {
        if (!leadId) return;
        saveDraft<StepThreeDraft>(buildStepThreeDraftKey(leadId), {
            desafios,
            motivacao,
            urgencia,
            historico,
        });
    }, [leadId, desafios, motivacao, urgencia, historico]);

    const toggleDesafio = (value: string) => {
        setDesafios((prev) => {
            if (prev.includes(value)) return prev.filter((v) => v !== value);
            if (prev.length >= 3) return prev;
            return [...prev, value];
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasSession) {
            setError('Sessão de qualificação inválida. Recomece o formulário.');
            return;
        }
        if (!isFormValid) {
            setError('Preencha todos os campos para continuar.');
            return;
        }

        setLoading(true);
        setError('');

        const result = await submitStepThree(leadId, token, {
            desafios,
            motivacao,
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
                <div className="bg-primary h-full w-[60%] transition-all duration-500" />
            </div>
            <div className="p-6 md:p-10">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-4"
                >
                    <ArrowLeft size={16} /> Voltar
                </button>

                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">ETAPA 3 DE 4</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Momento atual</h1>
                <p className="text-sm text-slate-500 mb-6">Seus desafios, motivações e timing nos ajudam a personalizar sua jornada.</p>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Desafios */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">Quais são seus maiores desafios hoje?</label>
                        <p className="text-xs text-slate-400 mb-3">Selecione até 3 opções.</p>
                        <div className="space-y-2">
                            {DESAFIOS.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => toggleDesafio(item.value)}
                                    disabled={desafios.length >= 3 && !desafios.includes(item.value)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-all ${desafios.includes(item.value)
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 font-medium'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${desafios.includes(item.value) ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                                        {desafios.includes(item.value) && <span className="text-white text-xs">✓</span>}
                                    </div>
                                    <span className="text-slate-700">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Motivação */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">Qual sua principal motivação para buscar a Hiperfarma?</label>
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
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Urgência */}
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
                                    {urgencia === item.value && <span className="text-primary text-xs">Selecionado</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Histórico */}
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
                                    {historico === item.value && <span className="text-primary text-xs">Selecionado</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!isFormValid && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                            Preencha todos os campos para continuar.
                        </p>
                    )}

                    {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading || !isFormValid || !hasSession}
                        className="w-full bg-primary text-white py-3.5 px-6 rounded-xl font-semibold text-base hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                        {loading ? 'Processando...' : 'Continuar →'}
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
