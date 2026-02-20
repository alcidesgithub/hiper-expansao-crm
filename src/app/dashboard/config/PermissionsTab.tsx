'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Settings2 } from 'lucide-react';
import { PermissionTable } from './PermissionTable';
import { getPermissionsConfigData } from './permissionsActions';
import { AppRole, Permission } from '@/lib/permissions';

export function PermissionsTab() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [permissionsData, setPermissionsData] = useState<{
        rolePermissions: Record<AppRole, Permission[]>;
        roles: string[];
        permissionsByResource: Record<string, Permission[]>;
    } | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const res = await getPermissionsConfigData();
            if (res.success && res.data) {
                setPermissionsData(res.data as unknown as {
                    rolePermissions: Record<AppRole, Permission[]>;
                    roles: string[];
                    permissionsByResource: Record<string, Permission[]>;
                });
            } else {
                setError(res.error || 'Erro ao carregar permissões');
            }
            setLoading(false);
        };
        void loadData();
    }, []);

    if (loading) {
        return (
            <div className="p-10 text-center bg-white rounded-xl border">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-500">Carregando matriz de permissões...</p>
            </div>
        );
    }

    if (error || !permissionsData) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error || 'Não foi possível carregar as permissões do sistema.'}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <ShieldCheck size={120} />
                </div>

                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <Settings2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Matriz de Permissões</h2>
                        <p className="text-slate-500 max-w-2xl text-sm mt-1">
                            Gerencie os níveis de acesso e permissões granulares para cada função do sistema.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-slate-600">Configuração Autorizada</span>
                </div>
            </div>

            <PermissionTable
                rolePermissions={permissionsData.rolePermissions}
                roles={permissionsData.roles}
                permissionsByResource={permissionsData.permissionsByResource}
            />
        </div>
    );
}
