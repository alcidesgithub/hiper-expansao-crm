import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { meetingCreateSchema } from '@/lib/validation';
import { buildLeadScope, mergeLeadWhere } from '@/lib/lead-scope';
import { can } from '@/lib/permissions';
import { createTeamsMeeting, isTeamsConfigured } from '@/lib/teams';

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
    void isTeamsConfiguredHandler;
    void createTeamsMeetingHandler;
}

export function __resetTeamsHandlersForTests(): void {
    isTeamsConfiguredHandler = isTeamsConfigured;
    createTeamsMeetingHandler = createTeamsMeeting;
    void isTeamsConfiguredHandler;
    void createTeamsMeetingHandler;
}

function isPrivileged(role?: string): boolean {
    return role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER';
}

function parseLimit(value: string | null, fallback: number): number {
    const parsed = Number.parseInt(value || '', 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(Math.max(parsed, 1), 1000);
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
    const limit = parseLimit(searchParams.get('limit'), 300);

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
        } else {
            const now = new Date();
            where.startTime = {
                gte: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
                lte: new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()),
            };
        }

        const meetings = await prisma.meeting.findMany({
            where,
            select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
                leadId: true,
                description: true,
                meetingType: true,
                provider: true,
                teamsJoinUrl: true,
                status: true,
                selfScheduled: true,
                location: true,
                attendees: true,
                createdAt: true,
                updatedAt: true,
                completedAt: true,
                cancelledAt: true,
                lead: { select: { id: true, name: true, company: true, grade: true } },
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { startTime: 'asc' },
            take: limit,
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
                select: {
                    id: true,
                    title: true,
                    startTime: true,
                    endTime: true,
                    leadId: true,
                    description: true,
                    meetingType: true,
                    provider: true,
                    teamsJoinUrl: true,
                    status: true,
                    selfScheduled: true,
                    location: true,
                    attendees: true,
                    createdAt: true,
                    updatedAt: true,
                    completedAt: true,
                    cancelledAt: true,
                    lead: { select: { id: true, name: true, company: true, grade: true } },
                    user: { select: { id: true, name: true } },
                },
            });

            return NextResponse.json(fullMeeting, { status: 201 });
        } catch (error: unknown) {
            console.error('Error in scheduleMeeting:', error);
            const message = error instanceof Error ? error.message : 'Falha ao agendar reunião';
            return NextResponse.json({ error: message }, { status: 500 });
        }
    } catch (error) {
        console.error('Error creating meeting:', error);
        return NextResponse.json({ error: 'Erro ao criar reunião' }, { status: 500 });
    }
}
