import { auth } from '@/auth';
import { can } from '@/lib/permissions';
import { PermissionService } from '@/services/permissions-service';
import { redirect } from 'next/navigation';
import { PermissionTable } from './PermissionTable';
import React from 'react';
import { ShieldCheck, Settings2 } from 'lucide-react';

export default async function PermissionsPage() {
    const session = await auth();

    if (!session?.user?.id || !can({ role: session.user.role, permissions: session.user.permissions }, 'system:configure')) {
        redirect('/dashboard');
    }

    const rolePermissions = await PermissionService.getRolePermissions();
    const roles = Object.keys(rolePermissions);

    return (
        <div className="space-y-8 p-1">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <ShieldCheck size={120} />
                </div>

                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <Settings2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Matriz de Permissões</h1>
                        <p className="text-slate-500 max-w-2xl">
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
                rolePermissions={rolePermissions}
                roles={roles}
                permissionsByResource={PermissionService.PERMISSIONS_BY_RESOURCE}
            />
        </div>
    );
}
