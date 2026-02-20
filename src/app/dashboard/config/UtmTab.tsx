'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Link2, Copy, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { getUtmLinks, createUtmLink, deleteUtmLink, type UtmLinkFormData } from './utmActions';
import type { UtmLink } from '@prisma/client';
import { LEAD_SOURCE_OPTIONS } from '@/lib/lead-form-options';

type UtmLinkWithUser = UtmLink & { user?: { name: string } | null };

export function UtmTab() {
    const [links, setLinks] = useState<UtmLinkWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<UtmLinkFormData>({
        name: '',
        url: '',
        utmSource: '',
        utmMedium: '',
        utmCampaign: '',
        utmTerm: '',
        utmContent: ''
    });

    const fetchLinks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getUtmLinks();
            setLinks(data as UtmLinkWithUser[]);
        } catch (err) {
            console.error('Failed to load UTM links:', err);
            setError('Não foi possível carregar os links UTM.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchLinks();
    }, [fetchLinks]);

    const handleCopy = async (id: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente excluir este link UTM?')) return;
        try {
            const res = await deleteUtmLink(id);
            if (res.success) {
                setLinks((prev) => prev.filter((l) => l.id !== id));
            } else {
                alert('Erro ao excluir: ' + res.error);
            }
        } catch (err) {
            console.error('Delete error', err);
            alert('Falha ao excluir o link UTM.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        try {
            const result = await createUtmLink(formData);
            if (result.success && result.link) {
                // Prepend to links array
                setLinks(prev => [result.link as UtmLinkWithUser, ...prev]);
                setIsModalOpen(false);
                setFormData({
                    name: '',
                    url: '',
                    utmSource: '',
                    utmMedium: '',
                    utmCampaign: '',
                    utmTerm: '',
                    utmContent: ''
                });
            } else {
                setError(result.error || 'Erro ao criar o link UTM.');
            }
        } catch (err) {
            console.error('Error submitting form', err);
            setError('Falha ao tentar criar o link UTM.');
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to generate preview
    const previewUrl = React.useMemo(() => {
        if (!formData.url) return '';
        try {
            const url = new URL(formData.url);
            if (formData.utmSource) url.searchParams.set('utm_source', formData.utmSource);
            if (formData.utmMedium) url.searchParams.set('utm_medium', formData.utmMedium);
            if (formData.utmCampaign) url.searchParams.set('utm_campaign', formData.utmCampaign);
            if (formData.utmTerm) url.searchParams.set('utm_term', formData.utmTerm);
            if (formData.utmContent) url.searchParams.set('utm_content', formData.utmContent);
            return url.toString();
        } catch {
            return 'URL Base inválida. Deve incluir http:// ou https://';
        }
    }, [formData]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Gestão de UTMs</h2>
                    <p className="text-sm text-gray-500 mt-1">Crie e gerencie links parametrizados para uso em campanhas de marketing.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    Novo Link
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-primary" />
                </div>
            ) : error && links.length === 0 ? (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2">
                    <AlertCircle size={20} />
                    {error}
                </div>
            ) : links.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
                    <Link2 size={48} className="mx-auto mb-4 text-gray-400 opacity-50" />
                    <p className="text-lg font-medium text-gray-900">Nenhum link UTM cadastrado</p>
                    <p className="mt-2 text-sm">Crie seu primeiro link para rastrear as origens dos seus leads.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-6 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm mx-auto"
                    >
                        <Plus size={18} />
                        Novo Link UTM
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Nome da Referência</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Parâmetros</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em / Por</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {links.map((link) => (
                                    <tr key={link.id} className="hover:bg-gray-50 group transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-gray-900">{link.name}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[200px]" title={link.url}>{link.url}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 text-[11px]">
                                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 font-medium">src: {link.utmSource}</span>
                                                {link.utmMedium && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100 font-medium">med: {link.utmMedium}</span>}
                                                {link.utmCampaign && <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-100 font-medium">cmp: {link.utmCampaign}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <p>{new Date(link.createdAt).toLocaleDateString('pt-BR')}</p>
                                            <p className="text-xs text-gray-400">{link.user?.name || 'Sistema'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => void handleCopy(link.id, link.fullUrl)}
                                                    className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                                    title="Copiar URL Completa"
                                                >
                                                    {copiedId === link.id ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => void handleDelete(link.id)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Excluir link"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Link2 className="text-primary" />
                                Criador de UTM (UTM Builder)
                            </h3>
                        </div>

                        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 overflow-y-auto flex-1 space-y-5">
                            {error && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2 mb-4">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Referência *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Campanha Black Friday - Face Ads"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all text-gray-700"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Um nome interno para você identificar este link na listagem.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL Base *</label>
                                <input
                                    type="url"
                                    required
                                    placeholder="https://hiperfarma.com.br/funnel"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all text-gray-700"
                                    value={formData.url}
                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">utm_source *</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all text-gray-700 bg-white"
                                        value={formData.utmSource}
                                        onChange={e => setFormData({ ...formData, utmSource: e.target.value })}
                                    >
                                        <option value="" disabled>Selecione a origem</option>
                                        {LEAD_SOURCE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label} ({option.value})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">utm_medium</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: cpc, banner, paid_social"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all text-gray-700"
                                        value={formData.utmMedium}
                                        onChange={e => setFormData({ ...formData, utmMedium: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">utm_campaign</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: blackfriday_2026"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all text-gray-700"
                                        value={formData.utmCampaign}
                                        onChange={e => setFormData({ ...formData, utmCampaign: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">utm_term</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: franquia_farmacia"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all text-gray-700"
                                        value={formData.utmTerm}
                                        onChange={e => setFormData({ ...formData, utmTerm: e.target.value })}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">utm_content</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: banner_lateral, v2_video"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all text-gray-700"
                                        value={formData.utmContent}
                                        onChange={e => setFormData({ ...formData, utmContent: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg mt-6">
                                <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">Preview da URL Final</label>
                                <div className="text-sm font-mono break-all text-slate-700 bg-white p-3 border border-slate-200 rounded min-h-[46px]">
                                    {previewUrl || <span className="text-slate-400">Preencha os campos para visualizar...</span>}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || !formData.name || !formData.url || !formData.utmSource}
                                    className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                                    Criar UTM
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

