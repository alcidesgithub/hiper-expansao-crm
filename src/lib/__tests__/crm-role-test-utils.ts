import { UserRole } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS } from '@/services/permissions-service';

export type RestoreFn = () => void;

type AuthHandler = typeof import('@/auth').auth;
type SetAuthHandler = (handler: AuthHandler) => void;
type ResetAuthHandler = () => void;

export const ROLE_USER_IDS: Readonly<Record<UserRole, string>> = {
    ADMIN: 'admin-1',
    DIRECTOR: 'director-1',
    MANAGER: 'manager-1',

    CONSULTANT: 'consultant-1',
};

export function sessionForRole(role: UserRole, id?: string): { user: { id: string; role: UserRole; permissions: string[] } } {
    return { user: { id: id || ROLE_USER_IDS[role], role, permissions: DEFAULT_ROLE_PERMISSIONS[role] } };
}

export function withAuthSession(
    setAuthHandler: SetAuthHandler,
    resetAuthHandler: ResetAuthHandler,
    session: unknown
): RestoreFn {
    setAuthHandler((async () => session) as unknown as AuthHandler);
    return () => resetAuthHandler();
}

export function mockMethod<T extends object, K extends keyof T>(obj: T, key: K, value: T[K]): RestoreFn {
    const original = obj[key];
    (obj as T)[key] = value;
    return () => {
        (obj as T)[key] = original;
    };
}

export function withRouteIdParam(id: string): { params: Promise<{ id: string }> } {
    return { params: Promise.resolve({ id }) };
}

export function buildLeadFixture(
    overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
    return {
        id: 'lead-1',
        name: 'Lead Teste',
        email: 'lead@empresa.com',
        phone: '11999999999',
        company: 'Empresa X',
        status: 'NEW',
        priority: 'MEDIUM',
        source: 'WEBSITE',
        createdAt: new Date('2026-02-12T12:00:00.000Z'),
        updatedAt: new Date('2026-02-12T12:00:00.000Z'),
        assignedUserId: 'consultant-1',
        pipelineStageId: 'stage-1',
        score: 80,
        grade: 'A',
        qualificationData: { gate0: 'decisor' },
        roiData: { viavel: true },
        ...overrides,
    };
}
