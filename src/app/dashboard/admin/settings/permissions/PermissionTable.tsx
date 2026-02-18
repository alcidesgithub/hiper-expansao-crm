'use client';

import React, { useTransition } from 'react';
import { toast } from 'sonner';
import { updateRolePermissions } from './actions';
import { AppRole, Permission } from '@/lib/permissions';
import { useSession } from 'next-auth/react';
import {
    Shield,
    Check,
    Lock,
    UserCircle,
    BarChart3,
    Workflow,
    DollarSign,
    Users,
    Settings,
    Loader2
} from 'lucide-react';

interface PermissionTableProps {
    rolePermissions: Record<AppRole, Permission[]>;
    roles: string[];
    permissionsByResource: Record<string, Permission[]>;
}

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
    'Gestão de Leads': <UserCircle size={18} className="text-blue-500" />,
    'Pipeline e Vendas': <Workflow size={18} className="text-purple-500" />,
    'Financeiro e Preços': <DollarSign size={18} className="text-green-500" />,
    'Equipe e Usuários': <Users size={18} className="text-orange-500" />,
    'Relatórios': <BarChart3 size={18} className="text-amber-500" />,
    'Configurações de Sistema': <Settings size={18} className="text-slate-500" />,
};

export function PermissionTable({ rolePermissions, roles, permissionsByResource }: PermissionTableProps) {
    const [isPending, startTransition] = useTransition();
    const { data: session, update } = useSession();

    const handleToggle = (role: string, permission: Permission, hasPermission: boolean) => {
        const currentPermissions = rolePermissions[role as AppRole];
        const newPermissions = hasPermission
            ? currentPermissions.filter((p) => p !== permission)
            : [...currentPermissions, permission];

        startTransition(async () => {
            try {
                const result = await updateRolePermissions(role, newPermissions);
                if (result.success) {
                    toast.success(`Permissão ${permission} ${hasPermission ? 'removida' : 'adicionada'} para ${role}`);

                    // If the updated role is the current user's role, refresh the session
                    if (session?.user?.role === role) {
                        try {
                            await update();
                        } catch (e) {
                            console.error('Failed to update session:', e);
                        }
                    }
                } else {
                    toast.error(result.error || 'Erro ao atualizar permissão');
                }
            } catch {
                toast.error('Erro de conexão ao atualizar permissão');
            }
        });
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left font-semibold text-slate-700 w-1/3">
                                <div className="flex items-center gap-2">
                                    <Shield size={16} className="text-slate-400" />
                                    <span>Recurso & Permissão</span>
                                </div>
                            </th>
                            {roles.map((role) => (
                                <th key={role} className="px-6 py-4 text-center font-bold text-slate-900 border-l border-slate-100 min-w-[120px]">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Função</span>
                                        <span className="text-sm">{role}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {Object.entries(permissionsByResource).map(([resource, permissions]) => (
                            <React.Fragment key={resource}>
                                <tr className="bg-slate-50/30">
                                    <td colSpan={roles.length + 1} className="px-6 py-3 font-bold text-slate-800 bg-gradient-to-r from-slate-50 to-white border-y border-slate-100">
                                        <div className="flex items-center gap-3">
                                            {RESOURCE_ICONS[resource] || <Shield size={18} className="text-slate-400" />}
                                            <span className="text-[13px] tracking-tight">{resource}</span>
                                        </div>
                                    </td>
                                </tr>
                                {permissions.map((permission) => (
                                    <tr key={permission} className="group hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 text-slate-600 font-medium pl-12 border-r border-slate-50">
                                            <div className="flex flex-col">
                                                <span className="text-[13px]">{permission}</span>
                                                <span className="text-[10px] text-slate-400 font-normal uppercase mt-0.5">Acesso Granular</span>
                                            </div>
                                        </td>
                                        {roles.map((role) => {
                                            const hasPermission = rolePermissions[role as AppRole]?.includes(permission);
                                            return (
                                                <td key={`${role}-${permission}`} className="px-6 py-4 text-center group-hover:bg-blue-50/10 transition-colors border-l border-slate-50">
                                                    <button
                                                        type="button"
                                                        disabled={isPending}
                                                        onClick={() => handleToggle(role, permission, hasPermission)}
                                                        className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-all mx-auto transform active:scale-90 ${hasPermission
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                                                            : 'border-slate-200 bg-white text-slate-300 hover:border-slate-400 hover:text-slate-500'
                                                            } ${isPending ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                                                        title={`${hasPermission ? 'Remover' : 'Adicionar'} permissão para ${role}`}
                                                    >
                                                        {isPending ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : hasPermission ? (
                                                            <Check className="h-4 w-4 stroke-[3px]" />
                                                        ) : (
                                                            <Lock className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-blue-600 rounded" />
                        <span>Habilitado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-white border border-slate-200 rounded" />
                        <span>Desabilitado</span>
                    </div>
                </div>
                <p className="text-[11px] text-slate-400 italic">
                    As alterações são aplicadas instantaneamente e refletidas na próxima requisição do usuário.
                </p>
            </div>
        </div>
    );
}
