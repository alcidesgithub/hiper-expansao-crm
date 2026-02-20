'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { LeadSource, LeadPriority, LeadStatus, Lead } from '@prisma/client';
import { revalidatePath, unstable_cache } from 'next/cache';
import { can, canAny, getLeadPermissions } from '@/lib/permissions';
import { buildLeadScope, mergeLeadWhere } from '@/lib/lead-scope';
import { subDays } from 'date-fns';
import { calculateLeadScore, calcularScore, type QualificationData, type DynamicScoringCriterion } from '@/lib/scoring';
import { DEFAULT_SCORING_CRITERIA } from '@/lib/config-options';
import { notifyActiveManagers } from '@/lib/crm-notifications';

const DASHBOARD_ANALYTICS_REVALIDATE_SEC = Number(process.env.DASHBOARD_ANALYTICS_REVALIDATE_SEC ?? '60');

export async function searchLeads(query: string) {
    const session = await auth();
    if (!session?.user) return [];

    if (!query || query.length < 2) return [];

    try {
        const leads = await prisma.lead.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { company: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                company: true,
                phone: true,
                grade: true,
            },
            take: 5,
        });
        return leads;
    } catch (error) {
        console.error('Error searching leads:', error);
        return [];
    }
}

export async function getNotifications() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: session.user.id,
                read: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 10,
        });
        return notifications;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

export async function markNotificationAsRead(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false };

    try {
        await prisma.notification.update({
            where: {
                id,
                userId: session.user.id,
            },
            data: {
                read: true,
            },
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return { success: false };
    }
}

export async function markAllNotificationsAsRead() {
    const session = await auth();
    if (!session?.user?.id) return { success: false };

    try {
        await prisma.notification.updateMany({
            where: {
                userId: session.user.id,
                read: false,
            },
            data: {
                read: true,
            },
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return { success: false };
    }
}

export async function getCurrentUser() {
    const session = await auth();
    return session?.user;
}

export async function getDashboardLayoutData() {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) {
        return { user, notifications: [] };
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: user.id,
                read: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 10,
        });

        return { user, notifications };
    } catch (error) {
        console.error('Error fetching dashboard layout data:', error);
        return { user, notifications: [] };
    }
}

export async function signOutAction() {
    const { signOut } = await import('@/auth');
    await signOut();
}

// --- Dashboard Actions ---

function getStartDate(period: string) {
    const now = new Date();
    switch (period) {
        case '7d': return subDays(now, 7);
        case '90d': return subDays(now, 90);
        case '12m': return subDays(now, 365);
        default: return subDays(now, 30);
    }
}

async function ensureDashboardAnalyticsAccess() {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    if (!canAny(session.user, ['dashboard:executive', 'dashboard:operational'])) {
        throw new Error('Forbidden');
    }

    return session;
}

type AcquisitionStageKey =
    | 'lpView'
    | 'ctaClick'
    | 'step1'
    | 'step2'
    | 'step3'
    | 'step5'
    | 'resultAB'
    | 'agendamento';

type AcquisitionStage = {
    key: AcquisitionStageKey;
    label: string;
    count: number;
    conversionFromPrevious: number | null;
};

type AcquisitionBreakdownRow = {
    utmSource: string;
    utmCampaign: string;
    lpView: number;
    ctaClick: number;
    step1: number;
    step2: number;
    step3: number;
    step5: number;
    resultAB: number;
    agendamento: number;
};

type AcquisitionFunnelMetrics = {
    period: {
        from: string;
        to: string;
    };
    stages: AcquisitionStage[];
    cards: {
        lpToStep1: number;
        step1ToStep2: number;
        step5ToAB: number;
        abToAgendamento: number;
    };
    bySourceCampaign: AcquisitionBreakdownRow[];
};

const STAGE_ORDER: Array<{ key: AcquisitionStageKey; label: string }> = [
    { key: 'lpView', label: 'Visitas na LP' },
    { key: 'ctaClick', label: 'Cliques no CTA' },
    { key: 'step1', label: 'Cadastro' },
    { key: 'step2', label: 'Perfil Empresarial' },
    { key: 'step3', label: 'Desafios e Motivação' },
    { key: 'step5', label: 'Investimento' },
    { key: 'resultAB', label: 'Aprovados (A/B)' },
    { key: 'agendamento', label: 'Agendamentos' },
];

function safeDivisionRate(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Number(((numerator / denominator) * 100).toFixed(2));
}

