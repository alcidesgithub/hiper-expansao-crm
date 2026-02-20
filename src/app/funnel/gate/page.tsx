'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { captureAttributionFromCurrentUrl, getGateSessionIdFromAttribution, trackAcquisitionEvent } from '../_utils/attribution';
import { submitInfluencerLead } from '../actions';

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
    const [showInfluenceForm, setShowInfluenceForm] = useState(false);
    const [isFormSuccess, setIsFormSuccess] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '' });

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

        setShowInfluenceForm(true);
    }

    async function handleInfluencerSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.name || !formData.email) {
            setError('Preencha nome e e-mail.');
            return;
        }
        setIsSaving(true);
        try {
            const sessionId = window.localStorage.getItem(GATE_SESSION_KEY) || undefined;
            await submitInfluencerLead({
                name: formData.name,
                email: formData.email,
                profile: selection || 'INFLUENCIADOR',
                sessionId
            });
            setIsFormSuccess(true);
            setTimeout(() => {
                router.push('/');
            }, 3000);
        } catch (err) {
            setError('Erro ao enviar contato.');
        } finally {
            setIsSaving(false);
        }
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

                {isFormSuccess ? (
                    <div className="text-center p-6 border border-green-200 bg-green-50 rounded-xl mt-6">
                        <h3 className="text-green-800 font-bold text-lg mb-2">Tudo certo!</h3>
                        <p className="text-green-700 text-sm">Recebemos seu contato. Redirecionando para a página inicial...</p>
                    </div>
                ) : showInfluenceForm ? (
                    <form onSubmit={handleInfluencerSubmit} className="mt-8 space-y-4 animate-in fade-in duration-300">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Legal! Vamos manter contato.</h3>
                            <p className="text-sm text-slate-500 mt-1">Preencha seus dados para receber nosso material de apresentação.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Seu Nome</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="Como devemos te chamar?"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Seu E-mail Corporativo</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="seu@email.com.br"
                            />
                        </div>

                        {error && (
                            <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 mt-6"
                        >
                            {isSaving ? 'Enviando...' : 'Receber Material'}
                        </button>
                    </form>
                ) : (
                    <>
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
                    </>
                )}
            </div>
        </div>
    );
}
