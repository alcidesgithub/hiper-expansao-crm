import type { NextAuthConfig } from 'next-auth';

type AppRole = 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'SDR' | 'CONSULTANT';
type TokenUser = { id?: string; role?: string };
type SessionUser = { id?: string; role?: string };

function isAppRole(role: string | undefined): role is AppRole {
    return role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER' || role === 'SDR' || role === 'CONSULTANT';
}

function canAccessDashboardPath(pathname: string, role: AppRole): boolean {
    if (pathname === '/dashboard') {
        return role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER' || role === 'SDR';
    }
    if (pathname.startsWith('/dashboard/usuarios')) return role === 'ADMIN';
    if (pathname.startsWith('/dashboard/config')) return role === 'ADMIN';
    if (pathname.startsWith('/dashboard/pricing')) return role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER';
    if (pathname.startsWith('/dashboard/relatorios')) return role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER';
    if (pathname.startsWith('/dashboard/disponibilidade')) return role === 'ADMIN' || role === 'SDR' || role === 'CONSULTANT';
    if (pathname.startsWith('/dashboard/leads')) return true;
    if (pathname.startsWith('/dashboard/agenda')) return true;
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

                const role = (auth?.user as { role?: string } | undefined)?.role;
                if (!isAppRole(role)) return false;

                if (!canAccessDashboardPath(nextUrl.pathname, role)) {
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
