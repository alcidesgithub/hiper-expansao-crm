'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

import { Prisma, LeadSource, UserRole } from '@prisma/client';
import { buildLeadScope, mergeLeadWhere } from '@/lib/lead-scope';
import { can, canAny } from '@/lib/permissions';
import { cancelTeamsMeeting, createTeamsMeeting, isTeamsConfigured, type TeamsMeetingPayload } from '@/lib/teams';

interface CreateLeadInput {
    name: string;
    email: string;
    whatsapp: string;
    pharmacyName?: string;
    role?: string;
    source?: LeadSource | string;
    stores?: Prisma.InputJsonValue;
    revenue?: Prisma.InputJsonValue;
    state?: Prisma.InputJsonValue;
}

interface CreateMeetingInput {
    type: string;
    notes?: string;
    date: string;
    startTime: string;
    duration: string;
    leadId: string;
    autoLink?: boolean;
}

const VALID_LEAD_SOURCES: readonly LeadSource[] = [
    'WEBSITE',
    'FACEBOOK',
    'INSTAGRAM',
    'GOOGLE_ADS',
    'LINKEDIN',
    'EMAIL',
    'PHONE',
    'REFERRAL',
    'EVENT',
    'OTHER',
];

function normalizeLeadSource(value: LeadSource | string | undefined): LeadSource {
    return value && VALID_LEAD_SOURCES.includes(value as LeadSource) ? (value as LeadSource) : 'OTHER';
}

function isPrivileged(role?: string): boolean {
    return role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER';
}

interface SessionUser {
    id?: string;
    role?: UserRole;
}

function getSessionUser(session: unknown): SessionUser | null {
    if (!session || typeof session !== 'object') return null;
    return (session as { user?: SessionUser }).user || null;
}

async function getLeadContext() {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user?.id || !user.role) return null;
    const leadScope = await buildLeadScope(user);
    return { session, user, leadScope };
}

function scopedLeadWhere(
    leadScope: Prisma.LeadWhereInput,
    baseWhere?: Prisma.LeadWhereInput
) {
    return mergeLeadWhere(baseWhere || {}, leadScope);
}

export async function getDashboardMetrics(period?: string) {
    const context = await getLeadContext();
    if (!context) {
        return {
            totalLeads: 0,
            qualifiedLeads: 0,
            convertedLeads: 0,
            conversionRate: 0,
            totalMeetings: 0,
            upcomingMeetings: 0,
            gradeDistribution: [],
            sourceDistribution: [],
        };
    }

    const dateFilter = getDateFilter(period);

    const createdAtFilter = dateFilter ? { createdAt: dateFilter } : {};

    const [
        totalLeads,
        qualifiedLeads,
        convertedLeads,
        totalMeetings,
        upcomingMeetings,
        gradeDistribution,
        sourceDistribution,
    ] = await Promise.all([
        prisma.lead.count({ where: scopedLeadWhere(context.leadScope, createdAtFilter) }),
        prisma.lead.count({ where: scopedLeadWhere(context.leadScope, { ...createdAtFilter, status: 'QUALIFIED' }) }),
        prisma.lead.count({ where: scopedLeadWhere(context.leadScope, { ...createdAtFilter, status: 'WON' }) }),
        prisma.meeting.count({
            where: {
                ...(dateFilter ? { createdAt: dateFilter } : {}),
                lead: { is: context.leadScope },
            },
        }),
        prisma.meeting.count({
            where: {
                startTime: { gte: new Date() },
                status: 'SCHEDULED',
                lead: { is: context.leadScope },
            },
        }),
        prisma.lead.groupBy({
            by: ['grade'],
            _count: true,
            where: scopedLeadWhere(context.leadScope, { ...createdAtFilter, grade: { not: null } }),
        }),
        prisma.lead.groupBy({
            by: ['source'],
            _count: true,
            where: scopedLeadWhere(context.leadScope, createdAtFilter),
        }),
    ]);

    const conversionRate = totalLeads > 0
        ? Math.round((convertedLeads / totalLeads) * 100)
        : 0;

    return {
        totalLeads,
        qualifiedLeads,
        convertedLeads,
        conversionRate,
        totalMeetings,
        upcomingMeetings,
        gradeDistribution: gradeDistribution.map(g => ({
            grade: g.grade || 'N/A',
            count: g._count,
        })),
        sourceDistribution: sourceDistribution.map(s => ({
            source: s.source || 'N/A',
            count: s._count,
        })),
    };
}

