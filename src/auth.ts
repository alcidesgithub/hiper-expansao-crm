import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { getRolePermissions } from '@/services/permissions-service';
import { AppRole, getDefaultPermissionsForRole } from '@/lib/permissions';
import { rateLimit } from '@/lib/rateLimit';

async function getUser(email: string): Promise<User | null> {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        return user;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

async function syncTokenRoleAndPermissions(token: {
    id?: unknown;
    role?: unknown;
    permissions?: unknown;
    exp?: number;
    permissionsSyncedAt?: unknown;
}): Promise<void> {
    if (typeof token.id !== 'string' || !token.id) return;

    const nowSec = Math.floor(Date.now() / 1000);
    const lastSyncSec = typeof token.permissionsSyncedAt === 'number' ? token.permissionsSyncedAt : 0;
    const hasCachedRole = typeof token.role === 'string' && token.role.length > 0;
    const hasCachedPermissions = Array.isArray(token.permissions);

    // Avoid hitting the database on every request for active sessions.
    if (hasCachedRole && hasCachedPermissions && nowSec - lastSyncSec < 300) {
        return;
    }

    const dbUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: { id: true, role: true, status: true },
    });

    if (!dbUser || dbUser.status !== 'ACTIVE') {
        // Invalidate JWT for disabled/deleted users.
        token.exp = 0;
        token.id = undefined;
        token.role = undefined;
        token.permissions = [];
        token.permissionsSyncedAt = nowSec;
        return;
    }

    token.role = dbUser.role;

    try {
        const allPermissions = await getRolePermissions();
        const role = dbUser.role as AppRole;
        token.permissions = (allPermissions[role] || []) as string[];
    } catch (error) {
        console.error('[Auth JWT] Failed to sync permissions:', error);
        token.permissions = [...getDefaultPermissionsForRole(dbUser.role)];
    }

    token.permissionsSyncedAt = nowSec;
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    // Backward-compatible secret resolution during env transition.
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(12) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const email = parsedCredentials.data.email.trim().toLowerCase();
                    const { password } = parsedCredentials.data;

                    const accountRateLimit = await rateLimit(`auth:login:account:${email}`, { limit: 10, windowSec: 300 });
                    if (!accountRateLimit.allowed) return null;

                    const user = await getUser(email);
                    if (!user) return null;
                    if (user.status !== 'ACTIVE') return null;

                    // Assuming passwords are hashed. If stored as plain text during dev, compare directly.
                    // But production should always be hashed.
                    const passwordsMatch = await bcrypt.compare(password, user.password);

                    if (passwordsMatch) return user;
                }
                return null;
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user, trigger }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
            }

            // Ignore role/permission fields from session.update payload and always sync from DB.
            if (trigger === 'update') {
                // no-op by design
            }

            await syncTokenRoleAndPermissions(token);

            if (!Array.isArray(token.permissions)) {
                token.permissions = [...getDefaultPermissionsForRole(token.role as string)];
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.permissions = Array.isArray(token.permissions)
                    ? (token.permissions as string[])
                    : [...getDefaultPermissionsForRole(token.role as string)];
            }
            return session;
        },
    },
});
