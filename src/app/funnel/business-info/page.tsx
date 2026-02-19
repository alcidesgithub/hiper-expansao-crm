'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { submitStepTwo } from '../actions';
import { loadDraft, saveDraft } from '../_utils/draft';
import { ArrowLeft } from 'lucide-react';

const CARGOS = [
    { value: 'proprietario', label: 'Proprietário(a) / Sócio(a)' },
    { value: 'farmaceutico_rt', label: 'Farmacêutico(a) RT' },
    { value: 'gerente_geral', label: 'Gerente geral' },
    { value: 'gerente_comercial', label: 'Gerente comercial' },
    { value: 'farmaceutico', label: 'Farmacêutico(a) (sem cargo de gestão)' },
    { value: 'outro', label: 'Outro cargo' },
];

const CARGO_SUBS: Record<string, { value: string; label: string }[]> = {
    proprietario: [
        { value: 'pf', label: 'Empresa individual (PF/ME)' },
        { value: 'holding', label: 'Empresa LTDA / Holding' },
        { value: 'grupo', label: 'Grupo / Rede própria' },
    ],
    farmaceutico_rt: [
        { value: 'sim_socio', label: 'Sim, também sou sócio' },
        { value: 'nao_socio', label: 'Não, sou apenas RT' },
    ],
    gerente_geral: [
        { value: 'total', label: 'Autonomia total para decisão' },
        { value: 'parcial', label: 'Autonomia parcial' },
        { value: 'limitada', label: 'Autonomia limitada' },
    ],
};

const LOJAS = [
    { value: '0', label: 'Nenhuma (ainda vou abrir)', warn: true },
    { value: '1', label: '1 loja' },
    { value: '2-3', label: '2 a 3 lojas' },
    { value: '4-5', label: '4 a 5 lojas' },
    { value: '6-10', label: '6 a 10 lojas', highlight: true },
    { value: '11+', label: '11+ lojas', highlight: true },
];

const LOJAS_SUBS: Record<string, { value: string; label: string }[]> = {
    '1': [
        { value: '6m', label: 'Sim, abrir em até 6 meses' },
        { value: '1-2a', label: 'Sim, abrir em 1-2 anos' },
        { value: 'nao', label: 'Não tenho planos de abrir outra' },
    ],
};

const FATURAMENTO = [
    { value: '0-50k', label: 'Até R$ 50.000' },
    { value: '50-100k', label: 'R$ 50.000 a R$ 100.000' },
    { value: '100-200k', label: 'R$ 100.000 a R$ 200.000' },
    { value: '200-500k', label: 'R$ 200.000 a R$ 500.000' },
    { value: '500k+', label: 'Acima de R$ 500.000' },
    { value: 'nao-informar', label: 'Prefiro não informar' },
];

const LOCALIZACAO = [
    { value: 'PR', label: 'Paraná' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'outros', label: 'Outro estado' },
];

const TEMPO_MERCADO = [
    { value: '<1a', label: 'Menos de 1 ano' },
    { value: '1-3a', label: '1 a 3 anos' },
    { value: '3-5a', label: '3 a 5 anos' },
    { value: '5-10a', label: '5 a 10 anos' },
    { value: '10a+', label: 'Mais de 10 anos' },
];

type RadioOption = { value: string; label: string; highlight?: boolean; warn?: boolean };
type StepTwoDraft = {
    cargo: string;
    cargoSub: string;
    lojas: string;
    lojasSub: string;
    faturamento: string;
    localizacao: string;
    tempoMercado: string;
};

function buildStepTwoDraftKey(leadId: string) {
    return `funnel:step2:${leadId}`;
}