export async function getRecentLeads(limit = 10) {
    const context = await getLeadContext();
    if (!context) return [];

    const leads = await prisma.lead.findMany({
        where: context.leadScope,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            id: true,
            name: true,
            email: true,
            company: true,
            grade: true,
            score: true,
            status: true,
            source: true,
            priority: true,
            createdAt: true,
            pipelineStage: { select: { name: true, color: true } },
        },
    });
    return leads;
}

export async function getFunnelMetrics(period?: string) {
    const context = await getLeadContext();
    if (!context) {
        return {
            funnel: [
                { step: 'Identificação', count: 0 },
                { step: 'Perfil', count: 0 },
                { step: 'Desafios', count: 0 },
                { step: 'Urgência', count: 0 },
                { step: 'Investimento', count: 0 },
                { step: 'Qualificado', count: 0 },
            ],
            dropoffRate: 0,
        };
    }

    const dateFilter = getDateFilter(period);
    const createdAtFilter = dateFilter ? { createdAt: dateFilter } : {};

    const [step1, step2, step3, step4, step5, completed] = await Promise.all([
        prisma.lead.count({ where: scopedLeadWhere(context.leadScope, createdAtFilter) }),
        prisma.lead.count({ where: scopedLeadWhere(context.leadScope, { ...createdAtFilter, qualificationData: { path: ['step2CompletedAt'], not: Prisma.DbNull } }) }),
        prisma.lead.count({ where: scopedLeadWhere(context.leadScope, { ...createdAtFilter, qualificationData: { path: ['step3CompletedAt'], not: Prisma.DbNull } }) }),
        prisma.lead.count({ where: scopedLeadWhere(context.leadScope, { ...createdAtFilter, qualificationData: { path: ['step4CompletedAt'], not: Prisma.DbNull } }) }),
        prisma.lead.count({ where: scopedLeadWhere(context.leadScope, { ...createdAtFilter, qualificationData: { path: ['step5CompletedAt'], not: Prisma.DbNull } }) }),
        prisma.lead.count({ where: scopedLeadWhere(context.leadScope, { ...createdAtFilter, grade: { not: null } }) }),
    ]);

    return {
        funnel: [
            { step: 'Identificação', count: step1 },
            { step: 'Perfil', count: step2 },
            { step: 'Desafios', count: step3 },
            { step: 'Urgência', count: step4 },
            { step: 'Investimento', count: step5 },
            { step: 'Qualificado', count: completed },
        ],
        dropoffRate: step1 > 0 ? Math.round(((step1 - completed) / step1) * 100) : 0,
    };
}

export async function getUpcomingMeetings(limit = 5) {
    const context = await getLeadContext();
    if (!context) return [];

    const role = context.user.role;
    const meetings = await prisma.meeting.findMany({
        where: {
            startTime: { gte: new Date() },
            status: 'SCHEDULED',
            lead: { is: context.leadScope },
            ...(isPrivileged(role) ? {} : { userId: context.user.id }),
        },
        orderBy: { startTime: 'asc' },
        take: limit,
        include: {
            lead: { select: { id: true, name: true, company: true, grade: true } },
            user: { select: { id: true, name: true } },
        },
    });
    return meetings;
}

export async function getSourceDistribution(period?: string) {
    const context = await getLeadContext();
    if (!context) return [];

    const dateFilter = getDateFilter(period);

    const distribution = await prisma.lead.groupBy({
        by: ['source'],
        _count: true,
        where: scopedLeadWhere(context.leadScope, dateFilter ? { createdAt: dateFilter } : {}),
        orderBy: { _count: { source: 'desc' } },
    });

    return distribution.map(d => ({
        source: formatSourceLabel(d.source || 'OTHER'),
        count: d._count,
    }));
}

// ==========================================
// Helpers
// ==========================================

function getDateFilter(period?: string) {
    if (!period) return undefined;
    const now = new Date();
    if (period === '12m') {
        const start = new Date(now);
        start.setMonth(start.getMonth() - 12);
        return { gte: start };
    }
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 0;
    if (days === 0) return undefined;
    return { gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000) };
}

type GateChoice = 'DECISOR' | 'INFLUENCIADOR' | 'PESQUISADOR';

interface FunnelGateAnalytics {
    totals: {
        total: number;
        decisor: number;
        influenciador: number;
        pesquisador: number;
        decisorRate: number;
    };
    byDay: Array<{
        date: string;
        decisor: number;
        influenciador: number;
        pesquisador: number;
        total: number;
    }>;
}

