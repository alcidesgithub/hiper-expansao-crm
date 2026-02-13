export type AppRole = 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'CONSULTANT';

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
    | 'availability:manage'
    | 'system:configure';

export interface PermissionUser {
    role?: string | null;
    permissions?: string[] | null;
}

export function isAppRole(role: string): role is AppRole {
    return role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER' || role === 'CONSULTANT';
}

export function can(user: PermissionUser | null | undefined, permission: Permission): boolean {
    if (!user) return false;

    // Check injected permissions first
    if (user.permissions && Array.isArray(user.permissions)) {
        return user.permissions.includes(permission);
    }

    // Fallback? Ideally we shouldn't fallback here if we want strict config.
    // But for safety during migration/errors, maybe?
    // No, if permissions are missing from session, access should be denied or we re-fetch (too slow).
    // Let's assume if permissions array is present, it is authoritative.
    // If it is missing (undefined), maybe fallback to role?
    // But we removed ROLE_PERMISSIONS constant from here. 
    // So we CANNOT fallback unless we import default permissions from service.
    // But importing service here might cause circular deps if service imports types from here.
    // Service imports AppRole, Permission from here.
    // So we can't import service here.

    return false;
}

export function canAny(user: PermissionUser | null | undefined, permissions: readonly Permission[]): boolean {
    return permissions.some((permission) => can(user, permission));
}

export function canAll(user: PermissionUser | null | undefined, permissions: readonly Permission[]): boolean {
    return permissions.every((permission) => can(user, permission));
}
