import { auth } from '@/auth';
import { can } from '@/lib/permissions';
import { PermissionService } from '@/services/permissions-service';
import { ALL_PERMISSIONS } from '@/services/permissions-service';
import { redirect } from 'next/navigation';
import { updateRolePermissions } from './actions';

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

            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Permissão</th>
                            {roles.map((role) => (
                                <th key={role} className="px-4 py-3 text-center font-medium text-gray-500">
                                    {role}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {ALL_PERMISSIONS.map((permission) => (
                            <tr key={permission} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-900 font-mono text-xs">{permission}</td>
                                {roles.map((role) => {
                                    const hasPermission = rolePermissions[role as keyof typeof rolePermissions].includes(permission);
                                    return (
                                        <td key={`${role}-${permission}`} className="px-4 py-3 text-center">
                                            <form
                                                action={async () => {
                                                    'use server';
                                                    const currentPermissions = rolePermissions[role as keyof typeof rolePermissions];
                                                    const newPermissions = hasPermission
                                                        ? currentPermissions.filter((p: string) => p !== permission)
                                                        : [...currentPermissions, permission];
                                                    await updateRolePermissions(role, newPermissions);
                                                }}
                                            >
                                                <button
                                                    type="submit"
                                                    className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${hasPermission
                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                        : 'border-gray-300 bg-white hover:border-gray-400'
                                                        }`}
                                                >
                                                    {hasPermission && (
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </form>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
