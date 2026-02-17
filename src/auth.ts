import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { getRolePermissions } from '@/services/permissions-service';
import { AppRole, getDefaultPermissionsForRole } from '@/lib/permissions';

async function getUser(email: string): Promise<User | null> {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        return user;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    // Backward-compatible secret resolution during env transition.
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) return null;

                    // Assuming passwords are hashed. If stored as plain text during dev, compare directly.
                    // But production should always be hashed.
                    const passwordsMatch = await bcrypt.compare(password, user.password);

                    if (passwordsMatch) return user;
                }
                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                console.log('[Auth JWT] Initial sign in for user:', { email: user.email, role: token.role });
            }

            // Aggressively fetch/sync permissions if role exists
            if (token.role) {
                try {
                    const allPermissions = await getRolePermissions();
                    const role = token.role as AppRole;
                    token.permissions = (allPermissions[role] || []) as string[];
                    // console.log('[Auth JWT] Aggressive sync for role:', role, 'count:', token.permissions.length);
                } catch (error) {
                    console.error('[Auth JWT] Failed to sync permissions:', error);
                }
            }
            if (!Array.isArray(token.permissions)) {
                token.permissions = [...getDefaultPermissionsForRole(token.role as string)];
            }

            // Update session trigger
            if (trigger === "update") {
                if (session?.user?.permissions) {
                    token.permissions = session.user.permissions;
                } else if (session?.permissions) {
                    token.permissions = session.permissions;
                }
                if (session?.user?.role) {
                    token.role = session.user.role;
                }
                console.log('[Auth JWT] Update trigger. New role:', token.role, 'Perm count:', (token.permissions as string[])?.length);
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