function parseIsoDateLike(value: unknown): Date | null {
    if (typeof value !== 'string' || value.trim().length === 0) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeDimension(value: unknown, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    return trimmed.slice(0, 150);
}

function asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
}

const getDashboardMetricsCached = unstable_cache(async (period: string = '30d') => {
    const startDate = getStartDate(period);

    const [
        totalLeads,
        qualifiedLeads,
        wonLeads,
        upcomingMeetingsCount,
        gradeGrouped,
        sourceGrouped
    ] = await Promise.all([
        prisma.lead.count({ where: { createdAt: { gte: startDate } } }),
        prisma.lead.count({ where: { createdAt: { gte: startDate }, status: 'QUALIFIED' } }),
        prisma.lead.count({ where: { createdAt: { gte: startDate }, status: 'WON' } }),
        prisma.meeting.count({ where: { startTime: { gte: new Date() }, status: 'SCHEDULED' } }),
        prisma.lead.groupBy({
            by: ['grade'],
            where: { createdAt: { gte: startDate }, grade: { not: null } },
            _count: { _all: true }
        }),
        prisma.lead.groupBy({
            by: ['source'],
            where: { createdAt: { gte: startDate } },
            _count: { _all: true }
        })
    ]);

    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    return {
        totalLeads,
        qualifiedLeads,
        convertedLeads: wonLeads,
        upcomingMeetings: upcomingMeetingsCount,
        conversionRate,
        gradeDistribution: gradeGrouped.map(g => ({ grade: g.grade as string, count: g._count._all })),
        sourceDistribution: sourceGrouped.map(s => ({ source: s.source, count: s._count._all }))
    };
}, ['dashboard-metrics-v1'], {
    revalidate: DASHBOARD_ANALYTICS_REVALIDATE_SEC,
});

export async function getDashboardMetrics(period: string = '30d') {
    await ensureDashboardAnalyticsAccess();
    return getDashboardMetricsCached(period);
}

export async function getRecentLeads() {
    const session = await auth();
    if (!session?.user) return [];

    return prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
            id: true,
            name: true,
            email: true,
            company: true,
            status: true,
            grade: true,
            score: true,
            source: true,
            priority: true,
            createdAt: true,
            pipelineStage: {
                select: {
                    name: true,
                    color: true
                }
            }
        }
    });
}

