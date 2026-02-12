import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { hasLeadAccess } from '@/lib/lead-scope';

interface SessionUser {
    id?: string;
    role?: UserRole;
}

function getSessionUser(session: unknown): SessionUser | null {
    if (!session || typeof session !== 'object') return null;
    return (session as { user?: SessionUser }).user || null;
}

type AuthHandler = typeof auth;
let authHandler: AuthHandler = auth;

export function __setAuthHandlerForTests(handler: AuthHandler): void {
    authHandler = handler;
}

export function __resetAuthHandlerForTests(): void {
    authHandler = auth;
}

// GET /api/leads/[id]/activities - Get activity timeline for a lead
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const canAccess = await hasLeadAccess(id, user);
    if (!canAccess) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    try {
        const activities = await prisma.activity.findMany({
            where: { leadId: id },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
            take: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
        });
        return NextResponse.json(activities);
    } catch (error) {
        console.error('Error fetching activities:', error);
        return NextResponse.json({ error: 'Erro ao buscar atividades' }, { status: 500 });
    }
}
