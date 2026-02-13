import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { buildLeadScope } from '@/lib/lead-scope';
import { buildLeadSelect } from '@/lib/lead-select';

interface SessionUser {
    id?: string;
    role?: UserRole;
    permissions?: string[];
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

// GET /api/pipeline - Get active pipeline stages with scoped lead counts
export async function GET() {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    try {
        const activePipeline = await prisma.pipeline.findFirst({
            where: { isActive: true },
            select: { id: true },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        });

        if (!activePipeline) {
            return NextResponse.json([]);
        }

        const leadScope = await buildLeadScope(user);

        const stages = await prisma.pipelineStage.findMany({
            where: { pipelineId: activePipeline.id },
            orderBy: { order: 'asc' },
            include: {
                leads: {
                    where: leadScope,
                    select: buildLeadSelect({ user, includeSensitive: true }),
                    orderBy: { updatedAt: 'desc' },
                },
            },
        });

        return NextResponse.json(
            stages.map((stage) => ({
                ...stage,
                _count: { leads: stage.leads.length },
            }))
        );
    } catch (error) {
        console.error('Error fetching pipeline:', error);
        return NextResponse.json({ error: 'Erro ao buscar pipeline' }, { status: 500 });
    }
}
