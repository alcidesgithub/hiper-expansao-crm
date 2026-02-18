'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { headers } from 'next/headers';
import { getClientIpFromHeaders, rateLimit } from '@/lib/rateLimit';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    void prevState;

    try {
        const requestHeaders = await headers();
        const ip = getClientIpFromHeaders(new Headers(requestHeaders));
        const emailRaw = formData.get('email');
        const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : 'unknown';

        const [ipLimit, accountLimit] = await Promise.all([
            rateLimit(`auth:login:ip:${ip}`, { limit: 20, windowSec: 300 }),
            rateLimit(`auth:login:account:${email}`, { limit: 10, windowSec: 300 }),
        ]);

        if (!ipLimit.allowed || !accountLimit.allowed) {
            return 'Too many login attempts. Try again in a few minutes.';
        }

        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}
