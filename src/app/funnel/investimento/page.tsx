'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { submitStepFive } from '../actions';
import { toast } from 'sonner';

interface Pricing {
    marketingMonthly: number;
    marketingDescription: string;
    adminMonthly: number;
    adminDescription: string;
    totalMonthly: number;
}

const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function RadioGroup({
    options,
    value,
    onChange,
    label,
    sublabel,
}: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    label: string;
    sublabel?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">{label}</label>
            {sublabel && <p className="text-xs text-slate-400 mb-3">{sublabel}</p>}
            <div className="space-y-2">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-all ${value === opt.value
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20 font-medium'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${value === opt.value ? 'border-primary' : 'border-gray-300'}`}>
                            {value === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className="text-slate-700">{opt.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function InvestimentoPageContent() {
    const searchParams = useSearchParams();
    const leadId = searchParams.get('leadId') || '';
    const token = searchParams.get('token') || '';

    const [pricing, setPricing] = useState<Pricing | null>(null);
    const [step, setStep] = useState(0);
    const [consciencia, setConsciencia] = useState('');
    const [reacao, setReacao] = useState('');
    const [capMarketing, setCapMarketing] = useState('');
    const [capAdmin, setCapAdmin] = useState('');
    const [capPagamentoTotal, setCapPagamentoTotal] = useState('');
    const [compromisso, setCompromisso] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/pricing')
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) throw new Error(data?.error || 'Erro ao carregar valores');
                return data;
            })
            .then((data) => {
                setPricing({
                    marketingMonthly: Number(data.marketingMonthly),
                    marketingDescription: data.marketingDescription,
                    adminMonthly: Number(data.adminMonthly),
                    adminDescription: data.adminDescription,
                    totalMonthly: Number(data.totalMonthly),
                });
                setStep(1);
            })
            .catch((requestError) => {
                console.error('Error fetching active pricing:', requestError);
                setError('Erro ao carregar valores de investimento.');
            });
    }, []);

    const handleSubmit = async () => {
        if (!leadId || !token) {
            setError('Sessão de qualificação inválida. Recomece o formulário.');
            return;
        }

        setLoading(true);
        setError('');

        const result = await submitStepFive(leadId, token, {
            conscienciaInvestimento: consciencia,
            reacaoValores: reacao,
            capacidadeMarketing: capMarketing,
            capacidadeAdmin: capAdmin,
            capacidadePagamentoTotal: capPagamentoTotal,
            compromisso,
        });

        if (result?.error) {
            setError(result.error);
            toast.error(result.error);
            setLoading(false);
        }
    };

    if (!pricing && step === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-500">Carregando valores...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 h-2 w-full">
                <div className="bg-primary h-full w-[90%] transition-all duration-500" />
            </div>
            <div className="p-6 md:p-10">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">ETAPA 5 DE 5</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Investimento</h1>
                <p className="text-sm text-slate-500 mb-6">Conheça os valores e avalie sua capacidade de investimento.</p>

                {step >= 1 && pricing && (
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 mb-6">
                        <h3 className="font-bold text-slate-800 text-sm mb-4">Investimento mensal Hiperfarma</h3>
                        <div className="space-y-4">
                            <div className="bg-white rounded-lg p-4 border border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-sm text-slate-700">Mensalidade de marketing</span>
                                    <span className="font-bold text-primary">{formatCurrency(pricing.marketingMonthly)}/mês</span>
                                </div>
                                <p className="text-xs text-slate-500 whitespace-pre-line">{pricing.marketingDescription}</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-sm text-slate-700">Mensalidade administrativa</span>
                                    <span className="font-bold text-primary">{formatCurrency(pricing.adminMonthly)}/mês</span>
                                </div>
                                <p className="text-xs text-slate-500 whitespace-pre-line">{pricing.adminDescription}</p>
                            </div>
                            <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary/20">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-800">Total mensal</span>
                                    <span className="font-bold text-xl text-primary">{formatCurrency(pricing.totalMonthly)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    <RadioGroup
                        label="A Hiperfarma é uma associação com investimento mensal. Você está ciente disso?"
                        value={consciencia}
                        onChange={(value) => { setConsciencia(value); if (step < 2) setStep(2); }}
                        options={[
                            { value: 'preparado', label: 'Sim, já conheço e estou preparado' },
                            { value: 'ouvi-falar', label: 'Sim, ouvi falar mas não sei valores' },
                            { value: 'quero-conhecer', label: 'Não, mas quero conhecer' },
                            { value: 'preocupa', label: 'Não sabia e me preocupa' },
                        ]}
                    />

                    {step >= 2 && (
                        <RadioGroup
                            label="Após conhecer os valores, como você se sente?"
                            value={reacao}
                            onChange={(value) => { setReacao(value); if (step < 3) setStep(3); }}
                            options={[
                                { value: 'dentro-esperado', label: 'Dentro do esperado, posso investir' },
                                { value: 'acima-mas-valor', label: 'Um pouco acima, mas vejo valor' },
                                { value: 'alto-saber-mais', label: 'Alto, mas quero saber mais' },
                                { value: 'acima-imaginava', label: 'Acima do que imaginava' },
                                { value: 'sem-capacidade', label: 'Não tenho essa capacidade agora' },
                            ]}
                        />
                    )}

                    {step >= 3 && pricing && (
                        <RadioGroup
                            label={`Você consegue arcar com a mensalidade de marketing? (${formatCurrency(pricing.marketingMonthly)}/mês)`}
                            value={capMarketing}
                            onChange={(value) => { setCapMarketing(value); if (step < 4) setStep(4); }}
                            options={[
                                { value: 'tranquilamente', label: 'Sim, tranquilamente' },
                                { value: 'planejamento', label: 'Sim, com planejamento' },
                                { value: 'apertado', label: 'Conseguiria, mas seria apertado' },
                                { value: 'dificuldade', label: 'Teria dificuldade' },
                                { value: 'nao-conseguiria', label: 'Não conseguiria' },
                            ]}
                        />
                    )}

                    {step >= 4 && pricing && (
                        <RadioGroup
                            label={`E a mensalidade administrativa? (${formatCurrency(pricing.adminMonthly)}/mês)`}
                            value={capAdmin}
                            onChange={(value) => { setCapAdmin(value); if (step < 5) setStep(5); }}
                            options={[
                                { value: 'tranquilamente', label: 'Sim, tranquilamente' },
                                { value: 'planejamento', label: 'Sim, com planejamento' },
                                { value: 'apertado', label: 'Conseguiria, mas seria apertado' },
                                { value: 'dificuldade', label: 'Teria dificuldade' },
                                { value: 'nao-conseguiria', label: 'Não conseguiria' },
                            ]}
                        />
                    )}

                    {step >= 5 && pricing && (
                        <RadioGroup
                            label={`Considerando o investimento total de ${formatCurrency(pricing.totalMonthly)}/mês (marketing + administrativa), como você avalia sua capacidade de pagamento?`}
                            sublabel="Esta é a soma das duas mensalidades que você precisará arcar mensalmente."
                            value={capPagamentoTotal}
                            onChange={(value) => { setCapPagamentoTotal(value); if (step < 6) setStep(6); }}
                            options={[
                                { value: 'sim-tranquilo', label: 'Consigo pagar tranquilamente' },
                                { value: 'sim-planejamento', label: 'Consigo com planejamento financeiro' },
                                { value: 'apertado-possivel', label: 'Seria apertado, mas possível' },
                                { value: 'precisaria-ajustes', label: 'Precisaria fazer ajustes no caixa' },
                                { value: 'dificil-agora', label: 'Seria difícil no momento atual' },
                                { value: 'nao-consigo', label: 'Não consigo arcar com esse valor' },
                            ]}
                        />
                    )}

                    {step >= 6 && (
                        <RadioGroup
                            label="Após conhecer os valores e o modelo da Hiperfarma:"
                            value={compromisso}
                            onChange={setCompromisso}
                            options={[
                                { value: 'faz-sentido', label: 'Faz todo sentido, quero avançar' },
                                { value: 'interessante', label: 'Parece interessante, quero entender mais' },
                                { value: 'curiosidade', label: 'Tenho curiosidade, quero ver detalhes' },
                                { value: 'duvidas', label: 'Ainda tenho dúvidas sobre o modelo' },
                                { value: 'nao-momento', label: 'Não me parece o momento certo' },
                            ]}
                        />
                    )}

                    {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

                    {compromisso && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full bg-primary text-white py-3.5 px-6 rounded-xl font-semibold text-base hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                            {loading ? 'Calculando seu perfil...' : 'Finalizar qualificação ->'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function InvestimentoPage() {
    return (
        <React.Suspense fallback={<div className="text-center p-12">Carregando...</div>}>
            <InvestimentoPageContent />
        </React.Suspense>
    );
}