export async function getLeadById(id: string) {
    const session = await auth();
    if (!session?.user) return null;

    const leadScope = await buildLeadScope(session.user);

    const lead = await prisma.lead.findFirst({
        where: mergeLeadWhere({ id }, leadScope),
        include: {
            pipelineStage: true,
            assignedUser: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            meetings: {
                orderBy: { startTime: 'desc' },
                take: 5,
            },
            notes: {
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    user: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
            activities: {
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    user: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
            tasks: {
                orderBy: { dueDate: 'asc' },
                take: 10,
            },
        },
    });

    if (!lead) return null;

    const assignableUsers = can(session.user, 'leads:assign')
        ? await prisma.user.findMany({
            where: {
                status: 'ACTIVE',
                role: { in: ['CONSULTANT', 'MANAGER'] },
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
            orderBy: [{ role: 'asc' }, { name: 'asc' }],
        })
        : [];

    // Get available stages for the initial render
    const pipelineId = lead.pipelineStage?.pipelineId || null;
    const availableStages = pipelineId
        ? await prisma.pipelineStage.findMany({
            where: { pipelineId },
            orderBy: { order: 'asc' },
            select: { id: true, name: true, order: true, color: true, isWon: true, isLost: true },
        })
        : [];

    const result = {
        ...lead,
        availableStages,
        assignableUsers,
        permissions: getLeadPermissions(session.user, lead),
    };

    // Ensure serialization for Decimal and Date fields
    return JSON.parse(JSON.stringify(result));
}

export async function getFunnelMetrics(period: string = '30d') {
    await ensureDashboardAnalyticsAccess();
    const startDate = getStartDate(period);
    const startDateIso = startDate.toISOString();

    // 1. Contadores de eventos de aquisição (AuditLog)
    const auditCounts = await prisma.$queryRaw<Array<{
        lpView: bigint;
        ctaClick: bigint;
    }>>`
        SELECT
            COUNT(DISTINCT "entityId") FILTER (WHERE "action" = 'LP_VIEW') as "lpView",
            COUNT(DISTINCT "entityId") FILTER (WHERE "action" = 'LP_CTA_CLICK') as "ctaClick"
        FROM "AuditLog"
        WHERE "entity" = 'AcquisitionEvent'
          AND "action" IN ('LP_VIEW', 'LP_CTA_CLICK')
          AND "createdAt" >= ${startDate}
    `;

    // 2. Contadores de etapas do funil (qualificationData no Lead)
    const leadCounts = await prisma.$queryRaw<Array<{
        step1: bigint;
        step2: bigint;
        step3: bigint;
        step5: bigint;
        resultAB: bigint;
        agendamento: bigint;
    }>>`
        SELECT
            COUNT(*) FILTER (WHERE "qualificationData"->>'step1CompletedAt' >= ${startDateIso} OR "createdAt" >= ${startDate}) as "step1",
            COUNT(*) FILTER (WHERE "qualificationData"->>'step2CompletedAt' >= ${startDateIso}) as "step2",
            COUNT(*) FILTER (WHERE "qualificationData"->>'step3CompletedAt' >= ${startDateIso}) as "step3",
            COUNT(*) FILTER (WHERE "qualificationData"->>'step5CompletedAt' >= ${startDateIso}) as "step5",
            COUNT(*) FILTER (WHERE ("grade" = 'A' OR "grade" = 'B') AND "qualificationData"->>'step5CompletedAt' >= ${startDateIso}) as "resultAB",
            COUNT(*) FILTER (WHERE ("grade" = 'A' OR "grade" = 'B') AND EXISTS (
                SELECT 1 FROM "Meeting" m
                WHERE m."leadId" = "Lead".id
                AND m."createdAt" >= ${startDate}
                AND m."status" IN ('SCHEDULED', 'RESCHEDULED', 'COMPLETED')
            )) as "agendamento"
        FROM "Lead"
        WHERE "createdAt" >= ${startDate}
           OR "updatedAt" >= ${startDate}
    `;

    const audit = auditCounts[0] || { lpView: BigInt(0), ctaClick: BigInt(0) };
    const leads = leadCounts[0] || { step1: BigInt(0), step2: BigInt(0), step3: BigInt(0), step5: BigInt(0), resultAB: BigInt(0), agendamento: BigInt(0) };

    const funnel = [
        { step: 'Visita LP', count: Number(audit.lpView) },
        { step: 'Clique CTA', count: Number(audit.ctaClick) },
        { step: 'Cadastro', count: Number(leads.step1) },
        { step: 'Perfil', count: Number(leads.step2) },
        { step: 'Desafios', count: Number(leads.step3) },
        { step: 'Investimento', count: Number(leads.step5) },
        { step: 'Aprovados (A/B)', count: Number(leads.resultAB) },
        { step: 'Agendamento', count: Number(leads.agendamento) },
    ];

    const topCount = funnel[0].count;
    const bottomCount = funnel[funnel.length - 1].count;
    const dropoffRate = topCount > 0 ? Math.round(((topCount - bottomCount) / topCount) * 100) : 0;

    return {
        funnel,
        dropoffRate
    };
}

const getAcquisitionFunnelMetricsCached = unstable_cache(async (period: string = '30d'): Promise<AcquisitionFunnelMetrics> => {
    const startDate = getStartDate(period);
    const startDateIso = startDate.toISOString();

    // 1. AuditLog Aggregation (LP Views & Clicks)
    // Agrupa por Source/Campaign e conta sessões únicas (entityId)
    const auditMetrics = await prisma.$queryRaw<Array<{
        utmSource: string | null;
        utmCampaign: string | null;
        lpView: bigint;
        ctaClick: bigint;
    }>>`
        SELECT 
            "changes"->>'utmSource' as "utmSource", 
            "changes"->>'utmCampaign' as "utmCampaign", 
            COUNT(DISTINCT "entityId") FILTER (WHERE "action" = 'LP_VIEW') as "lpView",
            COUNT(DISTINCT "entityId") FILTER (WHERE "action" = 'LP_CTA_CLICK') as "ctaClick"
        FROM "AuditLog"
        WHERE "entity" = 'AcquisitionEvent' 
          AND "action" IN ('LP_VIEW', 'LP_CTA_CLICK')
          AND "createdAt" >= ${startDate}
        GROUP BY 1, 2
    `;

    // 2. Lead Aggregation (Steps & Conversions)
    // Agrupa por Source/Campaign (coalesce coluna e JSON)
    const leadMetrics = await prisma.$queryRaw<Array<{
        utmSource: string | null;
        utmCampaign: string | null;
        step1: bigint;
        step2: bigint;
        step3: bigint;
        step5: bigint;
        resultAB: bigint;
        agendamento: bigint;
    }>>`
        SELECT 
            COALESCE("utmSource", "qualificationData"->'attribution'->>'utmSource') as "utmSource",
            COALESCE("utmCampaign", "qualificationData"->'attribution'->>'utmCampaign') as "utmCampaign",
            COUNT(*) FILTER (WHERE "qualificationData"->>'step1CompletedAt' >= ${startDateIso} OR "createdAt" >= ${startDate}) as "step1",
            COUNT(*) FILTER (WHERE "qualificationData"->>'step2CompletedAt' >= ${startDateIso}) as "step2",
            COUNT(*) FILTER (WHERE "qualificationData"->>'step3CompletedAt' >= ${startDateIso}) as "step3",
            COUNT(*) FILTER (WHERE "qualificationData"->>'step5CompletedAt' >= ${startDateIso}) as "step5",
            COUNT(*) FILTER (WHERE ("grade" = 'A' OR "grade" = 'B') AND "qualificationData"->>'step5CompletedAt' >= ${startDateIso}) as "resultAB",
            COUNT(*) FILTER (WHERE ("grade" = 'A' OR "grade" = 'B') AND EXISTS (
                SELECT 1 FROM "Meeting" m 
                WHERE m."leadId" = "Lead".id 
                AND m."createdAt" >= ${startDate}
                AND m."status" IN ('SCHEDULED', 'RESCHEDULED', 'COMPLETED')
            )) as "agendamento"
        FROM "Lead"
        WHERE "createdAt" >= ${startDate} 
           OR "updatedAt" >= ${startDate}
        GROUP BY 1, 2
    `;

    // 3. Merge & Process Data
    const breakdownMap = new Map<string, AcquisitionBreakdownRow>();

    const normalizeKey = (s: string | null, c: string | null) => {
        const source = s?.trim() || '(sem source)';
        const campaign = c?.trim() || '(sem campanha)';
        return { key: `${source}|||${campaign}`, source, campaign };
    };

    const ensureRow = (key: string, source: string, campaign: string) => {
        if (!breakdownMap.has(key)) {
            breakdownMap.set(key, {
                utmSource: source,
                utmCampaign: campaign,
                lpView: 0,
                ctaClick: 0,
                step1: 0,
                step2: 0,
                step3: 0,
                step5: 0,
                resultAB: 0,
                agendamento: 0,
            });
        }
        return breakdownMap.get(key)!;
    };

    // Process Audit Metrics
    const totalCounts = {
        lpView: 0,
        ctaClick: 0,
        step1: 0,
        step2: 0,
        step3: 0,
        step5: 0,
        resultAB: 0,
        agendamento: 0,
    };

    for (const row of auditMetrics) {
        const { key, source, campaign } = normalizeKey(row.utmSource, row.utmCampaign);
        const mapRow = ensureRow(key, source, campaign);

        const lpView = Number(row.lpView);
        const ctaClick = Number(row.ctaClick);

        mapRow.lpView += lpView;
        mapRow.ctaClick += ctaClick;

        totalCounts.lpView += lpView;
        totalCounts.ctaClick += ctaClick;
    }

    // Process Lead Metrics
    for (const row of leadMetrics) {
        const { key, source, campaign } = normalizeKey(row.utmSource, row.utmCampaign);
        const mapRow = ensureRow(key, source, campaign);

        const step1 = Number(row.step1);
        const step2 = Number(row.step2);
        const step3 = Number(row.step3);
        const step5 = Number(row.step5);
        const resultAB = Number(row.resultAB);
        const agendamento = Number(row.agendamento);

        mapRow.step1 += step1;
        mapRow.step2 += step2;
        mapRow.step3 += step3;
        mapRow.step5 += step5;
        mapRow.resultAB += resultAB;
        mapRow.agendamento += agendamento;

        totalCounts.step1 += step1;
        totalCounts.step2 += step2;
        totalCounts.step3 += step3;
        totalCounts.step5 += step5;
        totalCounts.resultAB += resultAB;
        totalCounts.agendamento += agendamento;
    }

    // 4. Construct Final Result
    const stages: AcquisitionStage[] = STAGE_ORDER.map((stage, index) => {
        const count = totalCounts[stage.key];
        if (index === 0) {
            return { key: stage.key, label: stage.label, count, conversionFromPrevious: null };
        }
        const previousKey = STAGE_ORDER[index - 1].key;
        const prevCount = totalCounts[previousKey];
        return {
            key: stage.key,
            label: stage.label,
            count,
            conversionFromPrevious: safeDivisionRate(count, prevCount)
        };
    });

    const cards = {
        lpToStep1: safeDivisionRate(totalCounts.step1, totalCounts.lpView),
        step1ToStep2: safeDivisionRate(totalCounts.step2, totalCounts.step1),
        step5ToAB: safeDivisionRate(totalCounts.resultAB, totalCounts.step5),
        abToAgendamento: safeDivisionRate(totalCounts.agendamento, totalCounts.resultAB),
    };

    const bySourceCampaign = Array.from(breakdownMap.values())
        .sort((a, b) => {
            if (b.step1 !== a.step1) return b.step1 - a.step1; // Conversões primeiro
            return b.lpView - a.lpView; // Trafego depois
        })
        .slice(0, 100);

    return {
        period: {
            from: startDate.toISOString(),
            to: new Date().toISOString(),
        },
        stages,
        cards,
        bySourceCampaign,
    };
}, ['dashboard-acquisition-funnel-v1'], {
    revalidate: DASHBOARD_ANALYTICS_REVALIDATE_SEC,
});

export async function getAcquisitionFunnelMetrics(period: string = '30d'): Promise<AcquisitionFunnelMetrics> {
    await ensureDashboardAnalyticsAccess();
    return getAcquisitionFunnelMetricsCached(period);
}

export async function getUpcomingMeetings(limit: number = 5) {
    const session = await auth();
    if (!session?.user) return [];

    return prisma.meeting.findMany({
        where: {
            startTime: { gte: new Date() },
            status: 'SCHEDULED'
        },
        include: {
            lead: {
                select: {
                    name: true,
                    company: true,
                    grade: true
                }
            },
            user: {
                select: {
                    name: true
                }
            }
        },
        orderBy: { startTime: 'asc' },
        take: limit
    });
}

const getFunnelGateAnalyticsCached = unstable_cache(async (period: string = '30d') => {
    const startDate = getStartDate(period);

    const gateRows = await prisma.$queryRaw<Array<{ gateProfile: string; count: number }>>`
        SELECT LOWER(COALESCE("qualificationData"->>'gateProfile', "qualificationData"->>'role', '')) AS "gateProfile", COUNT(*)::int AS count
        FROM "Lead"
        WHERE "createdAt" >= ${startDate}
          AND "qualificationData" IS NOT NULL
          AND "qualificationData" <> 'null'::jsonb
        GROUP BY 1
    `;

    const totals = {
        total: 0,
        decisor: 0,
        influenciador: 0,
        pesquisador: 0
    };

    gateRows.forEach(({ gateProfile, count }) => {
        if (!gateProfile) return;

        totals.total += Number(count);
        if (
            gateProfile === 'decisor' ||
            gateProfile === 'proprietario' ||
            gateProfile === 'proprietário' ||
            gateProfile === 'socio' ||
            gateProfile === 'sócio' ||
            gateProfile === 'farmaceutico_rt' ||
            gateProfile === 'gerente_geral'
        ) {
            totals.decisor += Number(count);
            return;
        }
        if (
            gateProfile === 'influenciador' ||
            gateProfile === 'gerente' ||
            gateProfile === 'gerente_comercial'
        ) {
            totals.influenciador += Number(count);
            return;
        }

        totals.pesquisador += Number(count);
    });

    const decisorRate = totals.total > 0 ? Math.round((totals.decisor / totals.total) * 100) : 0;

    return {
        totals: {
            ...totals,
            decisorRate
        }
    };
}, ['dashboard-gate-analytics-v1'], {
    revalidate: DASHBOARD_ANALYTICS_REVALIDATE_SEC,
});

export async function getFunnelGateAnalytics(period: string = '30d') {
    await ensureDashboardAnalyticsAccess();
    return getFunnelGateAnalyticsCached(period);
}

export async function getKanbanData() {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    const leadScope = await buildLeadScope(session.user);

    const [stages, leads] = await Promise.all([
        prisma.pipelineStage.findMany({
            orderBy: { order: 'asc' },
            select: {
                id: true,
                name: true,
                color: true,
                order: true,
                isWon: true,
                isLost: true,
            },
        }),
        prisma.lead.findMany({
            where: mergeLeadWhere({ status: { notIn: ['ARCHIVED'] } }, leadScope),
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
            },
        })
    ]);

    const permissions = {
        canCreateLead: canAny(session.user, ['dashboard:executive', 'dashboard:operational', 'leads:write:own']),
        canAdvancePipeline: canAny(session.user, ['dashboard:executive', 'dashboard:operational', 'pipeline:advance'])
    };

    return { stages, leads, permissions };
}

interface CreateLeadData {
    name: string;
    email: string;
    whatsapp: string;
    pharmacyName: string;
    position: string;
    source: string;
    priority: string;
    // Qual Fields
    tempoMercado: string;
    stores: string;
    revenue: string;
    city: string;
    state: string;
    motivacao: string;
    urgencia: string;
    compromisso: string;
    // Metadata
    expectedCloseDate: string;
}

export async function createLead(data: CreateLeadData) {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Não autorizado' };

    try {
        const [pipeline, settings] = await Promise.all([
            prisma.pipeline.findFirst({
                where: { isActive: true },
                include: {
                    stages: { orderBy: { order: 'asc' } }
                }
            }),
            prisma.systemSettings.findFirst({
                where: { key: 'config.scoringCriteria.v1' }
            }),
        ]);

        const stages = pipeline?.stages || [];
        const firstStage = stages.find(s => !s.isWon && !s.isLost) || stages[0];
        const lostStage = stages.find(s => s.isLost);

        // Prepare Qualification Data for scoring
        const fullQualData: QualificationData = {
            isDecisionMaker: true,
            nome: data.name,
            email: data.email,
            telefone: data.whatsapp,
            empresa: data.pharmacyName,
            cargo: data.position,
            tempoMercado: data.tempoMercado,
            numeroLojas: data.stores,
            faturamento: data.revenue,
            localizacao: data.state,
            motivacao: data.motivacao,
            urgencia: data.urgencia,
            compromisso: data.compromisso,
            desafios: [],
            historicoRedes: 'nunca',
            conscienciaInvestimento: 'quero-conhecer',
            reacaoValores: 'alto-saber-mais',
        };

        // Calculate Scores
        const legacyResult = calcularScore(fullQualData);

        // Try to get dynamic scoring settings if they exist
        const scoringCriteria = (settings?.value as unknown as DynamicScoringCriterion[]) || DEFAULT_SCORING_CRITERIA;

        // Mock lead for dynamic score calculation
        const mockLead = { qualificationData: fullQualData } as unknown as Lead;
        const dynamicScore = calculateLeadScore(mockLead, scoringCriteria);

        // Resolve Grade
        let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'D';
        if (legacyResult.eliminado || dynamicScore < 35) grade = 'F';
        else if (dynamicScore >= 85) grade = 'A';
        else if (dynamicScore >= 70) grade = 'B';
        else if (dynamicScore >= 55) grade = 'C';

        // Status and Stage Logic
        const status = grade === 'F' ? LeadStatus.LOST : LeadStatus.NEW;
        const pipelineStageId = (grade === 'F' && lostStage) ? lostStage.id : firstStage?.id;

        // Priority Logic
        const priorityMap: Record<string, LeadPriority> = {
            'A': LeadPriority.URGENT,
            'B': LeadPriority.HIGH,
            'C': LeadPriority.MEDIUM,
            'D': LeadPriority.LOW,
            'F': LeadPriority.LOW,
        };
        const resolvedPriority = priorityMap[grade] || LeadPriority.MEDIUM;

        const lead = await prisma.lead.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.whatsapp,
                company: data.pharmacyName,
                position: data.position,
                source: (data.source as LeadSource) || LeadSource.OTHER,
                priority: resolvedPriority,
                status: status,
                pipelineStageId: pipelineStageId,
                score: dynamicScore,
                grade: grade,
                expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
                qualificationData: {
                    ...fullQualData,
                    city: data.city,
                    state: data.state,
                    scoringResult: {
                        source: 'manual-entry',
                        grade,
                        scoreNormalizado: dynamicScore,
                        detalhes: legacyResult.detalhes
                    }
                }
            }
        });

        try {
            await notifyActiveManagers({
                title: 'Novo lead criado no CRM',
                message: `${lead.name} foi criado manualmente e está disponível para triagem.`,
                link: `/dashboard/leads/${lead.id}`,
                emailSubject: 'Novo lead criado no CRM',
            });
        } catch (notifyErr) {
            console.error('Failed to notify managers on manual lead creation:', notifyErr);
        }

        revalidatePath('/dashboard/leads');
        return { success: true, lead };
    } catch (error) {
        console.error('Error creating lead:', error);
        return { success: false, error: 'Erro ao criar lead' };
    }
}

