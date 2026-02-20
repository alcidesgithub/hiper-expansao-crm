'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    ArrowDown,
    ArrowUp,
    GripVertical,
    Lightbulb,
    Plus,
    Save,
    Sliders,
    Trash2,
    Zap,
    ShieldCheck,
    BarChart2,
    GitMerge,
    Trello,
    DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import {
    AUTOMATION_ACTION_TYPES,
    AUTOMATION_OPERATORS,
    AUTOMATION_TRIGGER_FIELD_OPTIONS,
    SCORING_FIELD_OPTIONS,
    SCORING_OPERATORS,
    type ConfigFieldOption,
    type SelectOption,
} from '@/lib/config-options';

import { PricingTab } from './PricingTab';
import { PermissionsTab } from './PermissionsTab';
import { UtmTab } from './UtmTab';

interface ScoringCriterion {
    id: string;
    name: string;
    subtitle: string;
    category: 'PROFILE' | 'FINANCIAL' | 'BEHAVIOR';
    fieldKey: string;
    operator: string;
    expectedValue: string;
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
    users: Array<{ id: string; name: string | null; role: string }>;
    catalogs?: {
        scoringFields?: ConfigFieldOption[];
        scoringOperators?: SelectOption[];
        automationTriggerFields?: ConfigFieldOption[];
        automationOperators?: SelectOption[];
        automationActionTypes?: SelectOption[];
    };
}

