import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req: NextRequest & { auth?: any }) => {
    // A requisição interceptada pelo auth não deve impedir o fluxo normal do app se já estiver autorizada
    // O auth já rodou as regras de authorized do auth.config.ts
    const res = NextResponse.next();

    // Adicionando Security Headers Básicos
    res.headers.set('X-DNS-Prefetch-Control', 'on');
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.headers.set('X-XSS-Protection', '1; mode=block');
    res.headers.set('X-Frame-Options', 'SAMEORIGIN');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'origin-when-cross-origin');

    return res;
});

export const config = {
    // Proteger e rodar o middleware em todas as rotas, exceto de arquivos estáticos, imagens e da API base
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$|.*\\.webp$|.*\\.ico$).*)'],
};
