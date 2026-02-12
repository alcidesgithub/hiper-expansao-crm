'use server';

import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { buildLeadScope, mergeLeadWhere } from '@/lib/lead-scope';
import { can } from '@/lib/permissions';

interface SessionUser {
    id?: string;
    role?: UserRole;
}

function getSessionUser(session: unknown): SessionUser | null {
    if (!session || typeof session !== 'object') return null;
    return (session as { user?: SessionUser }).user || null;
}

export async function getKanbanData() {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user?.id || !user.role) return [];

    const leadScope = await buildLeadScope(user);

    const stages = await prisma.pipelineStage.findMany({
        orderBy: { order: 'asc' },
        include: {
            leads: {
                where: leadScope,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    company: true,
                    score: true,
                    grade: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    meetings: {
                        where: { status: 'SCHEDULED', startTime: { gte: new Date() } },
                        orderBy: { startTime: 'asc' },
                        take: 1,
                        select: { startTime: true },
                    },
                },
            },
        },
    });

    return stages.map((stage) => {
        const isWin = stage.name.toLowerCase().includes('fechado') || stage.name.toLowerCase().includes('ganho');
        const isLoss = stage.name.toLowerCase().includes('sem fit') || stage.name.toLowerCase().includes('perdido');

        return {
            id: stage.id,
            title: stage.name,
            count: stage.leads.length,
            dotColor: stage.color ? `bg-[${stage.color}]` : (isWin ? 'bg-green-500' : isLoss ? 'bg-gray-400' : 'bg-yellow-400'),
            isWinColumn: isWin,
            isLossColumn: isLoss,
            cards: stage.leads.map((lead) => {
                const gradeClass = getGradeClass(lead.grade);
                const timeInStage = getTimeInStage(lead.updatedAt);
                const nextMeeting = lead.meetings[0]?.startTime;

                return {
                    id: lead.id,
                    name: lead.name,
                    company: lead.company || '',
                    score: lead.grade ? `${lead.score || 0} (${lead.grade})` : 'N/A',
                    scoreClass: gradeClass,
                    time: isWin || isLoss
                        ? lead.updatedAt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
                        : timeInStage,
                    initials: lead.name.substring(0, 2).toUpperCase(),
                    initialsBg: getInitialsBg(lead.grade),
                    isWin,
                    isLoss,
                    event: nextMeeting ? {
                        time: formatMeetingTime(nextMeeting),
                        type: isToday(nextMeeting) ? undefined : 'future' as const,
                    } : undefined,
                };
            }),
        };
    });
}

export async function moveLeadToStage(leadId: string, stageId: string) {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user?.id || !user.role) throw new Error('Não autorizado');
    if (!can(user.role, 'pipeline:advance')) throw new Error('Sem permissão para avançar pipeline');

    const leadScope = await buildLeadScope(user);
    const scopedLead = await prisma.lead.findFirst({
        where: mergeLeadWhere({ id: leadId }, leadScope),
        select: { id: true },
    });
    if (!scopedLead) throw new Error('Lead não encontrado');

    const stage = await prisma.pipelineStage.findUnique({
        where: { id: stageId },
        select: { isWon: true, isLost: true },
    });
    const now = new Date();

    await prisma.lead.update({
        where: { id: leadId },
        data: {
            pipelineStageId: stageId,
            ...(stage?.isWon ? { status: 'WON', convertedAt: now, lostAt: null } : {}),
            ...(stage?.isLost ? { status: 'LOST', lostAt: now, convertedAt: null } : {}),
        },
    });

    await prisma.activity.create({
        data: {
            leadId,
            type: 'STAGE_CHANGE',
            title: 'Lead movido no pipeline',
            description: `Movido para etapa ${stageId}`,
            userId: user.id,
        },
    });
}

function getGradeClass(grade: string | null): string {
    switch (grade) {
        case 'A': return 'bg-green-100 text-green-800';
        case 'B': return 'bg-yellow-100 text-yellow-800';
        case 'C': return 'bg-gray-100 text-gray-600';
        case 'D': return 'bg-orange-100 text-orange-700';
        case 'F': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-600';
    }
}

function getInitialsBg(grade: string | null): string {
    switch (grade) {
        case 'A': return 'bg-green-200 text-green-700';
        case 'B': return 'bg-yellow-200 text-yellow-700';
        default: return 'bg-gray-200 text-gray-500';
    }
}

function getTimeInStage(updatedAt: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - updatedAt.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d na etapa`;
    if (diffHours > 0) return `${diffHours}h na etapa`;
    return 'Agora';
}

function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function formatMeetingTime(date: Date): string {
    const now = new Date();
    if (isToday(date)) {
        return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
        return `Amanhã, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}