function RadioGroup({
    options,
    value,
    onChange,
    label,
    sublabel,
}: {
    options: RadioOption[];
    value: string;
    onChange: (v: string) => void;
    label: string;
    sublabel?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">{label}</label>
            {sublabel && <p className="text-xs text-slate-400 mb-2">{sublabel}</p>}
            <div className="space-y-2">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-all ${value === opt.value
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20 font-medium'
                            : opt.highlight
                                ? 'border-green-200 bg-green-50/30 hover:border-green-300'
                                : opt.warn
                                    ? 'border-orange-200 bg-orange-50/20 hover:border-orange-300'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${value === opt.value ? 'border-primary' : 'border-gray-300'}`}>
                            {value === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className="text-slate-700">{opt.label}</span>
                        {opt.highlight && <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">VIP</span>}
                    </button>
                ))}
            </div>
        </div>
    );
}

function BusinessInfoContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const leadId = searchParams.get('leadId') || '';
    const token = searchParams.get('token') || '';
    const hasSession = Boolean(leadId && token);
    const initialDraft = hasSession ? loadDraft<StepTwoDraft>(buildStepTwoDraftKey(leadId)) : null;

    const [cargo, setCargo] = useState(() => initialDraft?.cargo || '');
    const [cargoSub, setCargoSub] = useState(() => initialDraft?.cargoSub || '');
    const [lojas, setLojas] = useState(() => initialDraft?.lojas || '');
    const [lojasSub, setLojasSub] = useState(() => initialDraft?.lojasSub || '');
    const [faturamento, setFaturamento] = useState(() => initialDraft?.faturamento || '');
    const [localizacao, setLocalizacao] = useState(() => initialDraft?.localizacao || '');
    const [tempoMercado, setTempoMercado] = useState(() => initialDraft?.tempoMercado || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const requiresCargoSub = Boolean(cargo && CARGO_SUBS[cargo]);
    const requiresLojasSub = lojas === '1';

    const isFormValid = useMemo(() => {
        if (!cargo || !lojas || !faturamento || !localizacao || !tempoMercado) return false;
        if (requiresCargoSub && !cargoSub) return false;
        if (requiresLojasSub && !lojasSub) return false;
        return true;
    }, [cargo, lojas, faturamento, localizacao, tempoMercado, requiresCargoSub, cargoSub, requiresLojasSub, lojasSub]);

    useEffect(() => {
        if (!leadId) return;
        saveDraft<StepTwoDraft>(buildStepTwoDraftKey(leadId), {
            cargo,
            cargoSub,
            lojas,
            lojasSub,
            faturamento,
            localizacao,
            tempoMercado,
        });
    }, [leadId, cargo, cargoSub, lojas, lojasSub, faturamento, localizacao, tempoMercado]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasSession) {
            setError('Sessão de qualificação inválida. Recomece o formulário.');
            return;
        }
        if (!isFormValid) {
            setError('Preencha todos os campos obrigatórios para continuar.');
            return;
        }

        setLoading(true);
        setError('');

        const result = await submitStepTwo(leadId, token, {
            cargo,
            cargoSub: cargoSub || undefined,
            numeroLojas: lojas,
            lojasSub: lojasSub || undefined,
            faturamento,
            localizacao,
            tempoMercado,
        });

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 h-2 w-full">
                <div className="bg-primary h-full w-[35%] transition-all duration-500" />
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
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">ETAPA 2 DE 4</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Perfil empresarial</h1>
                <p className="text-sm text-slate-500 mb-6">Conte mais sobre sua farmácia para personalizar a proposta.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <RadioGroup label="Qual seu cargo/função?" options={CARGOS} value={cargo} onChange={(v) => { setCargo(v); setCargoSub(''); }} />
                    {requiresCargoSub && (
                        <>
                            <RadioGroup label="Especifique:" options={CARGO_SUBS[cargo]} value={cargoSub} onChange={setCargoSub} />
                            {!cargoSub && <p className="text-xs text-amber-700">Selecione um complemento de cargo.</p>}
                        </>
                    )}

                    <RadioGroup label="Quantas farmácias você opera?" options={LOJAS} value={lojas} onChange={(v) => { setLojas(v); setLojasSub(''); }} />
                    {requiresLojasSub && (
                        <>
                            <RadioGroup label="Planeja abrir novas lojas?" options={LOJAS_SUBS['1']} value={lojasSub} onChange={setLojasSub} />
                            {!lojasSub && <p className="text-xs text-amber-700">Selecione o plano para novas lojas.</p>}
                        </>
                    )}

                    <RadioGroup
                        label="Faturamento mensal (todas as lojas):"
                        sublabel="Essa informação é confidencial e nos ajuda a personalizar a proposta."
                        options={FATURAMENTO}
                        value={faturamento}
                        onChange={setFaturamento}
                    />

                    <RadioGroup label="Onde ficam suas farmácias?" options={LOCALIZACAO} value={localizacao} onChange={setLocalizacao} />
                    <RadioGroup label="Há quanto tempo está no mercado farmacêutico?" options={TEMPO_MERCADO} value={tempoMercado} onChange={setTempoMercado} />

                    {!isFormValid && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                            Complete os campos obrigatórios para continuar.
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

export default function BusinessInfoPage() {
    return (
        <React.Suspense fallback={<div className="text-center p-12">Carregando...</div>}>
            <BusinessInfoContent />
        </React.Suspense>
    );
}