function normalizeGateChoice(value: unknown): GateChoice | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toUpperCase();
    if (normalized === 'DECISOR' || normalized === 'INFLUENCIADOR' || normalized === 'PESQUISADOR') {
        return normalized;
    }
    return null;
}

function extractGateChoiceFromChanges(changes: unknown): GateChoice | null {
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return null;
    return normalizeGateChoice((changes as { choice?: unknown }).choice);
}

export async function getFunnelGateAnalytics(period?: string): Promise<FunnelGateAnalytics | null> {
    const context = await getLeadContext();
    if (!context) return null;
    if (!canAny(context.user.role, ['dashboard:executive', 'dashboard:operational'])) {
        return null;
    }

    const dateFilter = getDateFilter(period);
    const where: Prisma.AuditLogWhereInput = {
        entity: 'FunnelGate',
        action: 'GATE_SELECT',
    };
    if (dateFilter) where.createdAt = dateFilter;

    const events = await prisma.auditLog.findMany({
        where,
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
        const choice = extractGateChoiceFromChanges(event.changes);
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

    return {
        totals: {
            total,
            decisor: totals.DECISOR,
            influenciador: totals.INFLUENCIADOR,
            pesquisador: totals.PESQUISADOR,
            decisorRate,
        },
        byDay: Array.from(byDayMap.entries()).map(([date, counts]) => ({
            date,
            decisor: counts.DECISOR,
            influenciador: counts.INFLUENCIADOR,
            pesquisador: counts.PESQUISADOR,
            total: counts.DECISOR + counts.INFLUENCIADOR + counts.PESQUISADOR,
        })),
    };
}

function formatSourceLabel(source: string): string {
    const labels: Record<string, string> = {
        WEBSITE: 'Website',
        FACEBOOK: 'Facebook',
        INSTAGRAM: 'Instagram',
        GOOGLE_ADS: 'Google Ads',
        LINKEDIN: 'LinkedIn',
        EMAIL: 'Email',
        PHONE: 'Telefone',
        REFERRAL: 'Indicação',
        EVENT: 'Evento',
        OTHER: 'Outro',
    };
    return labels[source] || source;
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

export async function getLeadById(id: string) {
    const context = await getLeadContext();
    if (!context) return null;

    const lead = await prisma.lead.findFirst({
        where: scopedLeadWhere(context.leadScope, { id }),
        include: {
            pipelineStage: true,
            assignedUser: { select: { id: true, name: true, email: true } },
            activities: {
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { name: true, avatar: true } } }
            },
            notes: {
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { name: true } } }
            },
            tasks: {
                orderBy: { dueDate: 'asc' },
                include: { user: { select: { name: true } } }
            },
            meetings: {
                orderBy: { startTime: 'desc' },
            },
            documents: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!lead) return null;

    const canEditLead = can(context.user.role, 'leads:write:own');
    const canAdvancePipeline = can(context.user.role, 'pipeline:advance');
    const canDeleteLead = can(context.user.role, 'leads:delete');

    if (context.user.role === 'CONSULTANT') {
        const safeLead = {
            ...lead,
            qualificationData: undefined,
            roiData: undefined,
        };
        return {
            ...safeLead,
            permissions: {
                canEditLead,
                canAdvancePipeline,
                canDeleteLead,
            },
        };
    }

    return {
        ...lead,
        permissions: {
            canEditLead,
            canAdvancePipeline,
            canDeleteLead,
        },
    };
}

export async function getKanbanData() {
    const context = await getLeadContext();
    if (!context) {
        return {
            stages: [],
            leads: [],
            permissions: {
                canCreateLead: false,
                canAdvancePipeline: false,
            },
        };
    }

    // 1. Get all active stages ordered
    // Assuming we have a default pipeline or just one active pipeline for now.
    // If multiple pipelines exist, we might need to filter by the active one or pass pipelineId.
    const pipeline = await prisma.pipeline.findFirst({
        where: { isActive: true },
        include: {
            stages: {
                orderBy: { order: 'asc' }
            }
        }
    });

    if (!pipeline) {
        return {
            stages: [],
            leads: [],
            permissions: {
                canCreateLead: can(context.user.role, 'leads:write:own'),
                canAdvancePipeline: can(context.user.role, 'pipeline:advance'),
            },
        };
    }

    // 2. Get leads for these stages
    const leads = await prisma.lead.findMany({
        where: scopedLeadWhere(context.leadScope, {
            pipelineStageId: { in: pipeline.stages.map(s => s.id) },
            status: { not: 'ARCHIVED' }
        }),
        orderBy: { updatedAt: 'desc' },
        select: {
            id: true,
            name: true,
            company: true,
            score: true,
            grade: true,
            pipelineStageId: true,
            createdAt: true,
            updatedAt: true,
            status: true,
            assignedUser: { select: { name: true, avatar: true } },
            meetings: {
                where: { startTime: { gte: new Date() } },
                orderBy: { startTime: 'asc' },
                take: 1,
            },
        }
    });

    return {
        stages: pipeline.stages,
        leads,
        permissions: {
            canCreateLead: can(context.user.role, 'leads:write:own'),
            canAdvancePipeline: can(context.user.role, 'pipeline:advance'),
        },
    };
}

export async function updateLeadStage(leadId: string, stageId: string) {
    try {
        const context = await getLeadContext();
        if (!context) return { success: false, error: 'Not authenticated' };
        if (!can(context.user.role, 'pipeline:advance')) {
            return { success: false, error: 'Sem permissão para avançar pipeline' };
        }
        const userId = context.user.id;

        const [lead, stage] = await Promise.all([
            prisma.lead.findFirst({
                where: scopedLeadWhere(context.leadScope, { id: leadId }),
                select: {
                    id: true,
                    status: true,
                    pipelineStage: { select: { name: true } },
                },
            }),
            prisma.pipelineStage.findUnique({
                where: { id: stageId },
                select: { id: true, name: true, isWon: true, isLost: true },
            }),
        ]);

        if (!lead) return { success: false, error: 'Lead não encontrado' };
        if (!stage) return { success: false, error: 'Etapa não encontrada' };

        const now = new Date();
        let nextStatus = lead.status;
        if (stage.isWon) nextStatus = 'WON';
        else if (stage.isLost) nextStatus = 'LOST';
        else if (lead.status === 'WON' || lead.status === 'LOST' || lead.status === 'ARCHIVED') nextStatus = 'PROPOSAL';

        const updatedLead = await prisma.lead.update({
            where: { id: leadId },
            data: {
                pipelineStageId: stageId,
                status: nextStatus,
                convertedAt: stage.isWon ? now : null,
                lostAt: stage.isLost ? now : null,
            }
        });

        if (userId) {
            await prisma.activity.create({
                data: {
                    leadId,
                    userId,
                    type: 'STAGE_CHANGE',
                    title: 'Etapa do pipeline alterada',
                    description: `De ${lead.pipelineStage?.name || 'Sem etapa'} para ${stage.name}`,
                },
            });
        }

        return { success: true, lead: updatedLead };
    } catch (error) {
        console.error('Error updating lead stage:', error);
        return { success: false, error: 'Failed to update stage' };
    }
}

export async function createLead(data: CreateLeadInput) {
    try {
        const context = await getLeadContext();
        if (!context?.user.id) {
            return { success: false, error: 'Not authenticated' };
        }
        if (!can(context.user.role, 'leads:write:own')) {
            return { success: false, error: 'Sem permissão para criar leads' };
        }

        const name = data.name?.trim();
        const email = data.email?.trim();
        if (!name || !email) {
            return { success: false, error: 'Name and email are required' };
        }

        const firstStage = await prisma.pipelineStage.findFirst({
            where: { pipeline: { isActive: true } },
            orderBy: { order: 'asc' }
        });

        if (!firstStage) {
            return { success: false, error: 'No active pipeline stage found' };
        }

        const lead = await prisma.lead.create({
            data: {
                name,
                email,
                phone: data.whatsapp?.trim() || '',
                company: data.pharmacyName,
                position: data.role,
                status: 'NEW',
                source: normalizeLeadSource(data.source),
                assignedUserId: context.user.role === 'ADMIN' ? null : context.user.id,
                customFields: {
                    stores: data.stores ?? null,
                    revenue: data.revenue ?? null,
                    state: data.state ?? null,
                },
                pipelineStageId: firstStage.id
            },
            include: {
                pipelineStage: { select: { id: true, name: true, color: true, order: true, isWon: true, isLost: true } },
            },
        });
        return { success: true, lead };
    } catch (error) {
        console.error("Error creating lead:", error);
        return { success: false, error: 'Failed to create lead' };
    }
}

export async function getMeetings(startDate: Date, endDate: Date) {
    const context = await getLeadContext();
    if (!context?.user?.id) return [];

    const userId = context.user.id;
    const role = context.user.role;

    const meetings = await prisma.meeting.findMany({
        where: {
            startTime: {
                gte: startDate,
                lte: endDate
            },
            status: { not: 'CANCELLED' },
            lead: { is: context.leadScope },
            ...(isPrivileged(role) ? {} : { userId }),
        },
        include: {
            lead: {
                select: {
                    id: true,
                    name: true,
                    company: true
                }
            },
            user: {
                select: {
                    id: true,
                    name: true,
                    avatar: true
                }
            }
        },
        orderBy: {
            startTime: 'asc'
        }
    });

    return meetings;
}

export async function createMeeting(data: CreateMeetingInput) {
    try {
        const context = await getLeadContext();
        if (!context?.user?.id) {
            return { success: false, error: 'Not authenticated' };
        }
        if (!can(context.user.role, 'pipeline:advance')) {
            return { success: false, error: 'Sem permissão para agendar reuniões' };
        }

        const startTime = parseLocalDateTime(data.date, data.startTime);
        const durationMinutes = Number.parseInt(data.duration, 10);
        if (!startTime || Number.isNaN(startTime.getTime())) {
            return { success: false, error: 'Invalid date/time' };
        }
        if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
            return { success: false, error: 'Invalid duration' };
        }
        const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

        const scopedLead = await prisma.lead.findFirst({
            where: scopedLeadWhere(context.leadScope, { id: data.leadId }),
            select: {
                id: true,
                name: true,
                email: true,
                pipelineStageId: true,
                pipelineStage: { select: { pipelineId: true, order: true } },
            },
        });
        if (!scopedLead) {
            return { success: false, error: 'Lead not found' };
        }

        const meetingTitle =
            data.type === 'diagnostico'
                ? 'Call de Diagnóstico'
                : data.type === 'apresentacao'
                    ? 'Apresentação de Proposta'
                    : data.type === 'fechamento'
                        ? 'Reunião de Fechamento'
                        : 'Follow-up';

        if (!isTeamsConfigured()) {
            return { success: false, error: 'Integracao com Teams nao configurada' };
        }

        const actor = await prisma.user.findUnique({
            where: { id: context.user.id },
            select: { email: true },
        });
        if (!actor?.email || !scopedLead.email) {
            return { success: false, error: 'Email do consultor ou lead invalido para Teams' };
        }

        let teamsMeeting: TeamsMeetingPayload;
        try {
            teamsMeeting = await createTeamsMeeting({
                organizerEmail: actor.email,
                leadEmail: scopedLead.email,
                leadName: scopedLead.name,
                subject: meetingTitle,
                description: data.notes || null,
                startTime,
                endTime,
            });
        } catch (error) {
            console.error('Error creating Teams meeting:', error);
            return { success: false, error: 'Falha ao criar reuniao no Teams' };
        }

        const meeting = await prisma.meeting.create({
            data: {
                title: meetingTitle,
                description: data.notes,
                startTime: startTime,
                endTime: endTime,
                lead: { connect: { id: data.leadId } },
                user: { connect: { id: context.user.id } },
                status: 'SCHEDULED',
                meetingLink: teamsMeeting.meetingLink,
                provider: teamsMeeting.provider,
                externalEventId: teamsMeeting.externalEventId,
            }
        });

        let nextStageId = scopedLead.pipelineStageId ?? null;
        if (scopedLead.pipelineStage?.pipelineId) {
            const nextStage = await prisma.pipelineStage.findFirst({
                where: {
                    pipelineId: scopedLead.pipelineStage.pipelineId,
                    order: { gt: scopedLead.pipelineStage.order },
                    isWon: false,
                    isLost: false,
                },
                orderBy: { order: 'asc' },
                select: { id: true },
            });

            if (nextStage) {
                nextStageId = nextStage.id;
            }
        }

        await prisma.lead.update({
            where: { id: data.leadId },
            data: {
                status: 'CONTACTED',
                pipelineStageId: nextStageId,
            },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                leadId: data.leadId,
                userId: context.user.id,
                type: 'MEETING',
                title: 'Agendou uma reunião',
                metadata: { meetingId: meeting.id, startTime, endTime }
            }
        });

        return { success: true, meeting };
    } catch (error) {
        console.error("Error creating meeting:", error);
        return { success: false, error: 'Failed to create meeting' };
    }
}

