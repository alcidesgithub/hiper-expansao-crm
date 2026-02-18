'use client';

import React, { useState, useEffect } from 'react';
import {
    User,
    Mail,
    Shield,
    Phone,
    Building2,
    Lock,
    Save,
    Loader2,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

type ProfileSessionUser = {
    id: string;
    role: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    department?: string | null;
};

type RoleLabelMap = Record<'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'CONSULTANT', string>;

export default function ProfilePage() {
    const { data: session, update } = useSession();
    const sessionUser = session?.user as ProfileSessionUser | undefined;
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        department: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (sessionUser) {
            setForm(prev => ({
                ...prev,
                name: sessionUser.name || '',
                email: sessionUser.email || '',
                phone: sessionUser.phone || '',
                department: sessionUser.department || '',
            }));
        }
    }, [sessionUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (form.newPassword && form.newPassword !== form.confirmPassword) {
            toast.error('As novas senhas não coincidem');
            setLoading(false);
            return;
        }

        if (form.newPassword && form.newPassword.length < 12) {
            toast.error('A nova senha deve ter no mÃ­nimo 12 caracteres');
            setLoading(false);
            return;
        }

        try {
            const userId = sessionUser?.id;
            if (!userId) {
                throw new Error('Usuário não autenticado');
            }

            const body: {
                name: string;
                email: string;
                phone: string;
                department: string;
                password?: string;
            } = {
                name: form.name,
                email: form.email,
                phone: form.phone,
                department: form.department,
            };

            if (form.newPassword) {
                body.password = form.newPassword;
            }

            const response = await fetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao atualizar perfil');
            }

            toast.success('Perfil atualizado com sucesso!');
            setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));

            // Refetch session
            await update();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro ao atualizar perfil';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    if (!sessionUser) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const roleLabels: RoleLabelMap = {
        ADMIN: 'Administrador',
        DIRECTOR: 'Diretor',
        MANAGER: 'Gerente',
        CONSULTANT: 'Consultor'
    };
    const roleLabel = roleLabels[(sessionUser.role as keyof RoleLabelMap)] ?? roleLabels.CONSULTANT;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
                    <p className="text-gray-500">Gerencie suas informações pessoais e segurança da conta.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-white shadow-sm mb-4">
                            <span className="text-3xl font-bold text-primary">
                                {sessionUser.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">{sessionUser.name}</h2>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            <Shield size={12} /> {roleLabel}
                        </span>
                        <div className="w-full mt-6 pt-6 border-t border-gray-50 space-y-3">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <Mail size={16} className="text-gray-400" />
                                <span className="truncate">{sessionUser.email}</span>
                            </div>
                            {form.phone && (
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <Phone size={16} className="text-gray-400" />
                                    <span>{form.phone}</span>
                                </div>
                            )}
                            {form.department && (
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <Building2 size={16} className="text-gray-400" />
                                    <span>{form.department}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                        {/* Basic Info */}
                        <div className="p-6">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Informações Básicas</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Nome Completo</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            required
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">E-mail</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                            required
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Telefone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            value={form.phone}
                                            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Departamento</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            value={form.department}
                                            onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Password Change */}
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Lock size={16} className="text-gray-400" />
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Alterar Senha</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Nova Senha</label>
                                    <input
                                        type="password"
                                        placeholder="Min. 12 caracteres"
                                        value={form.newPassword}
                                        onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                                        minLength={12}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Confirmar Nova Senha</label>
                                    <input
                                        type="password"
                                        placeholder="Repita a nova senha"
                                        value={form.confirmPassword}
                                        onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                        minLength={12}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <p className="mt-4 text-xs text-gray-400">
                                Deixe em branco se não desejar alterar sua senha.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="p-6 bg-gray-50 flex justify-end items-center gap-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Salvar Alterações
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
