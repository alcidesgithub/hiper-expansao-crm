import { prisma } from '@/lib/prisma';
import { ALL_PERMISSIONS, AppRole, Permission, ROLE_PERMISSIONS } from '@/lib/permissions';

const SYSTEM_SETTINGS_KEY = 'role_permissions_matrix';

function toMutableRolePermissions(source: Record<AppRole, readonly Permission[]>): Record<AppRole, Permission[]> {
    return {
        ADMIN: [...source.ADMIN],
        DIRECTOR: [...source.DIRECTOR],
        MANAGER: [...source.MANAGER],
        CONSULTANT: [...source.CONSULTANT],
    };
}

export const DEFAULT_ROLE_PERMISSIONS: Record<AppRole, Permission[]> = toMutableRolePermissions(ROLE_PERMISSIONS);

const ALL_PERMISSION_SET = new Set<Permission>(ALL_PERMISSIONS);

function normalizePermissions(raw: unknown): Permission[] {
    if (!Array.isArray(raw)) return [];

    const unique = new Set<Permission>();
    for (const value of raw) {
        if (typeof value !== 'string') continue;
        const permission = value as Permission;
        if (ALL_PERMISSION_SET.has(permission)) {
            unique.add(permission);
        }
    }

    return [...ALL_PERMISSIONS].filter((permission) => unique.has(permission));
}

function enforceRolePermissionConstraints(role: AppRole, permissions: Permission[]): Permission[] {
    if (role === 'MANAGER') {
        return permissions.filter((permission) => permission !== 'leads:read:all');
    }
    return permissions;
}

function normalizeMatrix(raw: unknown): Record<AppRole, Permission[]> {
    const matrix = toMutableRolePermissions(ROLE_PERMISSIONS);

    if (!raw || typeof raw !== 'object') {
        return matrix;
    }

    const source = raw as Partial<Record<AppRole, unknown>>;
    (Object.keys(matrix) as AppRole[]).forEach((role) => {
        if (source[role] !== undefined) {
            matrix[role] = enforceRolePermissionConstraints(role, normalizePermissions(source[role]));
        }
    });

    return matrix;
}

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
            return normalizeMatrix(setting.value);
        }
    } catch (error) {
        console.error('Failed to fetch permission matrix, using defaults', error);
    }

    return toMutableRolePermissions(ROLE_PERMISSIONS);
}

export async function updateRolePermissions(matrix: Record<AppRole, Permission[]>) {
    const normalized = normalizeMatrix(matrix);

    await prisma.systemSettings.upsert({
        where: { key: SYSTEM_SETTINGS_KEY },
        update: { value: normalized },
        create: {
            key: SYSTEM_SETTINGS_KEY,
            value: normalized,
        },
    });
}

export async function updateSingleRolePermissions(role: AppRole, permissions: Permission[]) {
    const currentMatrix = await getRolePermissions();
    const newMatrix = {
        ...currentMatrix,
        [role]: enforceRolePermissionConstraints(role, normalizePermissions(permissions)),
    };
    await updateRolePermissions(newMatrix);
}

export const PermissionService = {
    getRolePermissions,
    updateRolePermissions,
    updateSingleRolePermissions,
    DEFAULT_ROLE_PERMISSIONS,
    ALL_PERMISSIONS: [...ALL_PERMISSIONS],
    PERMISSIONS_BY_RESOURCE,
};
