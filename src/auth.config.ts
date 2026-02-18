import type { NextAuthConfig } from 'next-auth';
import { can, canAny, getDefaultPermissionsForRole } from '@/lib/permissions';

type TokenUser = { id?: string; role?: string; permissions?: string[] };
type SessionUser = { id?: string; role?: string; permissions?: string[] };

function canAccessDashboardPath(pathname: string, user: SessionUser): boolean {
    const scopedUser: SessionUser = {
        ...user,
        permissions: Array.isArray(user.permissions)
            ? user.permissions
            : [...getDefaultPermissionsForRole(user.role)],
    };

    if (pathname === '/dashboard') {
        return canAny(scopedUser, ['dashboard:operational', 'dashboard:executive']);
    }
    if (pathname.startsWith('/dashboard/usuarios')) return can(scopedUser, 'users:manage');
    if (pathname.startsWith('/dashboard/config')) return can(scopedUser, 'system:configure');
    if (pathname.startsWith('/dashboard/admin/settings/permissions')) return can(scopedUser, 'system:configure');
    if (pathname.startsWith('/dashboard/pricing')) return can(scopedUser, 'pricing:read');
    if (pathname.startsWith('/dashboard/relatorios')) {
        return canAny(scopedUser, ['dashboard:operational', 'dashboard:executive']);
    }
    if (pathname.startsWith('/dashboard/disponibilidade')) return can(scopedUser, 'availability:manage');
    if (pathname.startsWith('/dashboard/leads')) {
        return canAny(scopedUser, ['leads:read:own', 'leads:read:team', 'leads:read:all']);
    }

    return true;
}

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
            if (isOnDashboard) {
                if (!isLoggedIn) return false;

                const user = auth?.user as SessionUser | undefined;
                if (!user || !user.role) return false;

                if (!canAccessDashboardPath(nextUrl.pathname, user)) {
                    // Prevent redirect loop if already on fallback
                    if (nextUrl.pathname === '/dashboard/leads' || nextUrl.pathname === '/dashboard') {
                        return true;
                    }
                    return Response.redirect(new URL('/dashboard/leads', nextUrl));
                }

                return true;
            } else if (isLoggedIn) {
                if (nextUrl.pathname === '/login') {
                    return Response.redirect(new URL('/dashboard', nextUrl));
                }
            }
            return true;
        },
        jwt({ token, user }) {
            if (user) {
                const tokenUser = user as TokenUser;
                token.id = tokenUser.id;
                token.role = tokenUser.role;
                if (Array.isArray(tokenUser.permissions)) {
                    token.permissions = tokenUser.permissions;
                }
            }

            if (!Array.isArray(token.permissions)) {
                token.permissions = [...getDefaultPermissionsForRole(token.role as string)];
            }

            return token;
        },
        session({ session, token }) {
            if (session.user) {
                const sessionUser = session.user as SessionUser;
                sessionUser.id = token.id as string;
                sessionUser.role = token.role as string;
                sessionUser.permissions = Array.isArray(token.permissions)
                    ? (token.permissions as string[])
                    : [...getDefaultPermissionsForRole(token.role as string)];
            }
            return session;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
