import { auth } from '@/auth';
import { NextResponse } from 'next/server';

type UserRole = 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'SDR' | 'CONSULTANT';

interface SessionUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
}

function isUserRole(role: unknown): role is UserRole {
    return role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER' || role === 'SDR' || role === 'CONSULTANT';
}

/**
 * Get authenticated session or return 401 response
 */
export async function requireAuth(): Promise<
    { session: { user: SessionUser }; error?: never } |
    { session?: never; error: NextResponse }
> {
    const session = await auth();
    if (!session?.user) {
        return {
            error: NextResponse.json(
                { error: 'Nao autorizado' },
                { status: 401 }
            ),
        };
    }

    const rawUser = session.user as Partial<SessionUser>;
    if (!rawUser.id || !rawUser.email || !rawUser.name || !isUserRole(rawUser.role)) {
        return {
            error: NextResponse.json(
                { error: 'Sessao invalida' },
                { status: 401 }
            ),
        };
    }

    return {
        session: {
            user: {
                id: rawUser.id,
                email: rawUser.email,
                name: rawUser.name,
                role: rawUser.role,
            },
        },
    };
}

/**
 * Check if user has one of the required roles
 */
export async function requireRole(...roles: UserRole[]): Promise<
    { session: { user: SessionUser }; error?: never } |
    { session?: never; error: NextResponse }
> {
    const result = await requireAuth();
    if (result.error) return result;

    const userRole = result.session.user.role;
    if (!roles.includes(userRole)) {
        return {
            error: NextResponse.json(
                { error: 'Sem permissao para esta acao' },
                { status: 403 }
            ),
        };
    }

    return result;
}
