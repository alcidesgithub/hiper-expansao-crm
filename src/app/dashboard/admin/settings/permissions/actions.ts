'use server';

import { auth } from '@/auth';
import { can } from '@/lib/permissions';
import { PermissionService } from '@/services/permissions-service';
import { revalidatePath } from 'next/cache';

export async function updateRolePermissions(role: string, permissions: string[]) {
    const session = await auth();

    // Check if user is admin or director (users with permission to manage permissions)
    // For bootstrapping, we might need a specific permission like 'system:configure'
    if (!session?.user?.id || !can({ role: session.user.role, permissions: session.user.permissions }, 'system:configure')) {
        throw new Error('Não autorizado');
    }

    try {
        await PermissionService.updateSingleRolePermissions(role as any, permissions as any);
        revalidatePath('/dashboard/admin/settings/permissions');
        return { success: true };
    } catch (error) {
        console.error('Error updating permissions:', error);
        return { success: false, error: 'Erro ao atualizar permissões' };
    }
}
