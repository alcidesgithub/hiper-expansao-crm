export type AppRole = 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'SDR' | 'CONSULTANT';

export type Permission =
    | 'leads:read:all'
    | 'leads:read:team'
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
    | 'dashboard:sdr'
    | 'integrations:manage'
    | 'audit:read'
    | 'availability:manage';

const ROLE_PERMISSIONS: Readonly<Record<AppRole, readonly Permission[]>> = {
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
        'dashboard:executive',
        'dashboard:operational',
        'dashboard:sdr',
        'integrations:manage',
        'audit:read',
        'availability:manage',
    ],
    DIRECTOR: [
        'leads:read:all',
        'leads:score:read',
        'pricing:read',
        'dashboard:executive',
        'dashboard:operational',
    ],
    MANAGER: [
        'leads:read:team',
        'leads:read:own',
        'leads:write:own',
        'leads:assign',
        'leads:score:read',
        'pipeline:advance',
        'pricing:read',
        'dashboard:operational',
        'dashboard:sdr',
    ],
    SDR: [
        'leads:read:own',
        'leads:write:own',
        'leads:score:read',
        'pipeline:advance',
        'dashboard:sdr',
        'availability:manage',
    ],
    CONSULTANT: [
        'leads:read:own',
        'leads:write:own',
        'leads:score:read',
        'availability:manage',
    ],
};

function isAppRole(role: string): role is AppRole {
    return role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER' || role === 'SDR' || role === 'CONSULTANT';
}

export function can(role: string | null | undefined, permission: Permission): boolean {
    if (!role || !isAppRole(role)) return false;
    return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAny(role: string | null | undefined, permissions: readonly Permission[]): boolean {
    return permissions.some((permission) => can(role, permission));
}

export function canAll(role: string | null | undefined, permissions: readonly Permission[]): boolean {
    return permissions.every((permission) => can(role, permission));
}