export async function updateLeadStage(leadId: string, stageId: string) {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Não autorizado' };

    try {
        await prisma.lead.update({
            where: { id: leadId },
            data: { pipelineStageId: stageId }
        });

        revalidatePath('/dashboard/leads');
        return { success: true };
    } catch (error) {
        console.error('Error updating lead stage:', error);
        return { success: false, error: 'Erro ao mover lead' };
    }
}

// --- Agenda Actions ---

export async function getMeetings(from?: Date, to?: Date) {
    const session = await auth();
    if (!session?.user) return [];

    return prisma.meeting.findMany({
        where: {
            startTime: {
                gte: from || subDays(new Date(), 30),
                lte: to || subDays(new Date(), -30)
            },
            status: { not: 'CANCELLED' }
        },
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
            lead: {
                select: {
                    name: true,
                    company: true
                }
            }
        },
        orderBy: { startTime: 'asc' }
    });
}

export async function getLeadsForSelect() {
    const session = await auth();
    if (!session?.user) return [];

    return prisma.lead.findMany({
        where: { status: { not: 'ARCHIVED' } },
        select: {
            id: true,
            name: true,
            company: true
        },
        orderBy: { name: 'asc' }
    });
}

export async function getAgendaInitialData(from?: Date, to?: Date) {
    const session = await auth();
    if (!session?.user) return { meetings: [], leads: [] };

    const user = session.user as { id?: string; role?: string; permissions?: string[] };
    const leadScope = await buildLeadScope(user);

    const isPrivileged = user.role === 'ADMIN' || user.role === 'DIRECTOR' || user.role === 'MANAGER';

    const meetingWhere: Record<string, unknown> = {
        startTime: {
            gte: from || subDays(new Date(), 30),
            lte: to || subDays(new Date(), -30)
        },
        status: { not: 'CANCELLED' },
        lead: { is: leadScope },
    };

    // Consultants only see their own meetings
    if (!isPrivileged) {
        meetingWhere.userId = user.id;
    }

    const [meetings, leads] = await Promise.all([
        prisma.meeting.findMany({
            where: meetingWhere,
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
                lead: {
                    select: {
                        name: true,
                        company: true
                    }
                }
            },
            orderBy: { startTime: 'asc' }
        }),
        prisma.lead.findMany({
            where: { status: { not: 'ARCHIVED' } },
            select: {
                id: true,
                name: true,
                company: true
            },
            orderBy: { name: 'asc' }
        })
    ]);

    return { meetings, leads };
}