const uid = () => `id-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

function requiresTriggerValue(operator: string): boolean {
    return operator !== 'exists' && operator !== 'not_exists';
}

function usesSingleValueSelect(operator: string): boolean {
    return operator !== 'in' && operator !== 'not_in' && operator !== 'contains';
}

function resolveDefaultExpectedValue(field: ConfigFieldOption | undefined, operator: string): string {
    if (!requiresTriggerValue(operator)) return '';
    if (!field?.options?.length) return '';
    return usesSingleValueSelect(operator) ? field.options[0].value : '';
}

function findFieldOption(options: ConfigFieldOption[], key: string): ConfigFieldOption | undefined {
    return options.find((option) => option.key === key);
}

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [canManage, setCanManage] = useState(false);
    const [activeTab, setActiveTab] = useState<'scoring' | 'automation' | 'pipeline' | 'pricing' | 'permissions' | 'utm'>('scoring');

    const [scoringCriteria, setScoringCriteria] = useState<ScoringCriterion[]>([]);
    const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
    const [stages, setStages] = useState<StageConfig[]>([]);
    const [users, setUsers] = useState<Array<{ id: string; name: string | null; role: string }>>([]);
    const [scoringFieldOptions, setScoringFieldOptions] = useState<ConfigFieldOption[]>(SCORING_FIELD_OPTIONS);
    const [scoringOperatorOptions, setScoringOperatorOptions] = useState<SelectOption[]>(SCORING_OPERATORS);
    const [automationFieldOptions, setAutomationFieldOptions] = useState<ConfigFieldOption[]>(AUTOMATION_TRIGGER_FIELD_OPTIONS);
    const [automationOperatorOptions, setAutomationOperatorOptions] = useState<SelectOption[]>(AUTOMATION_OPERATORS);
    const [automationActionTypeOptions, setAutomationActionTypeOptions] = useState<SelectOption[]>(AUTOMATION_ACTION_TYPES);

    const clearAlerts = () => {
    };

    const loadConfig = useCallback(async () => {
        setLoading(true);
        clearAlerts();

        try {
            const response = await fetch('/api/config', { cache: 'no-store' });
            const payload = await response.json();
            if (!response.ok) {
                toast.error(payload?.error || 'Erro ao carregar configurações');
                return;
            }

            const data = payload as ConfigResponse;
            setCanManage(Boolean(data.permissions?.canManage));
            setScoringCriteria(data.scoringCriteria || []);
            setAutomationRules(data.automationRules || []);
            setStages(data.pipeline?.stages || []);
            setUsers(data.users || []);
            setScoringFieldOptions(data.catalogs?.scoringFields?.length ? data.catalogs.scoringFields : SCORING_FIELD_OPTIONS);
            setScoringOperatorOptions(data.catalogs?.scoringOperators?.length ? data.catalogs.scoringOperators : SCORING_OPERATORS);
            setAutomationFieldOptions(
                data.catalogs?.automationTriggerFields?.length ? data.catalogs.automationTriggerFields : AUTOMATION_TRIGGER_FIELD_OPTIONS
            );
            setAutomationOperatorOptions(
                data.catalogs?.automationOperators?.length ? data.catalogs.automationOperators : AUTOMATION_OPERATORS
            );
            setAutomationActionTypeOptions(
                data.catalogs?.automationActionTypes?.length ? data.catalogs.automationActionTypes : AUTOMATION_ACTION_TYPES
            );
        } catch (requestError) {
            console.error('Error loading config:', requestError);
            toast.error('Erro de conexão ao carregar configurações');
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

    const managerUsers = useMemo(
        () => users.filter((user) => user.role === 'MANAGER' || user.role === 'DIRECTOR' || user.role === 'ADMIN'),
        [users]
    );

    const updateCriterion = (id: string, patch: Partial<ScoringCriterion>) => {
        setScoringCriteria((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    };

    const addCriterion = (category: 'PROFILE' | 'FINANCIAL' | 'BEHAVIOR') => {
        const defaults = {
            PROFILE: { name: 'Novo critério de Perfil', subtitle: 'Ex: Experiência, Cargo' },
            FINANCIAL: { name: 'Novo critério Financeiro', subtitle: 'Ex: Capital, Imóvel' },
            BEHAVIOR: { name: 'Novo critério de Comportamento', subtitle: 'Ex: Visita, Download' },
        };
        const defaultField = scoringFieldOptions[0];
        const defaultOperator = defaultField?.type === 'number' ? '>=' : 'exists';

        setScoringCriteria((prev) => [
            ...prev,
            {
                id: uid(),
                name: defaults[category].name,
                subtitle: defaults[category].subtitle,
                category,
                fieldKey: defaultField?.key || 'score',
                operator: defaultOperator,
                expectedValue: resolveDefaultExpectedValue(defaultField, defaultOperator),
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

    const resolveRuleActionTarget = (actionType: string) => {
        if (actionType === 'move_stage') {
            return stages.find((stage) => !stage.isWon && !stage.isLost)?.id || stages[0]?.id || '';
        }
        if (actionType === 'assign_user' || actionType === 'notify_user') {
            return users[0]?.id || '';
        }
        if (actionType === 'notify_manager') {
            return 'all_managers';
        }
        return actionType === 'add_tag' ? 'revisar' : '';
    };

    const addRule = () => {
        const defaultField = automationFieldOptions[0];
        const defaultOperator = defaultField?.type === 'number' ? '>=' : '=';
        const defaultActionType = 'notify_manager';
        setAutomationRules((prev) => [
            ...prev,
            {
                id: uid(),
                name: 'Nova regra de automação',
                enabled: false,
                triggerField: defaultField?.key || 'score',
                operator: defaultOperator,
                triggerValue: resolveDefaultExpectedValue(defaultField, defaultOperator) || '70',
                actionType: defaultActionType,
                actionTarget: resolveRuleActionTarget(defaultActionType),
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
            toast.error('Adicione ao menos um critério de pontuação');
            return;
        }
        if (stages.length < 2) {
            toast.error('O pipeline deve ter ao menos 2 estágios');
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
                        id: stage.id,
                        name: stage.name,
                        color: stage.color,
                        isWon: stage.isWon,
                        isLost: stage.isLost,
                    })),
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                toast.error(payload?.error || 'Erro ao salvar configurações');
                return;
            }

            const data = payload as ConfigResponse;
            setScoringCriteria(data.scoringCriteria || []);
            setAutomationRules(data.automationRules || []);
            setStages(data.pipeline?.stages || []);
            setScoringFieldOptions(data.catalogs?.scoringFields?.length ? data.catalogs.scoringFields : SCORING_FIELD_OPTIONS);
            setScoringOperatorOptions(data.catalogs?.scoringOperators?.length ? data.catalogs.scoringOperators : SCORING_OPERATORS);
            setAutomationFieldOptions(
                data.catalogs?.automationTriggerFields?.length ? data.catalogs.automationTriggerFields : AUTOMATION_TRIGGER_FIELD_OPTIONS
            );
            setAutomationOperatorOptions(
                data.catalogs?.automationOperators?.length ? data.catalogs.automationOperators : AUTOMATION_OPERATORS
            );
            setAutomationActionTypeOptions(
                data.catalogs?.automationActionTypes?.length ? data.catalogs.automationActionTypes : AUTOMATION_ACTION_TYPES
            );
            toast.success('Configurações salvas com sucesso');
        } catch (saveError) {
            console.error('Error saving config:', saveError);
            toast.error('Erro de conexão ao salvar configurações');
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

    const CATEGORY_LABELS = {
        PROFILE: 'Perfil & Dados Demográficos',
        FINANCIAL: 'Capacidade Financeira & Investimento',
        BEHAVIOR: 'Comportamento & Engajamento',
    };

    return (
        <div className="w-full bg-slate-50 min-h-full font-sans text-slate-800 p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configurações</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-slate-500">Gerencie pontuação, automações e etapas do pipeline.</p>
                        <span className="text-slate-300">|</span>
                        <Link
                            href="/dashboard/admin/settings/permissions"
                            className="text-primary hover:underline text-sm font-medium flex items-center gap-1"
                        >
                            <ShieldCheck size={14} />
                            Gestão de Permissões
                        </Link>
                    </div>
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

            {/* Navegação por Abas */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('scoring')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                            ${activeTab === 'scoring'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        <BarChart2 size={16} />
                        Matriz de Pontuação
                    </button>
                    <button
                        onClick={() => setActiveTab('automation')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                            ${activeTab === 'automation'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        <Zap size={16} />
                        Automações
                    </button>
                    <button
                        onClick={() => setActiveTab('pipeline')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                            ${activeTab === 'pipeline'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        <Trello size={16} />
                        Etapas do Pipeline
                    </button>
                    <button
                        onClick={() => setActiveTab('pricing')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                            ${activeTab === 'pricing'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        <DollarSign size={16} />
                        Mensalidades
                    </button>
                    <button
                        onClick={() => setActiveTab('permissions')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                            ${activeTab === 'permissions'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        <ShieldCheck size={16} />
                        Permissões
                    </button>
                    <button
                        onClick={() => setActiveTab('utm')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                            ${activeTab === 'utm'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        <Zap size={16} /> {/* Reusing zap icon, or can be Link icon if imported */}
                        UTM Builder
                    </button>
                </nav>
            </div>

            <div className="mt-6 w-full pb-10">
                {activeTab === 'pricing' && <PricingTab />}
                {activeTab === 'permissions' && <PermissionsTab />}
                {activeTab === 'utm' && <UtmTab />}
                {activeTab === 'scoring' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-semibold text-slate-800 mb-2">Como funciona a pontuação?</h2>
                            <p className="text-sm text-slate-600 mb-4">
                                Os critérios abaixo definem os perfis ideais de clientes (Scores). Leads no topo do funil serão pontuados automaticamente de 0 a 100 baseados nestas configurações.
                            </p>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Sliders className="text-primary" size={18} /> Critérios de Avaliação
                                </h3>
                                <span className="text-xs font-bold uppercase text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                                    Soma Atual: {scoringTotal}
                                </span>
                            </div>
                            <div className="p-6 space-y-6">
                                {(['PROFILE', 'FINANCIAL', 'BEHAVIOR'] as const).map((category) => (
                                    <div key={category} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                {CATEGORY_LABELS[category]}
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
                                                        <select
                                                            disabled={!canManage}
                                                            value={item.fieldKey}
                                                            onChange={(e) => {
                                                                const selectedField = findFieldOption(scoringFieldOptions, e.target.value);
                                                                const nextOperator = item.operator || (selectedField?.type === 'number' ? '>=' : '=');
                                                                updateCriterion(item.id, {
                                                                    fieldKey: e.target.value,
                                                                    subtitle: selectedField?.label || item.subtitle,
                                                                    operator: nextOperator,
                                                                    expectedValue: resolveDefaultExpectedValue(selectedField, nextOperator),
                                                                });
                                                            }}
                                                            className="md:col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                                                        >
                                                            {scoringFieldOptions.map((field) => (
                                                                <option key={field.key} value={field.key}>
                                                                    {field.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            disabled={!canManage}
                                                            value={item.operator}
                                                            onChange={(e) => {
                                                                const selectedField = findFieldOption(scoringFieldOptions, item.fieldKey);
                                                                const operator = e.target.value;
                                                                updateCriterion(item.id, {
                                                                    operator,
                                                                    expectedValue:
                                                                        requiresTriggerValue(operator) && item.expectedValue
                                                                            ? item.expectedValue
                                                                            : resolveDefaultExpectedValue(selectedField, operator),
                                                                });
                                                            }}
                                                            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                                                        >
                                                            {scoringOperatorOptions.map((operator) => (
                                                                <option key={operator.value} value={operator.value}>
                                                                    {operator.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {(() => {
                                                            const selectedField = findFieldOption(scoringFieldOptions, item.fieldKey);
                                                            const shouldRenderSelect =
                                                                requiresTriggerValue(item.operator) &&
                                                                Boolean(selectedField?.options?.length) &&
                                                                usesSingleValueSelect(item.operator);
                                                            if (!requiresTriggerValue(item.operator)) {
                                                                return (
                                                                    <input
                                                                        disabled
                                                                        value="-"
                                                                        className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-gray-50 text-gray-400"
                                                                    />
                                                                );
                                                            }
                                                            if (shouldRenderSelect && selectedField?.options) {
                                                                return (
                                                                    <select
                                                                        disabled={!canManage}
                                                                        value={item.expectedValue}
                                                                        onChange={(e) => updateCriterion(item.id, { expectedValue: e.target.value })}
                                                                        className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                                                                    >
                                                                        {selectedField.options.map((option) => (
                                                                            <option key={option.value} value={option.value}>
                                                                                {option.label}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                );
                                                            }
                                                            return (
                                                                <input
                                                                    disabled={!canManage}
                                                                    value={item.expectedValue}
                                                                    onChange={(e) => updateCriterion(item.id, { expectedValue: e.target.value })}
                                                                    className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                                                                    placeholder={item.operator === 'in' || item.operator === 'not_in' ? 'valor1,valor2' : 'Valor'}
                                                                />
                                                            );
                                                        })()}
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                                                        <input
                                                            disabled={!canManage}
                                                            value={item.subtitle}
                                                            onChange={(e) => updateCriterion(item.id, { subtitle: e.target.value })}
                                                            className="md:col-span-4 border border-gray-300 rounded px-2 py-1.5 text-sm"
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
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'automation' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-semibold text-slate-800 mb-2">Gatilhos de Sistema</h2>
                            <p className="text-sm text-slate-600 mb-4">
                                Automações permitem que o CRM tome ações reativas (mover um lead, alertar gestores, etc.) sempre que regras predeterminadas forem alcançadas.
                            </p>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Zap className="text-amber-500" size={18} /> Regras de Ação
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
                                            <select
                                                disabled={!canManage}
                                                value={rule.triggerField}
                                                onChange={(e) => {
                                                    const selectedField = findFieldOption(automationFieldOptions, e.target.value);
                                                    const operator = rule.operator || (selectedField?.type === 'number' ? '>=' : '=');
                                                    updateRule(rule.id, {
                                                        triggerField: e.target.value,
                                                        operator,
                                                        triggerValue: resolveDefaultExpectedValue(selectedField, operator) || rule.triggerValue || '',
                                                    });
                                                }}
                                                className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                                            >
                                                {automationFieldOptions.map((field) => (
                                                    <option key={field.key} value={field.key}>
                                                        {field.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <select
                                                disabled={!canManage}
                                                value={rule.operator}
                                                onChange={(e) => {
                                                    const selectedField = findFieldOption(automationFieldOptions, rule.triggerField);
                                                    const operator = e.target.value;
                                                    updateRule(rule.id, {
                                                        operator,
                                                        triggerValue:
                                                            requiresTriggerValue(operator) && rule.triggerValue
                                                                ? rule.triggerValue
                                                                : resolveDefaultExpectedValue(selectedField, operator),
                                                    });
                                                }}
                                                className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                                            >
                                                {automationOperatorOptions.map((operator) => (
                                                    <option key={operator.value} value={operator.value}>
                                                        {operator.label}
                                                    </option>
                                                ))}
                                            </select>
                                            {(() => {
                                                const selectedField = findFieldOption(automationFieldOptions, rule.triggerField);
                                                const shouldRenderSelect =
                                                    requiresTriggerValue(rule.operator) &&
                                                    Boolean(selectedField?.options?.length) &&
                                                    usesSingleValueSelect(rule.operator);
                                                if (!requiresTriggerValue(rule.operator)) {
                                                    return (
                                                        <input
                                                            disabled
                                                            value="-"
                                                            className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-gray-50 text-gray-400"
                                                        />
                                                    );
                                                }
                                                if (shouldRenderSelect && selectedField?.options) {
                                                    return (
                                                        <select
                                                            disabled={!canManage}
                                                            value={rule.triggerValue}
                                                            onChange={(e) => updateRule(rule.id, { triggerValue: e.target.value })}
                                                            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                                                        >
                                                            {selectedField.options.map((option) => (
                                                                <option key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    );
                                                }
                                                return (
                                                    <input
                                                        disabled={!canManage}
                                                        value={rule.triggerValue}
                                                        onChange={(e) => updateRule(rule.id, { triggerValue: e.target.value })}
                                                        className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                                                        placeholder={rule.operator === 'in' || rule.operator === 'not_in' ? 'valor1,valor2' : 'Valor'}
                                                    />
                                                );
                                            })()}

                                            <select
                                                disabled={!canManage}
                                                value={rule.actionType}
                                                onChange={(e) => {
                                                    const actionType = e.target.value;
                                                    updateRule(rule.id, {
                                                        actionType,
                                                        actionTarget: resolveRuleActionTarget(actionType),
                                                    });
                                                }}
                                                className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                                            >
                                                {automationActionTypeOptions.map((actionType) => (
                                                    <option key={actionType.value} value={actionType.value}>
                                                        {actionType.label}
                                                    </option>
                                                ))}
                                            </select>

                                            {rule.actionType === 'move_stage' ? (
                                                <select
                                                    disabled={!canManage}
                                                    value={rule.actionTarget}
                                                    onChange={(e) => updateRule(rule.id, { actionTarget: e.target.value })}
                                                    className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                                                >
                                                    <option value="">Selecione o estágio...</option>
                                                    {stages.map(stage => (
                                                        <option key={stage.id} value={stage.id}>{stage.name}</option>
                                                    ))}
                                                </select>
                                            ) : rule.actionType === 'assign_user' || rule.actionType === 'notify_user' ? (
                                                <select
                                                    disabled={!canManage}
                                                    value={rule.actionTarget}
                                                    onChange={(e) => updateRule(rule.id, { actionTarget: e.target.value })}
                                                    className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                                                >
                                                    <option value="">Selecione o usuário...</option>
                                                    {users.map(user => (
                                                        <option key={user.id} value={user.id}>{user.name || user.id} ({user.role})</option>
                                                    ))}
                                                </select>
                                            ) : rule.actionType === 'notify_manager' ? (
                                                <select
                                                    disabled={!canManage}
                                                    value={rule.actionTarget}
                                                    onChange={(e) => updateRule(rule.id, { actionTarget: e.target.value })}
                                                    className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                                                >
                                                    <option value="all_managers">Todos os gestores</option>
                                                    {managerUsers.map(user => (
                                                        <option key={user.id} value={user.id}>{user.name || user.id} ({user.role})</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    disabled={!canManage}
                                                    value={rule.actionTarget}
                                                    onChange={(e) => updateRule(rule.id, { actionTarget: e.target.value })}
                                                    className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                                                    placeholder="Alvo da ação"
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'pipeline' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-semibold text-slate-800 mb-2">Gestão do Funil (Kanban)</h2>
                            <p className="text-sm text-slate-600 mb-4">
                                Personalize os degraus exatos pelos quais os leads devem passar, desde a prospecção até o encerramento da jornada com a Hiperfarma.
                            </p>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <GitMerge className="text-indigo-500" size={18} /> Etapas do Funil
                                </h3>
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
                            <div className="bg-slate-50 p-4 border-t border-gray-100 flex items-start gap-3">
                                <Lightbulb className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                <div className="text-xs text-slate-600">
                                    <strong>Importante:</strong> Ao menos uma etapa deve ser marcada como &quot;Ganho&quot; e uma como &quot;Perdido&quot;.
                                    As etapas &quot;Reservadas&quot;, quando existirem, não podem ser deletadas pois estão amarradas às lógicas do sistema.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
