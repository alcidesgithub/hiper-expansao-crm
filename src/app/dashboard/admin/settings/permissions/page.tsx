import { auth } from '@/auth';
import { can } from '@/lib/permissions';
import { PermissionService } from '@/services/permissions-service';
import { redirect } from 'next/navigation';
import { PermissionTable } from './PermissionTable';
import React from 'react';

export default async function PermissionsPage() {
    const session = await auth();

    if (!session?.user?.id || !can({ role: session.user.role, permissions: session.user.permissions }, 'system:configure')) {
        redirect('/dashboard');
    }

    const rolePermissions = await PermissionService.getRolePermissions();
    const roles = Object.keys(rolePermissions);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Matriz de Permissões</h1>
            <p className="text-gray-500">Configure as permissões de acesso para cada função do sistema.</p>

            <PermissionTable
                rolePermissions={rolePermissions}
                roles={roles}
                permissionsByResource={PermissionService.PERMISSIONS_BY_RESOURCE}
            />
        </div>
    );
}