export async function createMeeting(data: {
    leadId: string;
    type: string;
    date: string;
    startTime: string;
    duration: string;
    autoLink?: boolean;
    notes?: string;
}) {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Não autorizado' };

    try {
        const [year, month, day] = data.date.split('-').map(Number);
        const [hour, minute] = data.startTime.split(':').map(Number);
        const start = new Date(year, month - 1, day, hour, minute);
        const durationMinutes = parseInt(data.duration) || 60;
        const end = new Date(start.getTime() + durationMinutes * 60000);

        const meetingTypeMap: Record<string, 'DIAGNOSTICO' | 'APRESENTACAO' | 'FECHAMENTO' | 'FOLLOWUP'> = {
            'diagnostico': 'DIAGNOSTICO',
            'apresentacao': 'APRESENTACAO',
            'fechamento': 'FECHAMENTO',
            'followup': 'FOLLOWUP'
        };

        const meetingType = meetingTypeMap[data.type] || 'DIAGNOSTICO';
        const userId = (session.user as { id: string }).id;

        // Buscar o nome do lead para o título
        const lead = await prisma.lead.findUnique({
            where: { id: data.leadId },
            select: { name: true, email: true }
        });
        if (!lead) return { success: false, error: 'Lead não encontrado' };

        const typeLabels: Record<string, string> = {
            'diagnostico': 'Diagnóstico',
            'apresentacao': 'Apresentação',
            'fechamento': 'Fechamento',
            'followup': 'Follow-up'
        };
        const title = `${typeLabels[data.type] || data.type} - ${lead.name}`;

        // Integração Teams real (se configurado e solicitado)
        let teamsJoinUrl: string | null = null;
        let teamsEventId: string | null = null;
        let provider: string | null = null;

        if (data.autoLink) {
            try {
                const { isTeamsConfigured, createTeamsMeeting } = await import('@/lib/teams');
                if (isTeamsConfigured()) {
                    const consultant = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { email: true }
                    });
                    if (consultant?.email) {
                        const teamsMeeting = await createTeamsMeeting({
                            organizerEmail: consultant.email,
                            leadEmail: lead.email,
                            leadName: lead.name,
                            subject: title,
                            description: data.notes || null,
                            startTime: start,
                            endTime: end,
                        });
                        teamsJoinUrl = teamsMeeting.meetingLink;
                        teamsEventId = teamsMeeting.externalEventId;
                        provider = teamsMeeting.provider;
                    }
                }
            } catch (teamsError) {
                console.error('Teams integration failed, proceeding without:', teamsError);
            }
        }

        const meeting = await prisma.meeting.create({
            data: {
                title,
                startTime: start,
                endTime: end,
                leadId: data.leadId,
                userId,
                description: data.notes,
                status: 'SCHEDULED',
                teamsJoinUrl,
                teamsEventId,
                provider: provider || 'local',
                meetingType,
                duration: durationMinutes,
            }
        });

        revalidatePath('/dashboard/agenda');
        return { success: true, meeting };
    } catch (error) {
        console.error('Error creating meeting:', error);
        return { success: false, error: 'Erro ao agendar reunião' };
    }
}

