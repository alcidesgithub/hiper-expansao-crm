import type { NextAuthConfig } from 'next-auth';

type AppRole = 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'CONSULTANT';
type TokenUser = { id?: string; role?: string };
type SessionUser = { id?: string; role?: string; permissions?: string[] };

function canAccessDashboardPath(pathname: string, user: SessionUser): boolean {
    const permissions = user.permissions || [];
    const role = user.role as AppRole;

    if (pathname === '/dashboard') {
        return permissions.includes('dashboard:operational') || permissions.includes('dashboard:executive') || role === 'ADMIN';
    }
    if (pathname.startsWith('/dashboard/usuarios')) return permissions.includes('users:manage');
    if (pathname.startsWith('/dashboard/config')) return permissions.includes('system:configure');
    if (pathname.startsWith('/dashboard/pricing')) return permissions.includes('pricing:read');
    if (pathname.startsWith('/dashboard/relatorios')) {
        return permissions.includes('dashboard:operational') || permissions.includes('dashboard:executive');
    }
    if (pathname.startsWith('/dashboard/disponibilidade')) return permissions.includes('availability:manage');
    if (pathname.startsWith('/dashboard/leads')) return permissions.includes('leads:read:own') || permissions.includes('leads:read:team') || permissions.includes('leads:read:all');

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
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                const sessionUser = session.user as SessionUser;
                sessionUser.id = token.id as string;
                sessionUser.role = token.role as string;
            }
            return session;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
