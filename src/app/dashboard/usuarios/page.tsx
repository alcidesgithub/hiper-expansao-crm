'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
    Ban,
    CheckCircle2,
    Loader2,
    Pencil,
    RefreshCw,
    Save,
    Search,
    Shield,
    Trash2,
    UserPlus,
    X,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

type UserRole = 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'CONSULTANT';
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

interface ManagedUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    phone: string | null;
    lastLoginAt: string | null;
}

interface UsersResponse {
    users: ManagedUser[];
    pagination: { page: number; total: number; totalPages: number };
    permissions: { canManage: boolean };
    currentUser: { id: string | null };
}

interface UserFormState {
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    phone: string;
    password: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
    ADMIN: 'Admin',
    DIRECTOR: 'Diretor',
    MANAGER: 'Gerente',
    CONSULTANT: 'Consultor',
};

const STATUS_LABELS: Record<UserStatus, string> = {
    ACTIVE: 'Ativo',
    INACTIVE: 'Inativo',
    SUSPENDED: 'Suspenso',
};

const EMPTY_FORM: UserFormState = {
    name: '',
    email: '',
    role: 'CONSULTANT',
    status: 'ACTIVE',
    phone: '',
    password: '',
};

function formatLastAccess(value: string | null): string {
    if (!value) return 'Nunca';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Sem registro' : date.toLocaleString('pt-BR');
}