export async function deleteMeeting(id: string) {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Não autorizado' };

    try {
        await prisma.meeting.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });
        revalidatePath('/dashboard/agenda');
        return { success: true };
    } catch (error) {
        console.error('Error deleting meeting:', error);
        return { success: false, error: 'Erro ao cancelar reunião' };
    }
}

// --- Relatórios (Reports) Actions ---

async function ensureReportsAccess() {
    await ensureDashboardAnalyticsAccess();
}

async function getFinancialMetricsData(startDate: Date) {
    const [totalLeads, wonLeads, revenueData] = await Promise.all([
        prisma.lead.count({ where: { createdAt: { gte: startDate } } }),
        prisma.lead.count({ where: { status: 'WON', convertedAt: { gte: startDate } } }),
        prisma.lead.aggregate({
            where: { status: 'WON', convertedAt: { gte: startDate } },
            _sum: { estimatedValue: true }
        })
    ]);

    const totalRevenue = Number(revenueData._sum.estimatedValue || 0);
    const averageTicket = wonLeads > 0 ? totalRevenue / wonLeads : 0;
    const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

    return {
        totalRevenue,
        averageTicket,
        conversionRate,
        totalConverted: wonLeads
    };
}

async function getLeadsOverTimeData(startDate: Date) {
    const rows = await prisma.$queryRaw<Array<{ date: Date; count: number }>>`
        SELECT DATE("createdAt") AS date, COUNT(*)::int AS count
        FROM "Lead"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY DATE("createdAt") ASC
    `;

    return rows.map((row) => ({
        date: row.date.toISOString().split('T')[0],
        count: Number(row.count),
    }));
}