export async function deleteMeeting(meetingId: string) {
    try {
        const context = await getLeadContext();
        const sessionUserId = context?.user?.id;
        const sessionRole = context?.user?.role;
        if (!sessionUserId) {
            return { success: false, error: 'Not authenticated' };
        }
        if (!can(sessionRole, 'leads:write:own')) {
            return { success: false, error: 'Sem permissão para cancelar reuniões' };
        }

        const meeting = await prisma.meeting.findFirst({
            where: {
                id: meetingId,
                lead: { is: context.leadScope },
            },
            select: {
                id: true,
                userId: true,
                provider: true,
                externalEventId: true,
                user: { select: { email: true } },
            },
        });
        if (!meeting) {
            return { success: false, error: 'Meeting not found' };
        }
        if (!isPrivileged(sessionRole) && meeting.userId !== sessionUserId) {
            return { success: false, error: 'Forbidden' };
        }

        await prisma.meeting.update({
            where: { id: meetingId },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
            }
        });

        if (meeting.provider === 'teams' && meeting.externalEventId && meeting.user.email) {
            cancelTeamsMeeting({
                organizerEmail: meeting.user.email,
                externalEventId: meeting.externalEventId,
            }).catch((error) => console.error('Failed to cancel Teams meeting:', error));
        }

        return { success: true };
    } catch (error) {
        console.error("Error deleting meeting:", error);
        return { success: false, error: 'Failed to delete meeting' };
    }
}

