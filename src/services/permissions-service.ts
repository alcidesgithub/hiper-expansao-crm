import { prisma } from '@/lib/prisma';
import { ALL_PERMISSIONS, AppRole, Permission, ROLE_PERMISSIONS } from '@/lib/permissions';

const SYSTEM_SETTINGS_KEY = 'role_permissions_matrix';
const PERMISSIONS_CACHE_TTL_MS = Number(process.env.ROLE_PERMISSIONS_CACHE_TTL_MS ?? '60000');

let cachedPermissionsMatrix: { value: Record<AppRole, Permission[]>; expiresAt: number } | null = null;

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
    void role;
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

function cloneMatrix(matrix: Record<AppRole, Permission[]>): Record<AppRole, Permission[]> {
    return {
        ADMIN: [...matrix.ADMIN],
        DIRECTOR: [...matrix.DIRECTOR],
        MANAGER: [...matrix.MANAGER],
        CONSULTANT: [...matrix.CONSULTANT],
    };
}

function readPermissionsCache(): Record<AppRole, Permission[]> | null {
    if (!cachedPermissionsMatrix) return null;
    if (Date.now() > cachedPermissionsMatrix.expiresAt) {
        cachedPermissionsMatrix = null;
        return null;
    }
    return cloneMatrix(cachedPermissionsMatrix.value);
}

function writePermissionsCache(value: Record<AppRole, Permission[]>): void {
    cachedPermissionsMatrix = {
        value: cloneMatrix(value),
        expiresAt: Date.now() + PERMISSIONS_CACHE_TTL_MS,
    };
}

function clearPermissionsCache(): void {
    cachedPermissionsMatrix = null;
}

export const PERMISSIONS_BY_RESOURCE: Record<string, Permission[]> = {
    'Gestão de Leads': [
        'leads:read:all',
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
    'Usuarios e Disponibilidade': [
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
    const cached = readPermissionsCache();
    if (cached) return cached;

    try {
        const setting = await prisma.systemSettings.findUnique({
            where: { key: SYSTEM_SETTINGS_KEY },
        });

        if (setting?.value) {
            const normalized = normalizeMatrix(setting.value);
            writePermissionsCache(normalized);
            return cloneMatrix(normalized);
        }
    } catch (error) {
        console.error('Failed to fetch permission matrix, using defaults', error);
    }

    const defaults = toMutableRolePermissions(ROLE_PERMISSIONS);
    writePermissionsCache(defaults);
    return cloneMatrix(defaults);
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

    clearPermissionsCache();
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