async function getSourceDistributionData(startDate: Date) {
    const groups = await prisma.lead.groupBy({
        by: ['source'],
        where: { createdAt: { gte: startDate } },
        _count: { _all: true }
    });

    return groups.map(g => ({
        source: g.source,
        count: g._count._all
    }));
}

export async function getReportsOverview(period: string = '30d') {
    await ensureReportsAccess();

    const startDate = getStartDate(period);
    const [financial, leadsOverTime, funnel, source, acquisition] = await Promise.all([
        getFinancialMetricsData(startDate),
        getLeadsOverTimeData(startDate),
        getFunnelMetrics(period),
        getSourceDistributionData(startDate),
        getAcquisitionFunnelMetrics(period),
    ]);

    return {
        financial,
        leadsOverTime,
        funnel,
        source,
        acquisition,
    };
}

export async function getFinancialMetrics(period: string = '30d') {
    await ensureReportsAccess();
    const startDate = getStartDate(period);
    return getFinancialMetricsData(startDate);
}

export async function getLeadsOverTime(period: string = '30d') {
    await ensureReportsAccess();
    const startDate = getStartDate(period);
    return getLeadsOverTimeData(startDate);
}

export async function getSourceDistribution(period: string = '30d') {
    await ensureReportsAccess();
    const startDate = getStartDate(period);
    return getSourceDistributionData(startDate);
}

export async function getExportData(period: string = '30d') {
    await ensureReportsAccess();
    const startDate = getStartDate(period);

    const leads = await prisma.lead.findMany({
        where: { createdAt: { gte: startDate } },
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
        estimatedValue: Number(lead.estimatedValue || 0),
        createdAt: lead.createdAt.toISOString(),
        convertedAt: lead.convertedAt?.toISOString() || null
    }));
}
