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
    const session = __authHandlerForTests ? await __authHandlerForTests() : await auth();

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

        if (__updateSingleRolePermissionsHandlerForTests) {
            await __updateSingleRolePermissionsHandlerForTests(role, normalizedPermissions);
        } else {
            await PermissionService.updateSingleRolePermissions(role, normalizedPermissions);
        }

        if (__revalidatePathHandlerForTests) {
            __revalidatePathHandlerForTests('/dashboard/admin/settings/permissions');
        }

        return { success: true, updatedPermissions: normalizedPermissions };
    } catch (error) {
        console.error('Error updating permissions:', error);
        return { success: false, error: 'Erro ao atualizar permissões' };
    }
}

// --- Test Utilities ---

let __authHandlerForTests: (() => Promise<{ user?: { id?: string; role?: string; permissions?: string[] } } | null>) | null = null;
let __updateSingleRolePermissionsHandlerForTests: ((role: 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'CONSULTANT', permissions: Permission[]) => Promise<void>) | null = null;
let __revalidatePathHandlerForTests: ((path: string) => void) | null = null;

export async function __setPermissionActionsHandlersForTests(handlers: {
    authHandler?: typeof __authHandlerForTests;
    updateSingleRolePermissionsHandler?: typeof __updateSingleRolePermissionsHandlerForTests;
    revalidatePathHandler?: typeof __revalidatePathHandlerForTests;
}) {
    if (handlers.authHandler !== undefined) __authHandlerForTests = handlers.authHandler;
    if (handlers.updateSingleRolePermissionsHandler !== undefined) __updateSingleRolePermissionsHandlerForTests = handlers.updateSingleRolePermissionsHandler;
    if (handlers.revalidatePathHandler !== undefined) __revalidatePathHandlerForTests = handlers.revalidatePathHandler;
}

export async function __resetPermissionActionsHandlersForTests() {
    __authHandlerForTests = null;
    __updateSingleRolePermissionsHandlerForTests = null;
    __revalidatePathHandlerForTests = null;
}
