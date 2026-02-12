'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    CheckCircle2,
    GripVertical,
    Lightbulb,
    Plus,
    Save,
    Sliders,
    Trash2,
    Zap,
} from 'lucide-react';

interface ScoringCriterion {
    id: string;
    name: string;
    subtitle: string;
    category: 'DEMOGRAPHIC' | 'ENGAGEMENT';
    value: number;
    min: number;
    max: number;
}

interface AutomationRule {
    id: string;
    name: string;
    enabled: boolean;
    triggerField: string;
    operator: string;
    triggerValue: string;
    actionType: string;
    actionTarget: string;
}

interface StageConfig {
    id: string;
    name: string;
    color: string;
    isWon: boolean;
    isLost: boolean;
    order: number;
    reserved: boolean;
}

interface ConfigResponse {
    permissions: { canManage: boolean };
    pipeline: { name: string; stages: StageConfig[] };
    scoringCriteria: ScoringCriterion[];
    automationRules: AutomationRule[];
}

const uid = () => `id-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [canManage, setCanManage] = useState(false);

    const [scoringCriteria, setScoringCriteria] = useState<ScoringCriterion[]>([]);
    const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
    const [stages, setStages] = useState<StageConfig[]>([]);

    const clearAlerts = () => {
        setError('');
        setSuccess('');
    };

    const loadConfig = useCallback(async () => {
        setLoading(true);
        clearAlerts();

        try {
            const response = await fetch('/api/config', { cache: 'no-store' });
            const payload = await response.json();
            if (!response.ok) {
                setError(payload?.error || 'Erro ao carregar configurações');
                return;
            }

            const data = payload as ConfigResponse;
            setCanManage(Boolean(data.permissions?.canManage));
            setScoringCriteria(data.scoringCriteria || []);
            setAutomationRules(data.automationRules || []);
            setStages(data.pipeline?.stages || []);
        } catch (requestError) {
            console.error('Error loading config:', requestError);
            setError('Erro de conexão ao carregar configurações');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadConfig();
    }, [loadConfig]);

    const scoringTotal = useMemo(
        () => scoringCriteria.reduce((acc, item) => acc + Number(item.value || 0), 0),
        [scoringCriteria]
    );

    const updateCriterion = (id: string, patch: Partial<ScoringCriterion>) => {
        setScoringCriteria((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    };

    const addCriterion = (category: 'DEMOGRAPHIC' | 'ENGAGEMENT') => {
        setScoringCriteria((prev) => [
            ...prev,
            {
                id: uid(),
                name: category === 'DEMOGRAPHIC' ? 'Novo critério demográfico' : 'Novo critério de engajamento',
                subtitle: '',
                category,
                value: 10,
                min: 0,
                max: 50,
            },
        ]);
    };

    const removeCriterion = (id: string) => {
        setScoringCriteria((prev) => prev.filter((item) => item.id !== id));
    };

    const updateRule = (id: string, patch: Partial<AutomationRule>) => {
        setAutomationRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
    };

    const addRule = () => {
        setAutomationRules((prev) => [
            ...prev,
            {
                id: uid(),
                name: 'Nova regra',
                enabled: false,
                triggerField: 'leadScore',
                operator: '>',
                triggerValue: '70',
                actionType: 'notifyUser',
                actionTarget: 'Gestor',
            },
        ]);
    };

    const removeRule = (id: string) => {
        setAutomationRules((prev) => prev.filter((rule) => rule.id !== id));
    };

    const updateStage = (id: string, patch: Partial<StageConfig>) => {
        setStages((prev) =>
            prev.map((stage) => {
                if (stage.id !== id) return stage;
                return { ...stage, ...patch };
            })
        );
    };

    const setWonStage = (id: string) => {
        setStages((prev) =>
            prev.map((stage) => ({
                ...stage,
                isWon: stage.id === id ? !stage.isWon : false,
            }))
        );
    };

    const setLostStage = (id: string) => {
        setStages((prev) =>
            prev.map((stage) => ({
                ...stage,
                isLost: stage.id === id ? !stage.isLost : false,
            }))
        );
    };

    const moveStage = (id: string, direction: -1 | 1) => {
        setStages((prev) => {
            const index = prev.findIndex((stage) => stage.id === id);
            if (index < 0) return prev;
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= prev.length) return prev;
            const next = [...prev];
            const [current] = next.splice(index, 1);
            next.splice(newIndex, 0, current);
            return next.map((stage, idx) => ({ ...stage, order: idx + 1 }));
        });
    };

    const addStage = () => {
        setStages((prev) => [
            ...prev,
            {
                id: uid(),
                name: 'Novo estágio',
                color: '#114F99',
                isWon: false,
                isLost: false,
                order: prev.length + 1,
                reserved: false,
            },
        ]);
    };

    const removeStage = (id: string) => {
        setStages((prev) => prev.filter((stage) => stage.id !== id).map((stage, idx) => ({ ...stage, order: idx + 1 })));
    };

    const saveConfig = async () => {
        if (!canManage) return;
        clearAlerts();

        if (scoringCriteria.length === 0) {
            setError('Adicione ao menos um critério de pontuação');
            return;
        }
        if (stages.length < 2) {
            setError('O pipeline deve ter ao menos 2 estágios');
            return;
        }

        setSaving(true);
        try {
            const response = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scoringCriteria,
                    automationRules,
                    stages: stages.map((stage) => ({
                        id: stage.id.startsWith('id-') ? undefined : stage.id,
                        name: stage.name,
                        color: stage.color,
                        isWon: stage.isWon,
                        isLost: stage.isLost,
                    })),
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                setError(payload?.error || 'Erro ao salvar configurações');
                return;
            }

            const data = payload as ConfigResponse;
            setScoringCriteria(data.scoringCriteria || []);
            setAutomationRules(data.automationRules || []);
            setStages(data.pipeline?.stages || []);
            setSuccess('Configurações salvas com sucesso');
        } catch (saveError) {
            console.error('Error saving config:', saveError);
            setError('Erro de conexão ao salvar configurações');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-slate-500">Carregando configurações...</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-slate-50 min-h-full font-sans text-slate-800 p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configurações</h1>
                    <p className="mt-2 text-slate-500">Gerencie pontuação, automações e etapas do pipeline.</p>
                </div>
                <button
                    onClick={() => void saveConfig()}
                    disabled={!canManage || saving}
                    className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            {!canManage && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
                    Você está em modo somente leitura para esta área.
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertTriangle size={16} /> {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle2 size={16} /> {success}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50/70 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Sliders className="text-primary" size={18} /> Matriz de Pontuação
                            </h3>
                            <span className="text-xs font-bold uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                Soma Atual: {scoringTotal}
                            </span>
                        </div>
                        <div className="p-6 space-y-6">
                            {(['DEMOGRAPHIC', 'ENGAGEMENT'] as const).map((category) => (
                                <div key={category} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            {category === 'DEMOGRAPHIC' ? 'Dados Demográficos' : 'Engajamento'}
                                        </h4>
                                        <button
                                            disabled={!canManage}
                                            onClick={() => addCriterion(category)}
                                            className="text-xs text-primary font-medium inline-flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <Plus size={14} /> Adicionar
                                        </button>
                                    </div>
                                    {scoringCriteria
                                        .filter((item) => item.category === category)
                                        .map((item) => (
                                            <div key={item.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                                                <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                                                    <input
                                                        disabled={!canManage}
                                                        value={item.name}
                                                        onChange={(e) => updateCriterion(item.id, { name: e.target.value })}
                                                        className="md:col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm"
                                                    />
                                                    <input
                                                        disabled={!canManage}
                                                        value={item.subtitle}
                                                        onChange={(e) => updateCriterion(item.id, { subtitle: e.target.value })}
                                                        className="md:col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm"
                                                    />
                                                    <input
                                                        disabled={!canManage}
                                                        type="number"
                                                        min={item.min}
                                                        max={item.max}
                                                        value={item.value}
                                                        onChange={(e) => updateCriterion(item.id, { value: Number(e.target.value) })}
                                                        className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                                                    />
                                                    <button
                                                        disabled={!canManage}
                                                        onClick={() => removeCriterion(item.id)}
                                                        className="border border-red-200 text-red-600 rounded px-2 py-1.5 text-sm disabled:opacity-50"
                                                    >
                                                        <Trash2 size={14} className="mx-auto" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50/70 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Zap className="text-primary" size={18} /> Regras de Automação
                            </h3>
                            <button
                                disabled={!canManage}
                                onClick={addRule}
                                className="text-xs text-primary font-medium inline-flex items-center gap-1 disabled:opacity-50"
                            >
                                <Plus size={14} /> Nova Regra
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            {automationRules.map((rule) => (
                                <div key={rule.id} className="border border-gray-200 rounded-lg p-3 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                                        <input
                                            disabled={!canManage}
                                            value={rule.name}
                                            onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                                            className="md:col-span-3 border border-gray-300 rounded px-2 py-1.5 text-sm"
                                        />
                                        <label className="md:col-span-2 flex items-center gap-2 text-sm text-slate-600">
                                            <input
                                                disabled={!canManage}
                                                type="checkbox"
                                                checked={rule.enabled}
                                                onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
                                            />
                                            Ativa
                                        </label>
                                        <button
                                            disabled={!canManage}
                                            onClick={() => removeRule(rule.id)}
                                            className="border border-red-200 text-red-600 rounded px-2 py-1.5 text-sm disabled:opacity-50"
                                        >
                                            <Trash2 size={14} className="mx-auto" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                        <input disabled={!canManage} value={rule.triggerField} onChange={(e) => updateRule(rule.id, { triggerField: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                        <input disabled={!canManage} value={rule.operator} onChange={(e) => updateRule(rule.id, { operator: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                        <input disabled={!canManage} value={rule.triggerValue} onChange={(e) => updateRule(rule.id, { triggerValue: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                        <input disabled={!canManage} value={rule.actionType} onChange={(e) => updateRule(rule.id, { actionType: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                        <input disabled={!canManage} value={rule.actionTarget} onChange={(e) => updateRule(rule.id, { actionTarget: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50/70 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Etapas do Pipeline</h3>
                            <button
                                disabled={!canManage}
                                onClick={addStage}
                                className="text-xs text-primary font-medium inline-flex items-center gap-1 disabled:opacity-50"
                            >
                                <Plus size={14} /> Adicionar
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            {stages.map((stage, index) => (
                                <div key={stage.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <GripVertical size={14} className="text-gray-300" />
                                        <input
                                            disabled={!canManage}
                                            value={stage.name}
                                            onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                                            className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
                                        />
                                        <input
                                            disabled={!canManage}
                                            type="color"
                                            value={stage.color}
                                            onChange={(e) => updateStage(stage.id, { color: e.target.value })}
                                            className="w-10 h-9 border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <label className="inline-flex items-center gap-1">
                                                <input disabled={!canManage} type="checkbox" checked={stage.isWon} onChange={() => setWonStage(stage.id)} />
                                                Ganho
                                            </label>
                                            <label className="inline-flex items-center gap-1">
                                                <input disabled={!canManage} type="checkbox" checked={stage.isLost} onChange={() => setLostStage(stage.id)} />
                                                Perdido
                                            </label>
                                            {stage.reserved && <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded">Reservado</span>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button disabled={!canManage || index === 0} onClick={() => moveStage(stage.id, -1)} className="p-1 border rounded disabled:opacity-40">
                                                <ArrowUp size={12} />
                                            </button>
                                            <button disabled={!canManage || index === stages.length - 1} onClick={() => moveStage(stage.id, 1)} className="p-1 border rounded disabled:opacity-40">
                                                <ArrowDown size={12} />
                                            </button>
                                            <button disabled={!canManage || stage.reserved} onClick={() => removeStage(stage.id)} className="p-1 border border-red-200 text-red-600 rounded disabled:opacity-40">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex gap-3">
                        <Lightbulb className="text-blue-500 shrink-0" size={20} />
                        <div>
                            <h5 className="text-sm font-bold text-blue-800">Observação</h5>
                            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                As configurações desta tela são persistidas no banco e impactam fluxo operacional.
                                Estágios reservados do funil padrão não podem ser removidos.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

