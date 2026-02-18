export type AppRole = 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'CONSULTANT';

export type Permission =
    | 'leads:read:all'
    | 'leads:read:own'
    | 'leads:write:own'
    | 'leads:delete'
    | 'leads:assign'
    | 'leads:score:read'
    | 'pipeline:advance'
    | 'pipeline:configure'
    | 'pricing:read'
    | 'pricing:write'
    | 'users:manage'
    | 'dashboard:executive'
    | 'dashboard:operational'

    | 'integrations:manage'
    | 'audit:read'
    | 'availability:manage'
    | 'system:configure';

export interface PermissionUser {
    id?: string | null;
    role?: string | null;
    permissions?: string[] | null;
}

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
    ADMIN: [
        'leads:read:all',
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
        'leads:read:own',
        'leads:score:read',
        'pricing:read',
        'dashboard:executive',
        'dashboard:operational',
    ],
    MANAGER: [
        'leads:read:all',
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

export const ALL_PERMISSIONS: readonly Permission[] = [
    'leads:read:all',
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

export function getDefaultPermissionsForRole(role: string | null | undefined): readonly Permission[] {
    if (!role || !isAppRole(role)) return [];
    return ROLE_PERMISSIONS[role];
}

export function getLeadPermissions(user: PermissionUser | null | undefined, lead: unknown) {
    void lead;
    if (!user) return { canEditLead: false, canAdvancePipeline: false, canDeleteLead: false, canAssignLead: false };

    return {
        canEditLead: can(user, 'leads:write:own'),
        canAdvancePipeline: can(user, 'pipeline:advance'),
        canDeleteLead: can(user, 'leads:delete'),
        canAssignLead: can(user, 'leads:assign'),
    };
}

export function isAppRole(role: string): role is AppRole {
    return role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER' || role === 'CONSULTANT';
}

export function can(user: PermissionUser | null | undefined, permission: Permission): boolean {
    if (!user) return false;

    if (user.permissions && Array.isArray(user.permissions)) {
        return user.permissions.includes(permission);
    }

    return getDefaultPermissionsForRole(user.role).includes(permission);
}

export function canAny(user: PermissionUser | null | undefined, permissions: readonly Permission[]): boolean {
    return permissions.some((permission) => can(user, permission));
}

export function canAll(user: PermissionUser | null | undefined, permissions: readonly Permission[]): boolean {
    return permissions.every((permission) => can(user, permission));
}
