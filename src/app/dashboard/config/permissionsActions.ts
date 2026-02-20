'use server';

import { auth } from '@/auth';
import { ALL_PERMISSIONS, can, isAppRole, Permission } from '@/lib/permissions';
import { PermissionService } from '@/services/permissions-service';

export async function getPermissionsConfigData() {
    const session = await auth();

    if (!session?.user?.id || !can({ role: session.user.role, permissions: session.user.permissions }, 'system:configure')) {
        return { success: false, error: 'Não autorizado', data: null };
    }

    try {
        const rolePermissions = await PermissionService.getRolePermissions();
        const roles = Object.keys(rolePermissions);
        return {
            success: true,
            data: {
                rolePermissions,
                roles,
                permissionsByResource: PermissionService.PERMISSIONS_BY_RESOURCE
            }
        };
    } catch (error) {
        console.error('Error fetching permissions config:', error);
        return { success: false, error: 'Erro ao carregar permissões', data: null };
    }
}

export async function updateRolePermissions(role: string, permissions: Permission[]) {
    const session = await auth();

    const hasPermission = can({ role: session?.user?.role, permissions: session?.user?.permissions }, 'system:configure');

    if (!session?.user?.id || !hasPermission) {
        return { success: false, error: 'Não autorizado' };
    }

    try {
        if (role === 'ADMIN' && !permissions.includes('system:configure')) {
            return { success: false, error: 'A função ADMIN deve manter a permissão system:configure' };
        }

        if (!isAppRole(role)) {
            return { success: false, error: 'Função inválida' };
        }

        const normalizedPermissions = permissions.filter((permission) =>
            (ALL_PERMISSIONS as readonly string[]).includes(permission)
        );

        await PermissionService.updateSingleRolePermissions(role, normalizedPermissions);
        return { success: true, updatedPermissions: normalizedPermissions };
    } catch (error) {
        console.error('Error updating permissions:', error);
        return { success: false, error: 'Erro ao atualizar permissões' };
    }
}