export async function getLeadsForSelect() {
    const context = await getLeadContext();
    if (!context) return [];

    const leads = await prisma.lead.findMany({
        select: {
            id: true,
            name: true,
            company: true
        },
        orderBy: {
            name: 'asc'
        },
        where: scopedLeadWhere(context.leadScope, {
            status: { notIn: ['LOST', 'ARCHIVED'] }
        }),
    });
    return leads;
}

export async function getFinancialMetrics(period?: string) {
    const context = await getLeadContext();
    if (!context) {
        return {
            totalRevenue: 0,
            averageTicket: 0,
            conversionRate: 0,
            totalConverted: 0,
        };
    }

    const dateFilter = getDateFilter(period);

    // Revenue (WON leads)
    const wonLeads = await prisma.lead.findMany({
        where: scopedLeadWhere(context.leadScope, {
            status: 'WON',
            convertedAt: dateFilter // Use convertedAt for revenue timing
        }),
        select: {
            estimatedValue: true
        }
    });

    const totalRevenue = wonLeads.reduce((acc, lead) => {
        return acc + (Number(lead.estimatedValue) || 0);
    }, 0);

    const averageTicket = wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0;

    // Conversion Rate (WON / Total created in period) - This is cohort based approx
    // Or simpler: WON in period / NEW in period (not accurate but common)
    // Let's stick to: Count(WON in period) / Count(ALL created in period) ??
    // Actually, conversion rate is usually "Leads that converted".
    // Let's use: (Total Converted in Period / Total Created in Period) * 100
    // This isn't perfect mathematically for cohorts but standard for dashboard snapshots.

    // We can reuse getDashboardMetrics logic or just fetch counts
    const [totalCreated, totalConverted] = await Promise.all([
        prisma.lead.count({ where: scopedLeadWhere(context.leadScope, { createdAt: dateFilter }) }),
        prisma.lead.count({ where: scopedLeadWhere(context.leadScope, { status: 'WON', convertedAt: dateFilter }) })
    ]);

    const conversionRate = totalCreated > 0 ? (totalConverted / totalCreated) * 100 : 0;

    return {
        totalRevenue,
        averageTicket,
        conversionRate,
        totalConverted
    };
}

export async function getLeadsOverTime(period?: string) {
    const context = await getLeadContext();
    if (!context) return [];

    const dateFilter = getDateFilter(period);

    // Fetch createdAt dates
    const leads = await prisma.lead.findMany({
        where: scopedLeadWhere(context.leadScope, { createdAt: dateFilter }),
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' }
    });

    // Group by date (YYYY-MM-DD)
    const grouped = leads.reduce((acc, lead) => {
        const date = lead.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Convert to array in chronological order
    return Object.entries(grouped).map(([date, count]) => ({
        date,
        count
    })).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getExportData(period?: string) {
    const context = await getLeadContext();
    if (!context) return [];

    const dateFilter = getDateFilter(period);

    const leads = await prisma.lead.findMany({
        where: scopedLeadWhere(context.leadScope, { createdAt: dateFilter }),
        select: {
            name: true,
            email: true,
            phone: true,
            company: true,
            status: true,
            source: true,
            grade: true,
            estimatedValue: true,
            createdAt: true,
            convertedAt: true
        },
        orderBy: { createdAt: 'desc' }
    });

    return leads.map(lead => ({
        ...lead,
        estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : 0,
    }));
}


