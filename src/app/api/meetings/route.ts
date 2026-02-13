import { NextResponse } from 'next/server';
import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { meetingCreateSchema } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
import { buildLeadScope, mergeLeadWhere } from '@/lib/lead-scope';
import { can } from '@/lib/permissions';
import { createTeamsMeeting, isTeamsConfigured, type TeamsMeetingPayload } from '@/lib/teams';
import { buildLeadSelect } from '@/lib/lead-select';
const MEETING_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'] as const;

interface SessionUser {
    id?: string;
    role?: string;
    permissions?: string[];
}

function getSessionUser(session: unknown): SessionUser | null {
    if (!session || typeof session !== 'object') return null;
    const user = (session as { user?: SessionUser }).user;
    if (!user) return null;
    return {
        id: user.id,
        role: user.role,
        permissions: user.permissions
    };
}

type AuthHandler = typeof auth;
let authHandler: AuthHandler = auth;
type IsTeamsConfiguredHandler = typeof isTeamsConfigured;
type CreateTeamsMeetingHandler = typeof createTeamsMeeting;
let isTeamsConfiguredHandler: IsTeamsConfiguredHandler = isTeamsConfigured;
let createTeamsMeetingHandler: CreateTeamsMeetingHandler = createTeamsMeeting;

export function __setAuthHandlerForTests(handler: AuthHandler): void {
    authHandler = handler;
}

export function __resetAuthHandlerForTests(): void {
    authHandler = auth;
}

export function __setTeamsHandlersForTests(handlers: {
    isTeamsConfigured?: IsTeamsConfiguredHandler;
    createTeamsMeeting?: CreateTeamsMeetingHandler;
}): void {
    if (handlers.isTeamsConfigured) isTeamsConfiguredHandler = handlers.isTeamsConfigured;
    if (handlers.createTeamsMeeting) createTeamsMeetingHandler = handlers.createTeamsMeeting;
}

export function __resetTeamsHandlersForTests(): void {
    isTeamsConfiguredHandler = isTeamsConfigured;
    createTeamsMeetingHandler = createTeamsMeeting;
}

function isPrivileged(role?: string): boolean {
    return role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER';
}

async function resolveMeetingProgression(leadId: string) {
    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
            pipelineStageId: true,
            pipelineStage: { select: { pipelineId: true, order: true } },
        },
    });

    let nextStageId = lead?.pipelineStageId ?? null;
    if (lead?.pipelineStage?.pipelineId) {
        const nextStage = await prisma.pipelineStage.findFirst({
            where: {
                pipelineId: lead.pipelineStage.pipelineId,
                order: { gt: lead.pipelineStage.order },
                isWon: false,
                isLost: false,
            },
            orderBy: { order: 'asc' },
            select: { id: true },
        });
        if (nextStage) nextStageId = nextStage.id;
    }

    return {
        status: 'CONTACTED' as const,
        pipelineStageId: nextStageId,
    };
}

// GET /api/meetings - List meetings
export async function GET(request: Request) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const sessionUserId = user.id;
    const sessionRole = user.role;
    if (!sessionUserId || !sessionRole) {
        return NextResponse.json({ error: 'Usuário inválido' }, { status: 401 });
    }

    try {
        const leadScope = await buildLeadScope(user);
        const where: Prisma.MeetingWhereInput = {
            lead: { is: leadScope },
        };

        if (status && MEETING_STATUSES.includes(status as (typeof MEETING_STATUSES)[number])) {
            where.status = status as (typeof MEETING_STATUSES)[number];
        } else {
            where.status = { not: 'CANCELLED' };
        }

        if (isPrivileged(sessionRole)) {
            if (userId) where.userId = userId;
        } else {
            where.userId = sessionUserId;
        }

        if (from || to) {
            where.startTime = {};
            if (from) (where.startTime as Prisma.DateTimeFilter).gte = new Date(from);
            if (to) (where.startTime as Prisma.DateTimeFilter).lte = new Date(to);
        }

        const meetings = await prisma.meeting.findMany({
            where,
            include: {
                lead: { select: buildLeadSelect({ user, includeSensitive: true }) },
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { startTime: 'asc' },
        });

        return NextResponse.json(meetings);
    } catch (error) {
        console.error('Error fetching meetings:', error);
        return NextResponse.json({ error: 'Erro ao buscar reuniões' }, { status: 500 });
    }
}

// POST /api/meetings - Create a new meeting
export async function POST(request: Request) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const sessionUserId = user.id;
    const sessionRole = user.role;
    if (!sessionUserId || !sessionRole) return NextResponse.json({ error: 'Usuário inválido' }, { status: 401 });
    if (!can(user, 'pipeline:advance')) {
        return NextResponse.json({ error: 'Sem permissão para agendar reuniões' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const parsed = meetingCreateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const leadScope = await buildLeadScope(user);
        const scopedLead = await prisma.lead.findFirst({
            where: mergeLeadWhere({ id: parsed.data.leadId }, leadScope),
            select: { id: true, name: true, email: true },
        });
        if (!scopedLead) {
            return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
        }

        const assignedUserId = isPrivileged(sessionRole)
            ? parsed.data.userId
            : sessionUserId;

        // Versão Revisada v1.0 - Usando MeetingService
        const { meetingService } = await import('@/lib/services/meeting.service');

        try {
            const { meeting } = await meetingService.scheduleMeeting({
                leadId: parsed.data.leadId,
                consultantId: assignedUserId,
                scheduledAt: new Date(parsed.data.startTime),
                duration: Math.round((new Date(parsed.data.endTime).getTime() - new Date(parsed.data.startTime).getTime()) / 60000),
                title: parsed.data.title,
                leadNotes: parsed.data.description || undefined,
            });

            // O meetingService já cria o meeting, atualiza o lead, faz o audit e manda email.
            // Aqui apenas retornamos a reunião criada com o include necessário para o frontend.
            const fullMeeting = await prisma.meeting.findUnique({
                where: { id: meeting.id },
                include: {
                    lead: { select: buildLeadSelect({ user, includeSensitive: true }) },
                    user: { select: { id: true, name: true } },
                },
            });

            return NextResponse.json(fullMeeting, { status: 201 });
        } catch (error: any) {
            console.error('Error in scheduleMeeting:', error);
            return NextResponse.json({ error: error.message || 'Falha ao agendar reunião' }, { status: 500 });
        }
    } catch (error) {
        console.error('Error creating meeting:', error);
        return NextResponse.json({ error: 'Erro ao criar reunião' }, { status: 500 });
    }
}

