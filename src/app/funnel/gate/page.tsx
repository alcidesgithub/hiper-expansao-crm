'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { captureAttributionFromCurrentUrl, getGateSessionIdFromAttribution, trackAcquisitionEvent } from '../_utils/attribution';

type GateChoice = 'DECISOR' | 'INFLUENCIADOR' | 'PESQUISADOR';

const GATE_APPROVED_KEY = 'funnel:gate:approved';
const GATE_PROFILE_KEY = 'funnel:gate:profile';
const GATE_SESSION_KEY = 'funnel:gate:sessionId';

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
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const snapshot = captureAttributionFromCurrentUrl();
        const existingSession = window.localStorage.getItem(GATE_SESSION_KEY);
        if (!existingSession && snapshot.sessionId) {
            window.localStorage.setItem(GATE_SESSION_KEY, snapshot.sessionId);
        }
    }, []);

    function getOrCreateGateSessionId(): string {
        const existing = window.localStorage.getItem(GATE_SESSION_KEY);
        if (existing) return existing;

        const generated = getGateSessionIdFromAttribution();
        window.localStorage.setItem(GATE_SESSION_KEY, generated);
        return generated;
    }

    async function persistGateChoice(choice: GateChoice): Promise<void> {
        const sessionId = getOrCreateGateSessionId();
        await fetch('/api/funnel/gate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                choice,
                sessionId,
                source: 'funnel_public_gate',
            }),
            keepalive: true,
        });
    }

    async function handleContinue() {
        if (!selection) {
            setError('Selecione uma opção para continuar.');
            return;
        }

        setIsSaving(true);
        try {
            const sessionId = getOrCreateGateSessionId();
            await trackAcquisitionEvent({
                eventName: 'GATE_CONTINUE',
                page: '/funnel/gate',
                sessionId,
                ctaId: `gate_${selection.toLowerCase()}`,
                metadata: { selection },
            });
            await persistGateChoice(selection);
        } catch (persistError) {
            console.error('Error persisting gate choice:', persistError);
        } finally {
            setIsSaving(false);
        }

        if (selection === 'DECISOR') {
            window.localStorage.setItem(GATE_APPROVED_KEY, 'true');
            window.localStorage.setItem(GATE_PROFILE_KEY, 'DECISOR');
            router.push('/funnel?gate=decisor');
            return;
        }

        window.localStorage.removeItem(GATE_APPROVED_KEY);
        window.localStorage.setItem(GATE_PROFILE_KEY, selection);
        router.push('/');
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 h-2 w-full">
                <div className="bg-primary h-full w-[12%] transition-all duration-500" />
            </div>

            <div className="p-8 md:p-10">
                <div className="text-center mb-8">
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
                                data-testid={`gate-option-${option.value.toLowerCase()}`}
                                onClick={() => {
                                    setSelection(option.value);
                                    setError('');
                                }}
                                className={`w-full rounded-xl border p-4 text-left transition-all ${active
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
                    data-testid="gate-continue"
                    onClick={handleContinue}
                    disabled={isSaving}
                    className="mt-6 w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isSaving ? 'Salvando...' : 'Continuar'}
                </button>
            </div>
        </div>
    );
}
