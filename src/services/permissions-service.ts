import { prisma } from '@/lib/prisma';
import { AppRole, Permission } from '@/lib/permissions';

const SYSTEM_SETTINGS_KEY = 'role_permissions_matrix';

// Default permissions (fallback)
export const DEFAULT_ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
    ADMIN: [
        'leads:read:all',
        'leads:read:team',
        'leads:read:own',
        'leads:write:own',
        'leads:delete',
        'leads:assign',
        'leads:score:read',
        'pipeline:advance',
        'pipeline:configure',
        'pricing:read',
        'pricing:write',
        'users:manage',
        'availability:manage',
        'dashboard:executive',
        'dashboard:operational',
        'integrations:manage',
        'audit:read',
        'system:configure',
    ],
    DIRECTOR: [
        'leads:read:all',
        'leads:read:team',
        'leads:read:own',
        'leads:score:read',
        'pricing:read',
        'dashboard:executive',
        'dashboard:operational',
    ],
    MANAGER: [
        'leads:read:all',
        'leads:read:team',
        'leads:read:own',
        'leads:write:own',
        'leads:delete',
        'leads:assign',
        'leads:score:read',
        'pipeline:advance',
        'pricing:read',
        'availability:manage',
        'dashboard:executive',
        'dashboard:operational',
    ],
    CONSULTANT: [
        'leads:read:own',
        'leads:write:own',
        'leads:score:read',
        'pipeline:advance',
        'pricing:read',
        'availability:manage',
        'dashboard:operational',
    ],
};

export const ALL_PERMISSIONS: Permission[] = [
    'leads:read:all',
    'leads:read:team',
    'leads:read:own',
    'leads:write:own',
    'leads:delete',
    'leads:assign',
    'leads:score:read',
    'pipeline:advance',
    'pipeline:configure',
    'pricing:read',
    'pricing:write',
    'users:manage',
    'dashboard:executive',
    'dashboard:operational',

    'integrations:manage',
    'audit:read',
    'availability:manage',
    'system:configure',
];

export const PERMISSIONS_BY_RESOURCE: Record<string, Permission[]> = {
    'Gestão de Leads': [
        'leads:read:all',
        'leads:read:team',
        'leads:read:own',
        'leads:write:own',
        'leads:delete',
        'leads:assign',
        'leads:score:read',
    ],
    'Pipeline e Vendas': [
        'pipeline:advance',
        'pipeline:configure',
    ],
    'Financeiro e Preços': [
        'pricing:read',
        'pricing:write',
    ],
    'Equipe e Usuários': [
        'users:manage',
        'availability:manage',
    ],
    'Relatórios': [
        'dashboard:executive',
        'dashboard:operational',
    ],
    'Configurações de Sistema': [
        'integrations:manage',
        'audit:read',
        'system:configure',
    ],
};

export async function getRolePermissions(): Promise<Record<AppRole, Permission[]>> {
    try {
        const setting = await prisma.systemSettings.findUnique({
            where: { key: SYSTEM_SETTINGS_KEY },
        });

        if (setting?.value) {
            // Validate structure (sencillo)
            const matrix = setting.value as Record<string, string[]>;
            // Ensure all roles exist
            const finalMatrix = { ...DEFAULT_ROLE_PERMISSIONS };

            (Object.keys(DEFAULT_ROLE_PERMISSIONS) as AppRole[]).forEach(role => {
                if (matrix[role] && Array.isArray(matrix[role])) {
                    finalMatrix[role] = matrix[role] as Permission[];
                }
            });

            return finalMatrix;
        }
    } catch (error) {
        console.error('Failed to fetch permission matrix, using defaults', error);
    }

    return DEFAULT_ROLE_PERMISSIONS;
}

export async function updateRolePermissions(matrix: Record<AppRole, Permission[]>) {
    await prisma.systemSettings.upsert({
        where: { key: SYSTEM_SETTINGS_KEY },
        update: { value: matrix },
        create: {
            key: SYSTEM_SETTINGS_KEY,
            value: matrix,
        },
    });
}

export async function updateSingleRolePermissions(role: AppRole, permissions: Permission[]) {
    const currentMatrix = await getRolePermissions();
    const newMatrix = {
        ...currentMatrix,
        [role]: permissions,
    };
    await updateRolePermissions(newMatrix);
}

export const PermissionService = {
    getRolePermissions,
    updateRolePermissions,
    updateSingleRolePermissions,
    DEFAULT_ROLE_PERMISSIONS,
    ALL_PERMISSIONS,
    PERMISSIONS_BY_RESOURCE,
};
