import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rateLimit';
import { canAny } from '@/lib/permissions';

type GateChoice = 'DECISOR' | 'INFLUENCIADOR' | 'PESQUISADOR';
const GATE_CHOICES: readonly GateChoice[] = ['DECISOR', 'INFLUENCIADOR', 'PESQUISADOR'];

interface SessionUser {
    id?: string;
    role?: UserRole;
}

type AuthHandler = typeof auth;
let authHandler: AuthHandler = auth;

export function __setAuthHandlerForTests(handler: AuthHandler): void {
    authHandler = handler;
}

export function __resetAuthHandlerForTests(): void {
    authHandler = auth;
}

function getSessionUser(session: unknown): SessionUser | null {
    if (!session || typeof session !== 'object') return null;
    return (session as { user?: SessionUser }).user || null;
}

function normalizeGateChoice(value: unknown): GateChoice | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toUpperCase();
    if (GATE_CHOICES.includes(normalized as GateChoice)) {
        return normalized as GateChoice;
    }
    return null;
}

function normalizeSessionId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim();
    if (cleaned.length < 8 || cleaned.length > 120) return null;
    return cleaned;
}

function normalizeSource(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim().slice(0, 100);
    return cleaned || null;
}

function resolveDays(value: string | null): number {
    const parsed = Number.parseInt(value || '', 10);
    if (Number.isNaN(parsed)) return 30;
    return Math.min(Math.max(parsed, 1), 90);
}

function extractChoiceFromChanges(changes: unknown): GateChoice | null {
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return null;
    return normalizeGateChoice((changes as { choice?: unknown }).choice);
}

// POST /api/funnel/gate - persist gate choice for analytics
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const choice = normalizeGateChoice((body as { choice?: unknown }).choice);
        if (!choice) {
            return NextResponse.json({ error: 'Gate choice invalido' }, { status: 400 });
        }

        const sessionId = normalizeSessionId((body as { sessionId?: unknown }).sessionId) || randomUUID();
        const source = normalizeSource((body as { source?: unknown }).source) || 'funnel_gate';

        await logAudit({
            action: 'GATE_SELECT',
            entity: 'FunnelGate',
            entityId: sessionId,
            changes: {
                choice,
                source,
            },
            ipAddress: getClientIp(request),
            userAgent: request.headers.get('user-agent') || undefined,
        });

        return NextResponse.json({ success: true, sessionId });
    } catch (error) {
        console.error('Error recording funnel gate choice:', error);
        return NextResponse.json({ error: 'Erro ao registrar gate' }, { status: 500 });
    }
}

// GET /api/funnel/gate - gate analytics summary
export async function GET(request: Request) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    if (!canAny(user.role, ['dashboard:executive', 'dashboard:operational'])) {
        return NextResponse.json({ error: 'Sem permissao para visualizar analytics do gate' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = resolveDays(searchParams.get('days'));
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
        const events = await prisma.auditLog.findMany({
            where: {
                entity: 'FunnelGate',
                action: 'GATE_SELECT',
                createdAt: { gte: from },
            },
            select: {
                createdAt: true,
                changes: true,
            },
            orderBy: { createdAt: 'asc' },
            take: 5000,
        });

        const totals: Record<GateChoice, number> = {
            DECISOR: 0,
            INFLUENCIADOR: 0,
            PESQUISADOR: 0,
        };

        const byDayMap = new Map<string, Record<GateChoice, number>>();

        for (const event of events) {
            const choice = extractChoiceFromChanges(event.changes);
            if (!choice) continue;

            totals[choice] += 1;

            const dateKey = event.createdAt.toISOString().slice(0, 10);
            const day = byDayMap.get(dateKey) || {
                DECISOR: 0,
                INFLUENCIADOR: 0,
                PESQUISADOR: 0,
            };
            day[choice] += 1;
            byDayMap.set(dateKey, day);
        }

        const total = totals.DECISOR + totals.INFLUENCIADOR + totals.PESQUISADOR;
        const decisorRate = total > 0 ? Number(((totals.DECISOR / total) * 100).toFixed(2)) : 0;

        const byDay = Array.from(byDayMap.entries()).map(([date, counts]) => ({
            date,
            decisor: counts.DECISOR,
            influenciador: counts.INFLUENCIADOR,
            pesquisador: counts.PESQUISADOR,
            total: counts.DECISOR + counts.INFLUENCIADOR + counts.PESQUISADOR,
        }));

        return NextResponse.json({
            period: {
                days,
                from: from.toISOString(),
                to: new Date().toISOString(),
            },
            totals: {
                total,
                decisor: totals.DECISOR,
                influenciador: totals.INFLUENCIADOR,
                pesquisador: totals.PESQUISADOR,
                decisorRate,
            },
            byDay,
        });
    } catch (error) {
        console.error('Error loading gate analytics:', error);
        return NextResponse.json({ error: 'Erro ao carregar analytics do gate' }, { status: 500 });
    }
}
