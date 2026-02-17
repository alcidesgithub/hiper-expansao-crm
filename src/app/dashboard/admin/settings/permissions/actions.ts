'use server';

import { auth } from '@/auth';
import { can } from '@/lib/permissions';
import { PermissionService } from '@/services/permissions-service';
import { revalidatePath } from 'next/cache';

export async function updateRolePermissions(role: string, permissions: string[]) {
    const session = await auth();

    console.log('[updateRolePermissions] Session user:', {
        id: session?.user?.id,
        role: session?.user?.role,
        permissionsCount: session?.user?.permissions?.length
    });

    const hasPermission = can({ role: session?.user?.role, permissions: session?.user?.permissions }, 'system:configure');
    console.log('[updateRolePermissions] Has system:configure:', hasPermission);

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

        await PermissionService.updateSingleRolePermissions(role as any, permissions as any);
        revalidatePath('/dashboard/admin/settings/permissions');
        return { success: true, updatedPermissions: permissions };
    } catch (error) {
        console.error('Error updating permissions:', error);
        return { success: false, error: 'Erro ao atualizar permissões' };
    }
}
