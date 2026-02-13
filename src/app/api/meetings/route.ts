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

        const provider = parsed.data.provider ?? 'teams';
        if (provider !== 'teams') {
            return NextResponse.json({ error: 'Provider de reunião inválido' }, { status: 400 });
        }
        if (!isTeamsConfiguredHandler()) {
            return NextResponse.json({ error: 'Integração com Teams não configurada' }, { status: 503 });
        }

        const organizer = await prisma.user.findUnique({
            where: { id: assignedUserId },
            select: { email: true },
        });
        if (!organizer?.email || !scopedLead.email) {
            return NextResponse.json({ error: 'Email do consultor ou lead inválido para Teams' }, { status: 400 });
        }

        let teamsMeeting: TeamsMeetingPayload;
        try {
            teamsMeeting = await createTeamsMeetingHandler({
                organizerEmail: organizer.email,
                leadEmail: scopedLead.email,
                leadName: scopedLead.name,
                subject: parsed.data.title,
                description: parsed.data.description || null,
                startTime: new Date(parsed.data.startTime),
                endTime: new Date(parsed.data.endTime),
            });
        } catch (error) {
            console.error('Error creating Teams meeting:', error);
            return NextResponse.json({ error: 'Falha ao criar reunião no Teams' }, { status: 502 });
        }

        const meeting = await prisma.meeting.create({
            data: {
                leadId: parsed.data.leadId,
                userId: assignedUserId,
                title: parsed.data.title,
                description: parsed.data.description || null,
                startTime: new Date(parsed.data.startTime),
                endTime: new Date(parsed.data.endTime),
                location: parsed.data.location || null,
                provider: teamsMeeting.provider,
                meetingLink: teamsMeeting.meetingLink,
                externalEventId: teamsMeeting.externalEventId,
                selfScheduled: parsed.data.selfScheduled,
                status: 'SCHEDULED',
            },
            include: {
                lead: { select: buildLeadSelect({ user, includeSensitive: true }) },
                user: { select: { id: true, name: true } },
            },
        });

        const progression = await resolveMeetingProgression(parsed.data.leadId);
        await prisma.lead.update({
            where: { id: parsed.data.leadId },
            data: progression,
        });

        await prisma.activity.create({
            data: {
                leadId: parsed.data.leadId,
                type: 'MEETING',
                title: 'Reunião agendada',
                description: `${parsed.data.title} - ${new Date(parsed.data.startTime).toLocaleDateString('pt-BR')}`,
                userId: sessionUserId,
            },
        });

        await logAudit({
            userId: sessionUserId,
            action: 'CREATE',
            entity: 'Meeting',
            entityId: meeting.id,
            changes: { leadId: parsed.data.leadId, startTime: parsed.data.startTime, userId: assignedUserId },
        });

        return NextResponse.json(meeting, { status: 201 });
    } catch (error) {
        console.error('Error creating meeting:', error);
        return NextResponse.json({ error: 'Erro ao criar reunião' }, { status: 500 });
    }
}

