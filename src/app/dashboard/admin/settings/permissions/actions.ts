'use server';

import { auth } from '@/auth';
import { ALL_PERMISSIONS, can, isAppRole, Permission } from '@/lib/permissions';
import { PermissionService } from '@/services/permissions-service';
import { revalidatePath } from 'next/cache';

export interface UpdateRolePermissionsResult {
    success: boolean;
    error?: string;
    updatedPermissions?: Permission[];
}

export async function updateRolePermissions(role: string, permissions: Permission[]): Promise<UpdateRolePermissionsResult> {
    const session = await auth();

    const hasPermission = can({ role: session?.user?.role, permissions: session?.user?.permissions }, 'system:configure');

    // Check if user is admin or director (users with permission to manage permissions)
    // For bootstrapping, we might need a specific permission like 'system:configure'
    if (!session?.user?.id || !hasPermission) {
        throw new Error('Não autorizado');
    }

    try {
        // Validation: Prevent removing 'system:configure' from ADMIN role if desired (safety)
        if (role === 'ADMIN' && !permissions.includes('system:configure')) {
            return { success: false, error: 'A função ADMIN deve manter a permissão system:configure' };
        }

        if (!isAppRole(role)) {
            return { success: false, error: 'FunÃ§Ã£o invÃ¡lida' };
        }

        const normalizedPermissions = permissions.filter((permission) =>
            (ALL_PERMISSIONS as readonly string[]).includes(permission)
        );

        await PermissionService.updateSingleRolePermissions(role, normalizedPermissions);
        revalidatePath('/dashboard/admin/settings/permissions');
        return { success: true, updatedPermissions: normalizedPermissions };
    } catch (error) {
        console.error('Error updating permissions:', error);
        return { success: false, error: 'Erro ao atualizar permissões' };
    }
}
