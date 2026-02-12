'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type GateChoice = 'DECISOR' | 'INFLUENCIADOR' | 'PESQUISADOR';

const GATE_APPROVED_KEY = 'funnel:gate:approved';

const OPTIONS: Array<{ value: GateChoice; label: string; description: string }> = [
    {
        value: 'DECISOR',
        label: 'Sim, sou decisor',
        description: 'Proprietário, sócio, farmacêutico responsável ou gerente geral.',
    },
    {
        value: 'INFLUENCIADOR',
        label: 'Não, mas influencio',
        description: 'Participo da avaliação e posso levar a proposta para o decisor.',
    },
    {
        value: 'PESQUISADOR',
        label: 'Não, estou pesquisando',
        description: 'Quero entender melhor o modelo antes de envolver a direção.',
    },
];

export default function FunnelGatePage() {
    const router = useRouter();
    const [selection, setSelection] = useState<GateChoice | null>(null);
    const [error, setError] = useState('');

    function handleContinue() {
        if (!selection) {
            setError('Selecione uma opção para continuar.');
            return;
        }

        if (selection === 'DECISOR') {
            window.localStorage.setItem(GATE_APPROVED_KEY, 'true');
            router.push('/funnel?gate=decisor');
            return;
        }

        window.localStorage.removeItem(GATE_APPROVED_KEY);
        const perfil = selection === 'INFLUENCIADOR' ? 'influenciador' : 'pesquisador';
        router.push(`/funnel/educacao?perfil=${perfil}`);
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 h-2 w-full">
                <div className="bg-primary h-full w-[12%] transition-all duration-500" />
            </div>

            <div className="p-8 md:p-10">
                <div className="text-center mb-8">
                    <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                        Pré-qualificação
                    </span>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                        Faça parte da Rede Hiperfarma
                    </h1>
                    <p className="text-slate-500">
                        Antes de começar, precisamos confirmar seu papel na decisão.
                    </p>
                </div>

                <div className="space-y-3">
                    {OPTIONS.map((option) => {
                        const active = selection === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    setSelection(option.value);
                                    setError('');
                                }}
                                className={`w-full rounded-xl border p-4 text-left transition-all ${
                                    active
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <p className={`text-sm font-semibold ${active ? 'text-primary' : 'text-slate-800'}`}>
                                    {option.label}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">{option.description}</p>
                            </button>
                        );
                    })}
                </div>

                {error && (
                    <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
                )}

                <button
                    type="button"
                    onClick={handleContinue}
                    className="mt-6 w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
                >
                    Continuar
                </button>
            </div>
        </div>
    );
}