export default function UsersPage() {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');
    const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
    const [page, setPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [canManage, setCanManage] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
    const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
    const [formError, setFormError] = useState<string | null>(null);

    const loadUsers = useCallback(async (withSpinner = false) => {
        if (withSpinner) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set('context', 'management');
            params.set('page', String(page));
            params.set('limit', '15');
            if (search.trim()) params.set('search', search.trim());
            if (statusFilter !== 'ALL') params.set('status', statusFilter);
            if (roleFilter !== 'ALL') params.set('role', roleFilter);

            const response = await fetch(`/api/users?${params.toString()}`, { cache: 'no-store' });
            const payload = (await response.json()) as Partial<UsersResponse> & { error?: string };
            if (!response.ok) {
                setError(payload.error || 'Falha ao carregar usuários');
                setUsers([]);
                return;
            }

            const data = payload as UsersResponse;
            setUsers(data.users);
            setTotalUsers(data.pagination.total);
            setTotalPages(data.pagination.totalPages || 1);
            setCanManage(Boolean(data.permissions?.canManage));
            setCurrentUserId(data.currentUser?.id ?? null);
        } catch (loadError) {
            console.error(loadError);
            setError('Não foi possível carregar a lista de usuários');
            setUsers([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page, roleFilter, search, statusFilter]);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    function openCreateModal() {
        setEditingUser(null);
        setForm(EMPTY_FORM);
        setFormError(null);
        setModalOpen(true);
    }

    function openEditModal(user: ManagedUser) {
        setEditingUser(user);
        setForm({
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            phone: user.phone || '',
            password: '',
        });
        setFormError(null);
        setModalOpen(true);
    }

    async function saveUser(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canManage || saving) return;
        setSaving(true);
        setFormError(null);

        try {
            const isEditing = Boolean(editingUser);
            const endpoint = isEditing ? `/api/users/${editingUser?.id}` : '/api/users';
            const method = isEditing ? 'PATCH' : 'POST';

            const body: Record<string, string> = {
                name: form.name.trim(),
                email: form.email.trim(),
                role: form.role,
                status: form.status,
                phone: form.phone.trim(),
            };
            if (form.password.trim()) body.password = form.password.trim();

            if (!isEditing && !body.password) {
                setFormError('Senha obrigatória para criar usuário');
                return;
            }

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const payload = await response.json();
            if (!response.ok) {
                setFormError(payload?.error || 'Falha ao salvar usuário');
                return;
            }

            setModalOpen(false);
            setEditingUser(null);
            setForm(EMPTY_FORM);
            await loadUsers(true);
            toast.success(isEditing ? 'Usuário atualizado com sucesso' : 'Usuário criado com sucesso');
        } catch (saveError) {
            console.error(saveError);
            toast.error('Erro inesperado ao salvar usuário');
        } finally {
            setSaving(false);
        }
    }

    async function toggleStatus(user: ManagedUser) {
        const nextStatus: UserStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        try {
            const response = await fetch(`/api/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            });
            const payload = await response.json();
            if (!response.ok) {
                toast.error(payload?.error || 'Falha ao alterar status');
                return;
            }
            await loadUsers(true);
            toast.success(`Usuário ${nextStatus === 'ACTIVE' ? 'ativado' : 'inativado'} com sucesso`);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao alterar status');
        }
    }

    async function handleDeleteUser(user: ManagedUser) {
        const confirmed = confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o usuário ${user.name}? Esta ação não pode ser desfeita.`);
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
            const payload = await response.json();

            if (!response.ok) {
                if (payload.code === 'CONSTRAINT_VIOLATION') {
                    toast.error(payload.error, { duration: 5000 });
                } else {
                    toast.error(payload?.error || 'Falha ao excluir usuário');
                }
                return;
            }

            await loadUsers(true);
            toast.success('Usuário excluído com sucesso');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao excluir usuário');
        }
    }

    return (
        <div className="w-full bg-slate-50 min-h-full font-sans text-slate-800 p-6 space-y-6">
            <div className="flex justify-between items-center gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão de Usuários</h1>
                    <p className="mt-1 text-slate-500">Gerencie acesso, papéis e suspensão auditada.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => void loadUsers(true)} className="px-3 py-2 text-sm border rounded-lg bg-white flex items-center gap-2">
                        {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar
                    </button>
                    <button onClick={openCreateModal} disabled={!canManage} className="px-3 py-2 text-sm rounded-lg bg-primary text-white disabled:opacity-50 flex items-center gap-2">
                        <UserPlus size={14} /> Adicionar Usuário
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative md:col-span-2">
                    <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                    <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por nome ou e-mail" className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
                </div>
                <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as 'ALL' | UserRole); setPage(1); }} className="px-3 py-2 border rounded-lg text-sm">
                    <option value="ALL">Todas as funções</option>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as 'ALL' | UserStatus); setPage(1); }} className="px-3 py-2 border rounded-lg text-sm">
                    <option value="ALL">Todos os status</option>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
                {loading ? (
                    <div className="h-40 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-primary" /></div>
                ) : error ? (
                    <div className="p-6 text-red-600 text-sm">{error}</div>
                ) : users.length === 0 ? (
                    <div className="p-6 text-gray-500 text-sm">Nenhum usuário encontrado.</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-xs uppercase text-gray-500">Usuário</th>
                                <th className="px-4 py-3 text-xs uppercase text-gray-500">Função</th>
                                <th className="px-4 py-3 text-xs uppercase text-gray-500">Status</th>
                                <th className="px-4 py-3 text-xs uppercase text-gray-500">Último acesso</th>
                                <th className="px-4 py-3 text-xs uppercase text-gray-500 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => {
                                const isSelf = currentUserId === user.id;
                                return (
                                    <tr key={user.id} className="border-b last:border-b-0">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-sm">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-1">
                                                <Shield size={12} /> {ROLE_LABELS[user.role]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-1 border ${user.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-100' : user.status === 'SUSPENDED' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                {user.status === 'ACTIVE' ? <CheckCircle2 size={12} /> : user.status === 'SUSPENDED' ? <Ban size={12} /> : <XCircle size={12} />}
                                                {STATUS_LABELS[user.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{formatLastAccess(user.lastLoginAt)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openEditModal(user)} disabled={!canManage} className="px-2 py-1 text-xs border rounded-lg disabled:opacity-40 inline-flex items-center gap-1 hover:bg-gray-50"><Pencil size={12} />Editar</button>

                                                <button onClick={() => void toggleStatus(user)} disabled={!canManage || isSelf} className={`px-2 py-1 text-xs border rounded-lg disabled:opacity-40 inline-flex items-center gap-1 ${user.status === 'ACTIVE' ? 'text-amber-700 border-amber-200 hover:bg-amber-50' : 'text-green-700 border-green-200 hover:bg-green-50'}`}>
                                                    {user.status === 'ACTIVE' ? <Ban size={12} /> : <CheckCircle2 size={12} />}
                                                    {user.status === 'ACTIVE' ? 'Inativar' : 'Ativar'}
                                                </button>

                                                <button onClick={() => void handleDeleteUser(user)} disabled={!canManage || isSelf} className="px-2 py-1 text-xs border border-red-200 text-red-700 rounded-lg disabled:opacity-40 inline-flex items-center gap-1 hover:bg-red-50"><Trash2 size={12} />Excluir</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
                <p>Total de usuários: {totalUsers}</p>
                <div className="flex gap-2">
                    <button onClick={() => setPage((v) => Math.max(v - 1, 1))} disabled={page <= 1} className="px-3 py-1 border rounded-lg disabled:opacity-40">Anterior</button>
                    <span className="px-2 py-1">Página {page} de {totalPages}</span>
                    <button onClick={() => setPage((v) => Math.min(v + 1, totalPages))} disabled={page >= totalPages} className="px-3 py-1 border rounded-lg disabled:opacity-40">Próxima</button>
                </div>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-xl bg-white rounded-xl border">
                        <div className="px-4 py-3 border-b flex justify-between items-center">
                            <h2 className="font-semibold">{editingUser ? 'Editar usuário' : 'Adicionar usuário'}</h2>
                            <button onClick={() => setModalOpen(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={saveUser} className="p-4 space-y-3">
                            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nome" required className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="E-mail" type="email" required className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <div className="grid grid-cols-2 gap-3">
                                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                                    {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as UserStatus }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </div>
                            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Telefone" className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <input value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={editingUser ? 'Nova senha (opcional)' : 'Senha'} type="password" minLength={12} required={!editingUser} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            {formError && <p className="text-sm text-red-600">{formError}</p>}
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-2 border rounded-lg text-sm">Cancelar</button>
                                <button type="submit" disabled={saving} className="px-3 py-2 bg-primary text-white rounded-lg text-sm inline-flex items-center gap-2 disabled:opacity-50">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
