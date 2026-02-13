'use client';

import React, { useTransition } from 'react';
import { toast } from 'sonner';
import { updateRolePermissions } from './actions';
import { AppRole, Permission } from '@/lib/permissions';

interface PermissionTableProps {
    rolePermissions: Record<AppRole, Permission[]>;
    roles: string[];
    permissionsByResource: Record<string, Permission[]>;
}

export function PermissionTable({ rolePermissions, roles, permissionsByResource }: PermissionTableProps) {
    const [isPending, startTransition] = useTransition();

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
                } else {
                    toast.error(result.error || 'Erro ao atualizar permissão');
                }
            } catch (error) {
                toast.error('Erro de conexão ao atualizar permissão');
            }
        });
    };

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Permissão</th>
                        {roles.map((role) => (
                            <th key={role} className="px-4 py-3 text-center font-medium text-gray-500 whitespace-nowrap">
                                {role}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {Object.entries(permissionsByResource).map(([resource, permissions]) => (
                        <React.Fragment key={resource}>
                            <tr className="bg-gray-50/50">
                                <td colSpan={roles.length + 1} className="px-4 py-2 font-semibold text-gray-700 border-t border-b border-gray-100">
                                    {resource}
                                </td>
                            </tr>
                            {permissions.map((permission) => (
                                <tr key={permission} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-900 font-mono text-xs pl-8">{permission}</td>
                                    {roles.map((role) => {
                                        const hasPermission = rolePermissions[role as AppRole]?.includes(permission);
                                        return (
                                            <td key={`${role}-${permission}`} className="px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() => handleToggle(role, permission, hasPermission)}
                                                    className={`h-5 w-5 rounded border flex items-center justify-center transition-colors mx-auto ${hasPermission
                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                        : 'border-gray-300 bg-white hover:border-gray-400'
                                                        } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {hasPermission && (
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
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
    );
}
