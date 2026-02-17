'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma, LeadSource, LeadPriority, LeadStatus, Lead } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { canAny, getLeadPermissions } from '@/lib/permissions';
import { buildLeadScope, mergeLeadWhere } from '@/lib/lead-scope';
import { subDays } from 'date-fns';
import { calculateLeadScore, calcularScore, type QualificationData, type DynamicScoringCriterion } from '@/lib/scoring';
import { DEFAULT_SCORING_CRITERIA } from '@/lib/config-options';

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

export async function getDashboardMetrics(period: string = '30d') {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

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

    console.log('[getLeadById] Lead finding result:', { id, found: !!lead });
    if (!lead) return null;

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
        permissions: getLeadPermissions(session.user, lead),
    };

    // Ensure serialization for Decimal and Date fields
    return JSON.parse(JSON.stringify(result));
}

export async function getFunnelMetrics(period: string = '30d') {
    const startDate = getStartDate(period);

    // Simplificado para os status do enum LeadStatus
    const statusCounts = await prisma.lead.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: { _all: true }
    });

    const funnelSteps = [
        { status: 'NEW', label: 'Novo Lead' },
        { status: 'CONTACTED', label: 'Em Contato' },
        { status: 'QUALIFIED', label: 'Qualificado' },
        { status: 'PROPOSAL', label: 'Proposta' },
        { status: 'NEGOTIATION', label: 'Negociação' },
        { status: 'WON', label: 'Convertido' }
    ];

    const funnel = funnelSteps.map(step => {
        const data = statusCounts.find(s => s.status === step.status);
        return {
            step: step.label,
            count: data?._count._all || 0
        };
    });

    const newLeads = funnel[0].count;
    const wonLeads = funnel[funnel.length - 1].count;
    const dropoffRate = newLeads > 0 ? Math.round(((newLeads - wonLeads) / newLeads) * 100) : 0;

    return {
        funnel,
        dropoffRate
    };
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

export async function getFunnelGateAnalytics(period: string = '30d') {
    const startDate = getStartDate(period);

    // Na nossa lógica, o gate de decisão está nos qualificationData (role do contato)
    const leads = await prisma.lead.findMany({
        where: { createdAt: { gte: startDate }, qualificationData: { not: Prisma.DbNull } },
        select: { qualificationData: true }
    });

    const totals = {
        total: leads.length,
        decisor: 0,
        influenciador: 0,
        pesquisador: 0
    };

    leads.forEach(lead => {
        const data = lead.qualificationData as { role?: string };
        const role = data?.role?.toLowerCase();
        if (role === 'decisor' || role === 'proprietário' || role === 'socio') totals.decisor++;
        else if (role === 'influenciador' || role === 'gerente') totals.influenciador++;
        else totals.pesquisador++;
    });

    const decisorRate = totals.total > 0 ? Math.round((totals.decisor / totals.total) * 100) : 0;

    return {
        totals: {
            ...totals,
            decisorRate
        }
    };
}

export async function getKanbanData() {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    const leadScope = await buildLeadScope(session.user);

    const [stages, leads] = await Promise.all([
        prisma.pipelineStage.findMany({
            orderBy: { order: 'asc' }
        }),
        prisma.lead.findMany({
            where: mergeLeadWhere({ status: { notIn: ['ARCHIVED'] } }, leadScope),
            orderBy: { updatedAt: 'desc' }
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
    capacidadePagamentoTotal: string;
    compromisso: string;
    // Metadata
    expectedCloseDate: string;
}

export async function createLead(data: CreateLeadData) {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Não autorizado' };

    try {
        const pipeline = await prisma.pipeline.findFirst({
            where: { isActive: true },
            include: {
                stages: { orderBy: { order: 'asc' } }
            }
        });

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
            capacidadePagamentoTotal: data.capacidadePagamentoTotal,
            compromisso: data.compromisso,
            desafios: [],
            historicoRedes: 'nunca',
            conscienciaInvestimento: 'quero-conhecer',
            reacaoValores: 'alto-saber-mais',
            capacidadeMarketing: 'planejamento',
            capacidadeAdmin: 'planejamento',
        };

        // Calculate Scores
        const legacyResult = calcularScore(fullQualData);

        // Try to get dynamic scoring settings if they exist
        const settings = await prisma.systemSettings.findFirst({
            where: { key: 'config.scoringCriteria.v1' }
        });
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
        include: {
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

        const meeting = await prisma.meeting.create({
            data: {
                title: `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} - Meeting`,
                startTime: start,
                endTime: end,
                leadId: data.leadId,
                userId: (session.user as { id: string }).id,
                description: data.notes,
                status: 'SCHEDULED',
                teamsJoinUrl: data.autoLink ? `https://teams.microsoft.com/l/meetup-join/mock-${Math.random().toString(36).substring(7)}` : null,
                provider: data.autoLink ? 'TEAMS' : null,
                meetingType: meetingType
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

export async function getFinancialMetrics(period: string = '30d') {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    const startDate = getStartDate(period);

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

export async function getLeadsOverTime(period: string = '30d') {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    const startDate = getStartDate(period);

    const leads = await prisma.lead.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' }
    });

    // Grouping by date in JS
    const grouped = leads.reduce((acc: Record<string, number>, lead) => {
        const date = lead.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(grouped).map(([date, count]) => ({
        date,
        count
    }));
}

export async function getSourceDistribution(period: string = '30d') {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    const startDate = getStartDate(period);

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

export async function getExportData(period: string = '30d') {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

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
