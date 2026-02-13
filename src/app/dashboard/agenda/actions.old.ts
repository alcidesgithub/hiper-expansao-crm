'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { UserRole } from '@prisma/client';
import { buildLeadScope, mergeLeadWhere } from '@/lib/lead-scope';
import { can } from '@/lib/permissions';

function isPrivileged(role?: string): boolean {
    return role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER';
}

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

function parseLocalDateTime(date: string, time: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    if (!/^\d{2}:\d{2}$/.test(time)) return null;

    const [yearRaw, monthRaw, dayRaw] = date.split('-');
    const [hourRaw, minuteRaw] = time.split(':');
    const year = Number.parseInt(yearRaw, 10);
    const month = Number.parseInt(monthRaw, 10);
    const day = Number.parseInt(dayRaw, 10);
    const hour = Number.parseInt(hourRaw, 10);
    const minute = Number.parseInt(minuteRaw, 10);
    if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) return null;

    const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day ||
        parsed.getHours() !== hour ||
        parsed.getMinutes() !== minute
    ) {
        return null;
    }

    return parsed;
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

export async function getAgendaMeetings(startDate?: string, endDate?: string) {
    const session = await auth();
    if (!session) return [];
    const user = getSessionUser(session);
    if (!user?.id || !user.role) return [];
    const leadScope = await buildLeadScope(user);

    const where: Record<string, unknown> = {};
    if (startDate && endDate) {
        where.startTime = {
            gte: new Date(startDate),
            lte: new Date(endDate),
        };
    }

    const userId = user.id;
    const role = user.role;
    where.lead = { is: leadScope };

    if (!isPrivileged(role) && userId) {
        where.userId = userId;
    }

    const meetings = await prisma.meeting.findMany({
        where,
        orderBy: { startTime: 'asc' },
        include: {
            lead: {
                select: { id: true, name: true, company: true, grade: true, score: true },
            },
            user: {
                select: { id: true, name: true },
            },
        },
    });

    return meetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        status: meeting.status,
        meetingLink: meeting.teamsJoinUrl,
        provider: meeting.provider,
        selfScheduled: meeting.selfScheduled,
        lead: meeting.lead,
        user: meeting.user,
    }));
}

export async function getUpcomingAgendaMeetings(limit = 5) {
    const session = await auth();
    if (!session) return [];
    const user = getSessionUser(session);
    if (!user?.id || !user.role) return [];
    const leadScope = await buildLeadScope(user);

    const userId = user.id;
    const role = user.role;

    const where: Record<string, unknown> = {
        startTime: { gte: new Date() },
        status: { in: ['SCHEDULED', 'RESCHEDULED'] },
        lead: { is: leadScope },
    };

    if (!isPrivileged(role) && userId) {
        where.userId = userId;
    }

    const meetings = await prisma.meeting.findMany({
        where,
        orderBy: { startTime: 'asc' },
        take: limit,
        include: {
            lead: {
                select: { id: true, name: true, company: true, grade: true },
            },
            user: {
                select: { id: true, name: true },
            },
        },
    });

    return meetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        status: meeting.status,
        meetingLink: meeting.teamsJoinUrl,
        lead: meeting.lead,
        user: meeting.user,
    }));
}

export async function createMeetingFromAgenda(data: {
    leadId: string;
    type: string;
    date: string;
    startTime: string;
    duration: string;
    notes: string;
}) {
    const session = await auth();
    if (!session) throw new Error('Não autorizado');

    const user = getSessionUser(session);
    if (!user?.id || !user.role) throw new Error('Usuário inválido');
    if (!can(user, 'pipeline:advance')) throw new Error('Sem permissão para agendar');

    const userId = user.id;
    const leadScope = await buildLeadScope(user);

    const startTime = parseLocalDateTime(data.date, data.startTime);
    const durationMinutes = Number.parseInt(data.duration, 10);
    if (!startTime || Number.isNaN(startTime.getTime())) {
        throw new Error('Data/hora invalida');
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        throw new Error('Duracao invalida');
    }
    const durationMs = durationMinutes * 60 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);

    const scopedLead = await prisma.lead.findFirst({
        where: mergeLeadWhere({ id: data.leadId }, leadScope),
        select: { id: true },
    });
    if (!scopedLead) throw new Error('Lead não encontrado');

    const meeting = await prisma.meeting.create({
        data: {
            leadId: scopedLead.id,
            userId,
            title: `${data.type} - Reunião`,
            description: data.notes || null,
            startTime,
            endTime,
            status: 'SCHEDULED',
        },
    });

    const progression = await resolveMeetingProgression(scopedLead.id);
    await prisma.lead.update({
        where: { id: scopedLead.id },
        data: progression,
    });

    await prisma.activity.create({
        data: {
            leadId: scopedLead.id,
            type: 'MEETING',
            title: 'Reunião agendada via CRM',
            description: `${data.date} às ${data.startTime}`,
            userId,
        },
    });

    return { id: meeting.id, title: meeting.title };
}
