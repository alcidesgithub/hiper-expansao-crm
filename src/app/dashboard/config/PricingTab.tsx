'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle,
    ClipboardList,
    Edit2,
    Megaphone,
    Plus,
    Save,
    Trash2,
    X,
} from 'lucide-react';

interface PricingTable {
    id: string;
    name: string;
    effectiveDate: string;
    expiryDate: string | null;
    isActive: boolean;
    marketingMonthly: number;
    marketingDescription: string;
    adminMonthly: number;
    adminDescription: string;
    totalMonthly: number;
    createdAt: string;
    updatedAt: string;
}

interface PricingResponse {
    tables: PricingTable[];
    permissions: {
        canManage: boolean;
    };
}

interface PricingFormState {
    name: string;
    effectiveDate: string;
    expiryDate: string;
    marketingMonthly: string;
    marketingDescription: string;
    adminMonthly: string;
    adminDescription: string;
    isActive: boolean;
}

const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const emptyForm: PricingFormState = {
    name: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    marketingMonthly: '',
    marketingDescription: '',
    adminMonthly: '',
    adminDescription: '',
    isActive: false,
};

export function PricingTab() {
    const [tables, setTables] = useState<PricingTable[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [canManage, setCanManage] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState<PricingFormState>(emptyForm);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const clearFeedback = () => {
        setError('');
        setSuccess('');
    };

    const loadTables = useCallback(async () => {
        setLoading(true);
        clearFeedback();

        try {
            const response = await fetch('/api/pricing?all=true', { cache: 'no-store' });
            const payload = await response.json();

            if (!response.ok) {
                setError(payload?.error || 'Erro ao carregar tabelas de preços');
                setTables([]);
                return;
            }

            const data = payload as PricingResponse;
            setTables(data.tables || []);
            setCanManage(Boolean(data.permissions?.canManage));
        } catch (requestError) {
            console.error('Error loading pricing tables:', requestError);
            setError('Erro de conexão ao carregar tabelas');
            setTables([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadTables();
    }, [loadTables]);

    const resetForm = () => {
        setForm({
            ...emptyForm,
            effectiveDate: new Date().toISOString().split('T')[0],
        });
    };

    const startCreate = () => {
        clearFeedback();
        resetForm();
        setCreating(true);
        setEditingId(null);
    };

    const startEdit = (table: PricingTable) => {
        clearFeedback();
        setForm({
            name: table.name,
            effectiveDate: table.effectiveDate.split('T')[0],
            expiryDate: table.expiryDate ? table.expiryDate.split('T')[0] : '',
            marketingMonthly: String(table.marketingMonthly),
            marketingDescription: table.marketingDescription || '',
            adminMonthly: String(table.adminMonthly),
            adminDescription: table.adminDescription || '',
            isActive: table.isActive,
        });
        setEditingId(table.id);
        setCreating(false);
    };

    const cancelForm = () => {
        setCreating(false);
        setEditingId(null);
        resetForm();
    };

    const totalPreview = useMemo(() => {
        const marketing = Number(form.marketingMonthly || 0);
        const admin = Number(form.adminMonthly || 0);
        return marketing + admin;
    }, [form.adminMonthly, form.marketingMonthly]);

    const validateForm = (): string | null => {
        if (!form.name.trim()) return 'Nome da tabela é obrigatório';
        if (!form.effectiveDate) return 'Data de vigência é obrigatória';

        const marketing = Number(form.marketingMonthly);
        const admin = Number(form.adminMonthly);
        if (!Number.isFinite(marketing) || marketing <= 0) return 'Mensalidade de marketing inválida';
        if (!Number.isFinite(admin) || admin <= 0) return 'Mensalidade administrativa inválida';

        if (form.expiryDate && form.expiryDate < form.effectiveDate) {
            return 'Data de expiração não pode ser anterior à vigência';
        }

        return null;
    };

    const savePricing = async () => {
        if (!canManage) return;
        clearFeedback();

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                effectiveDate: form.effectiveDate,
                expiryDate: form.expiryDate || null,
                marketingMonthly: Number(form.marketingMonthly),
                marketingDescription: form.marketingDescription.trim(),
                adminMonthly: Number(form.adminMonthly),
                adminDescription: form.adminDescription.trim(),
                isActive: form.isActive,
            };

            const isEditing = Boolean(editingId);
            const endpoint = isEditing ? `/api/pricing/${editingId}` : '/api/pricing';
            const method = isEditing ? 'PATCH' : 'POST';
            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const body = await response.json();
            if (!response.ok) {
                setError(body?.error || 'Erro ao salvar tabela');
                return;
            }

            setSuccess(isEditing ? 'Tabela atualizada com sucesso' : 'Tabela criada com sucesso');
            cancelForm();
            await loadTables();
        } catch (saveError) {
            console.error('Error saving pricing table:', saveError);
            setError('Erro de conexão ao salvar');
        } finally {
            setSaving(false);
        }
    };

    const activateTable = async (id: string) => {
        if (!canManage) return;
        clearFeedback();

        try {
            const response = await fetch(`/api/pricing/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: true }),
            });
            const body = await response.json();
            if (!response.ok) {
                setError(body?.error || 'Erro ao ativar tabela');
                return;
            }

            setSuccess('Tabela ativada com sucesso');
            await loadTables();
        } catch (errorActivate) {
            console.error('Error activating table:', errorActivate);
            setError('Erro de conexão ao ativar tabela');
        }
    };

    const deleteTable = async (id: string) => {
        if (!canManage) return;
        const confirmed = window.confirm('Tem certeza que deseja excluir esta tabela?');
        if (!confirmed) return;

        clearFeedback();
        try {
            const response = await fetch(`/api/pricing/${id}`, { method: 'DELETE' });
            const body = await response.json();
            if (!response.ok) {
                setError(body?.error || 'Erro ao excluir tabela');
                return;
            }

            setSuccess('Tabela excluída com sucesso');
            await loadTables();
        } catch (deleteError) {
            console.error('Error deleting table:', deleteError);
            setError('Erro de conexão ao excluir tabela');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Mensalidades</h2>
                    <p className="text-sm text-slate-600">
                        Configure as tabelas financeiras usadas no funil de qualificação estático do CRM.
                    </p>
                </div>
                <button
                    onClick={startCreate}
                    disabled={!canManage || creating || Boolean(editingId)}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2 self-start disabled:opacity-50"
                >
                    <Plus size={18} /> Nova Tabela
                </button>
            </div>

            {!canManage && !loading && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
                    Você está em modo somente leitura para mensalidades.
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertTriangle size={16} /> {error}
                    <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle size={16} /> {success}
                    <button onClick={() => setSuccess('')} className="ml-auto"><X size={14} /></button>
                </div>
            )}

            {(creating || editingId) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">
                            {creating ? 'Nova Tabela de Preços' : 'Editar Tabela de Preços'}
                        </h3>
                        <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Vigência *</label>
                                <input
                                    type="date"
                                    value={form.effectiveDate}
                                    onChange={(e) => setForm((prev) => ({ ...prev, effectiveDate: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Expiração</label>
                                <input
                                    type="date"
                                    value={form.expiryDate}
                                    onChange={(e) => setForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-5">
                            <h4 className="font-bold text-sm text-blue-800 flex items-center gap-2 mb-3">
                                <Megaphone size={16} /> Mensalidade de Marketing
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.marketingMonthly}
                                        onChange={(e) => setForm((prev) => ({ ...prev, marketingMonthly: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono"
                                        placeholder="2500.00"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <textarea
                                        value={form.marketingDescription}
                                        onChange={(e) => setForm((prev) => ({ ...prev, marketingDescription: e.target.value }))}
                                        rows={3}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50/50 rounded-xl border border-amber-100 p-5">
                            <h4 className="font-bold text-sm text-amber-800 flex items-center gap-2 mb-3">
                                <ClipboardList size={16} /> Mensalidade Administrativa
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.adminMonthly}
                                        onChange={(e) => setForm((prev) => ({ ...prev, adminMonthly: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono"
                                        placeholder="1800.00"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <textarea
                                        value={form.adminDescription}
                                        onChange={(e) => setForm((prev) => ({ ...prev, adminDescription: e.target.value }))}
                                        rows={3}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-primary/5 border-2 border-primary/20 rounded-xl p-5">
                            <div>
                                <span className="text-sm font-bold text-slate-700">Total Mensal</span>
                                <span className="block text-2xl font-bold text-primary">{formatCurrency(totalPreview)}</span>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="relative w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                                <span className="text-sm font-bold text-slate-700">Tabela Ativa</span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={cancelForm} className="px-4 py-2.5 text-sm font-medium text-slate-600 border border-gray-300 rounded-lg">
                                Cancelar
                            </button>
                            <button onClick={() => void savePricing()} disabled={saving} className="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                                <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="p-10 text-center bg-white rounded-xl border">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-slate-500">Carregando tabelas...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {tables.map((table) => (
                        <div key={table.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${table.isActive ? 'border-primary/30 ring-2 ring-primary/10' : 'border-gray-200'}`}>
                            <div className="px-6 py-4 flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-bold text-slate-900">{table.name}</h3>
                                    <p className="text-xs text-slate-400">
                                        Vigência: {new Date(table.effectiveDate).toLocaleDateString('pt-BR')}
                                        {table.expiryDate ? ` até ${new Date(table.expiryDate).toLocaleDateString('pt-BR')}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {table.isActive ? (
                                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">Ativa</span>
                                    ) : (
                                        <button onClick={() => void activateTable(table.id)} disabled={!canManage} className="text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg disabled:opacity-50">
                                            Ativar
                                        </button>
                                    )}
                                    <button onClick={() => startEdit(table)} disabled={!canManage || Boolean(editingId) || creating} className="text-gray-400 hover:text-blue-500 p-2 rounded-lg disabled:opacity-40">
                                        <Edit2 size={16} />
                                    </button>
                                    {!table.isActive && (
                                        <button onClick={() => void deleteTable(table.id)} disabled={!canManage} className="text-gray-400 hover:text-red-500 p-2 rounded-lg disabled:opacity-40">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="px-6 pb-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                                    <p className="text-xs font-bold text-blue-800 uppercase mb-1">Marketing</p>
                                    <p className="text-lg font-bold text-blue-700">{formatCurrency(table.marketingMonthly)}/mês</p>
                                </div>
                                <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-100">
                                    <p className="text-xs font-bold text-amber-800 uppercase mb-1">Administrativa</p>
                                    <p className="text-lg font-bold text-amber-700">{formatCurrency(table.adminMonthly)}/mês</p>
                                </div>
                                <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary/20">
                                    <p className="text-xs font-bold text-primary uppercase mb-1">Total</p>
                                    <p className="text-xl font-bold text-primary">{formatCurrency(table.totalMonthly)}/mês</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
