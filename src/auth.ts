import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { getRolePermissions } from '@/services/permissions-service';
import { AppRole, Permission } from '@/lib/permissions';

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

                // Fetch permissions
                if (token.role) {
                    const allPermissions = await getRolePermissions();
                    const role = token.role as AppRole;
                    // Safely get permissions for the role
                    // Type assertion because we know the service returns Permission[]
                    token.permissions = (allPermissions[role] || []) as string[];
                }
            }

            // Update session trigger
            if (trigger === "update" && session?.permissions) {
                token.permissions = session.permissions;
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.permissions = (token.permissions as string[]) || [];
            }
            return session;
        },
    },
});
