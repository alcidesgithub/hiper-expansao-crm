import { NextResponse } from 'next/server';
import { Lead, LeadGrade, LeadPriority, LeadSource, LeadStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { leadCreateSchema } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { buildLeadScope, mergeLeadWhere } from '@/lib/lead-scope';
import { can, canAny } from '@/lib/permissions';
import { buildLeadSelect } from '@/lib/lead-select';

import { calculateLeadScore, DynamicScoringCriterion } from '@/lib/scoring';
import { processAutomationRules, AutomationRule } from '@/lib/automation';
import { notifyActiveManagers, notifyAssignableUser } from '@/lib/crm-notifications';
import { buildDefaultAutomationRules, DEFAULT_SCORING_CRITERIA } from '@/lib/config-options';
const LEAD_GRADES: readonly LeadGrade[] = ['A', 'B', 'C', 'D', 'F'];
const LEAD_SOURCES: readonly LeadSource[] = ['WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE_ADS', 'LINKEDIN', 'EMAIL', 'PHONE', 'REFERRAL', 'EVENT', 'OTHER'];

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

export function __setAuthHandlerForTests(handler: AuthHandler): void {
    authHandler = handler;
}

export function __resetAuthHandlerForTests(): void {
    authHandler = auth;
}

function canView(user: SessionUser): boolean {
    return canAny(user, ['leads:read:all', 'leads:read:own']);
}

function canManage(user: SessionUser): boolean {
    return can(user, 'leads:write:own');
}

function parsePositiveInt(value: string | null, fallback: number, min: number, max: number): number {
    const parsed = Number.parseInt(value || '', 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

function getPeriodStart(period: string | null): Date | null {
    if (!period) return null;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 0;
    if (!days) return null;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function validateAssignableUser(userId: string): Promise<string | null> {
    const assigned = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, status: true, role: true },
    });
    if (!assigned || assigned.status !== 'ACTIVE') {
        return 'Usuario responsavel invalido ou inativo';
    }
    if (typeof assigned.role === 'string' && !['CONSULTANT', 'MANAGER'].includes(assigned.role)) {
        return 'Responsavel deve ser consultor ou manager ativo';
    }
    return null;
}

function mergeAutomationTags(
    customFields: unknown,
    actions: Array<{ type: string; target: string }>
): Prisma.InputJsonValue | undefined {
    const tagsToAdd = actions
        .filter((action) => action.type === 'add_tag')
        .map((action) => action.target.trim())
        .filter(Boolean);
    if (tagsToAdd.length === 0) return undefined;

    const base =
        customFields && typeof customFields === 'object' && !Array.isArray(customFields)
            ? { ...(customFields as Record<string, unknown>) }
            : {};
    const existingTags = Array.isArray(base.tags)
        ? base.tags.map((tag) => String(tag).trim()).filter(Boolean)
        : [];
    const tags = Array.from(new Set([...existingTags, ...tagsToAdd]));

    return { ...base, tags } as Prisma.InputJsonValue;
}

function normalizeText(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeDateInputToIso(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const raw = value.trim();
    if (!raw) return undefined;
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00.000Z` : raw;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
}

function parseDateInput(value: unknown): Date | null {
    const iso = normalizeDateInputToIso(value);
    if (!iso) return null;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveGateProfileFromCargo(cargo?: string): 'DECISOR' | 'INFLUENCIADOR' | 'PESQUISADOR' {
    if (!cargo) return 'PESQUISADOR';
    if (['proprietario', 'farmaceutico_rt', 'gerente_geral'].includes(cargo)) return 'DECISOR';
    if (['gerente_comercial'].includes(cargo)) return 'INFLUENCIADOR';
    return 'PESQUISADOR';
}

function resolveLeadGrade(score: number): LeadGrade {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 35) return 'D';
    return 'F';
}

function resolvePriorityFromGrade(grade: LeadGrade): LeadPriority {
    if (grade === 'A') return 'URGENT';
    if (grade === 'B') return 'HIGH';
    if (grade === 'C') return 'MEDIUM';
    return 'LOW';
}

function normalizeQualificationData(
    rawQualificationData: unknown,
    defaults: {
        name: string;
        email: string;
        phone?: string | null;
        company?: string | null;
        position?: string | null;
    }
): Prisma.InputJsonValue | undefined {
    const qualificationData =
        rawQualificationData && typeof rawQualificationData === 'object' && !Array.isArray(rawQualificationData)
            ? { ...(rawQualificationData as Record<string, unknown>) }
            : {};

    const nowIso = new Date().toISOString();
    const cargo = normalizeText(qualificationData.cargo) || normalizeText(defaults.position) || '';
    const numeroLojas = normalizeText(qualificationData.numeroLojas) || '';
    const faturamento = normalizeText(qualificationData.faturamento) || '';
    const tempoMercado = normalizeText(qualificationData.tempoMercado) || '';
    const motivacao = normalizeText(qualificationData.motivacao) || '';
    const conscienciaInvestimento = normalizeText(qualificationData.conscienciaInvestimento) || '';
    const reacaoValores = normalizeText(qualificationData.reacaoValores) || '';
    const capacidadePagamentoTotal = normalizeText(qualificationData.capacidadePagamentoTotal) || '';
    const compromisso = normalizeText(qualificationData.compromisso) || '';
    const desafios = Array.isArray(qualificationData.desafios)
        ? qualificationData.desafios.map((item) => String(item).trim()).filter(Boolean)
        : [];

    const hasStep2 = Boolean(cargo && numeroLojas && faturamento && tempoMercado);
    const hasStep3 = Boolean(motivacao || desafios.length > 0);
    const hasStep5 = Boolean(capacidadePagamentoTotal || compromisso || conscienciaInvestimento || reacaoValores);

    const normalized: Record<string, unknown> = {
        ...qualificationData,
        isDecisionMaker:
            typeof qualificationData.isDecisionMaker === 'boolean'
                ? qualificationData.isDecisionMaker
                : ['proprietario', 'farmaceutico_rt', 'gerente_geral'].includes(cargo),
        gateProfile:
            typeof qualificationData.gateProfile === 'string'
                ? qualificationData.gateProfile
                : resolveGateProfileFromCargo(cargo),
        nome: normalizeText(qualificationData.nome) || defaults.name,
        email: normalizeText(qualificationData.email) || defaults.email,
        telefone: normalizeText(qualificationData.telefone) || normalizeText(defaults.phone) || '',
        empresa: normalizeText(qualificationData.empresa) || normalizeText(defaults.company) || '',
        cargo,
        cargoSub: normalizeText(qualificationData.cargoSub) || '',
        numeroLojas,
        lojasSub: normalizeText(qualificationData.lojasSub) || '',
        faturamento,
        localizacao: normalizeText(qualificationData.localizacao) || normalizeText(qualificationData.state) || '',
        city: normalizeText(qualificationData.city) || '',
        state: normalizeText(qualificationData.state) || '',
        tempoMercado,
        desafios,
        motivacao,
        urgencia: normalizeText(qualificationData.urgencia) || '',
        historicoRedes: normalizeText(qualificationData.historicoRedes) || '',
        conscienciaInvestimento,
        reacaoValores,
        capacidadeMarketing: normalizeText(qualificationData.capacidadeMarketing) || '',
        capacidadeAdmin: normalizeText(qualificationData.capacidadeAdmin) || '',
        capacidadePagamentoTotal,
        compromisso,
        step2CompletedAt: normalizeDateInputToIso(qualificationData.step2CompletedAt) || (hasStep2 ? nowIso : undefined),
        step3CompletedAt: normalizeDateInputToIso(qualificationData.step3CompletedAt) || (hasStep3 ? nowIso : undefined),
        step5CompletedAt: normalizeDateInputToIso(qualificationData.step5CompletedAt) || (hasStep5 ? nowIso : undefined),
    };

    const sanitized = Object.fromEntries(
        Object.entries(normalized).filter(([, value]) => value !== undefined)
    );

    return Object.keys(sanitized).length > 0 ? (sanitized as Prisma.InputJsonValue) : undefined;
}

export async function GET(request: Request) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canView(user)) return NextResponse.json({ error: 'Sem permissão para visualizar leads' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();
    const source = searchParams.get('source');
    const period = searchParams.get('period');
    const page = parsePositiveInt(searchParams.get('page'), 1, 1, 100000);
    const limit = parsePositiveInt(searchParams.get('limit'), 25, 1, 100);

    try {
        const leadScope = await buildLeadScope(user);
        const baseWhere: Prisma.LeadWhereInput = {};
        if (grade && LEAD_GRADES.includes(grade as LeadGrade)) {
            baseWhere.grade = grade as LeadGrade;
        }
        if (status) {
            baseWhere.status = status as LeadStatus;
        } else {
            baseWhere.status = { not: 'ARCHIVED' as LeadStatus };
        }
        if (source && LEAD_SOURCES.includes(source as LeadSource)) {
            baseWhere.source = source as LeadSource;
        }

        const periodStart = getPeriodStart(period);
        if (periodStart) {
            baseWhere.createdAt = { gte: periodStart };
        }

        if (search) {
            baseWhere.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
            ];
        }

        const where = mergeLeadWhere(baseWhere, leadScope);

        const [leads, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                select: buildLeadSelect({
                    user,
                    includeRelations: true,
                    includeSensitive: true,
                }),
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.lead.count({ where }),
        ]);

        return NextResponse.json({
            leads,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
            permissions: {
                canManage: canManage(user),
                canAssign: can(user, 'leads:assign'),
            },
        });
    } catch (error) {
        console.error('Error fetching leads:', error);
        return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canManage(user)) return NextResponse.json({ error: 'Sem permissão para criar leads' }, { status: 403 });

    const ip = getClientIp(request);
    const rl = await rateLimit(`leads:create:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Muitas requisições. Tente novamente em breve.' }, { status: 429 });
    }

    try {
        const body = await request.json();
        const parsed = leadCreateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        let stageId = parsed.data.pipelineStageId || null;
        let stagePipelineId: string | null = null;
        if (stageId) {
            const stage = await prisma.pipelineStage.findUnique({
                where: { id: stageId },
                select: { id: true, pipelineId: true },
            });
            if (!stage) {
                return NextResponse.json({ error: 'Etapa de pipeline inválida' }, { status: 400 });
            }
            stagePipelineId = stage.pipelineId;
        } else {
            const firstStage = await prisma.pipelineStage.findFirst({
                where: { pipeline: { isActive: true } },
                orderBy: { order: 'asc' },
                select: { id: true, pipelineId: true },
            });
            if (!firstStage) {
                return NextResponse.json({ error: 'Nenhuma etapa ativa de pipeline encontrada' }, { status: 422 });
            }
            stageId = firstStage.id;
            stagePipelineId = firstStage.pipelineId;
        }

        if (parsed.data.assignedUserId) {
            const assignmentError = await validateAssignableUser(parsed.data.assignedUserId);
            if (assignmentError) {
                return NextResponse.json({ error: assignmentError }, { status: 400 });
            }
        }

        let assignedUserId = parsed.data.assignedUserId || null;

        if (user.role === 'CONSULTANT') {
            if (!user.id) return NextResponse.json({ error: 'Usuário inválido' }, { status: 401 });
            assignedUserId = user.id;
        }

        // --- SCORING & AUTOMATION ---

        const settings = await prisma.systemSettings.findMany({
            where: { key: { in: ['config.scoringCriteria.v1', 'config.automationRules.v1'] } },
        });

        const allStages = await prisma.pipelineStage.findMany({
            where: stagePipelineId ? { pipelineId: stagePipelineId } : undefined,
            orderBy: { order: 'asc' },
        });

        const configuredScoringCriteria = (settings.find((setting) => setting.key === 'config.scoringCriteria.v1')?.value) as
            | DynamicScoringCriterion[]
            | undefined;
        const configuredAutomationRules = (settings.find((setting) => setting.key === 'config.automationRules.v1')?.value) as
            | AutomationRule[]
            | undefined;

        const scoringCriteria = Array.isArray(configuredScoringCriteria) && configuredScoringCriteria.length > 0
            ? configuredScoringCriteria
            : DEFAULT_SCORING_CRITERIA;
        const automationRules = Array.isArray(configuredAutomationRules) && configuredAutomationRules.length > 0
            ? configuredAutomationRules
            : buildDefaultAutomationRules(allStages);

        const qualificationData = normalizeQualificationData(parsed.data.qualificationData, {
            name: parsed.data.name.trim(),
            email: parsed.data.email.trim(),
            phone: parsed.data.phone,
            company: parsed.data.company,
            position: parsed.data.position,
        });

        const initialLeadData: Partial<Lead> = {
            name: parsed.data.name.trim(),
            email: parsed.data.email.trim(),
            phone: parsed.data.phone?.trim() || '',
            company: parsed.data.company?.trim() || null,
            position: parsed.data.position?.trim() || null,
            source: parsed.data.source,
            status: 'NEW',
            assignedUserId,
            pipelineStageId: stageId,
            qualificationData: qualificationData as Prisma.JsonValue | undefined,
        };

        const score = calculateLeadScore(initialLeadData, scoringCriteria);
        const grade = resolveLeadGrade(score);
        const priority = parsed.data.priority || resolvePriorityFromGrade(grade);

        const automationLeadInput: Partial<Lead> = {
            ...initialLeadData,
            score,
            grade,
            priority,
        };
        const automationResult = processAutomationRules(automationLeadInput, automationRules, allStages);

        // 5. Apply Automation Updates
        const finalStageId = (
            typeof automationResult.updates.pipelineStageId === 'string' && automationResult.updates.pipelineStageId
                ? automationResult.updates.pipelineStageId
                : stageId
        );
        if (!finalStageId) {
            return NextResponse.json({ error: 'Etapa de pipeline inválida após automação' }, { status: 400 });
        }
        const finalStage = allStages.find((item) => item.id === finalStageId);
        const stageChangedByAutomation =
            typeof automationResult.updates.pipelineStageId === 'string' &&
            automationResult.updates.pipelineStageId.trim().length > 0;
        if (stageChangedByAutomation && !finalStage) {
            return NextResponse.json({ error: 'Regra de automação aponta para estágio inexistente' }, { status: 400 });
        }

        let finalAssignedUserId = assignedUserId;
        if (
            typeof automationResult.updates.assignedUserId === 'string' &&
            automationResult.updates.assignedUserId.trim()
        ) {
            finalAssignedUserId = automationResult.updates.assignedUserId.trim();
        }
        if (user.role === 'CONSULTANT') {
            if (!user.id) return NextResponse.json({ error: 'Usuário inválido' }, { status: 401 });
            finalAssignedUserId = user.id;
        }
        if (finalAssignedUserId) {
            const assignmentError = await validateAssignableUser(finalAssignedUserId);
            if (assignmentError) {
                return NextResponse.json({ error: `Regra de automação inválida: ${assignmentError}` }, { status: 400 });
            }
        }

        let resolvedStatus: LeadStatus = 'NEW';
        if (finalStage?.isWon) resolvedStatus = 'WON';
        else if (finalStage?.isLost) resolvedStatus = 'LOST';

        const mergedCustomFields = mergeAutomationTags(null, automationResult.actions);

        const lead = await prisma.lead.create({
            data: {
                name: parsed.data.name.trim(),
                email: parsed.data.email.trim(),
                phone: parsed.data.phone?.trim() || '',
                company: parsed.data.company?.trim() || null,
                position: parsed.data.position?.trim() || null,
                source: parsed.data.source,
                status: resolvedStatus,
                score,
                grade,
                priority,
                expectedCloseDate: parseDateInput(parsed.data.expectedCloseDate),
                assignedUserId: finalAssignedUserId,
                pipelineStageId: finalStageId,
                ...(qualificationData ? { qualificationData } : {}),
                ...(resolvedStatus === 'WON' ? { convertedAt: new Date(), lostAt: null } : {}),
                ...(resolvedStatus === 'LOST' ? { lostAt: new Date(), convertedAt: null } : {}),
                ...(mergedCustomFields ? { customFields: mergedCustomFields } : {}),
            },
            select: buildLeadSelect({
                user,
                includeRelations: true,
                includeSensitive: true,
            }),
        });

        // 6. Execute Side Effects (Notifications)
        if (automationResult.notifications.length > 0) {
            // For prototype/MVP, just log or create an activity/notification record
            // In a real app, this would trigger email/push
            await prisma.activity.create({
                data: {
                    leadId: lead.id,
                    userId: user.id || 'system',
                    type: 'NOTE',
                    title: 'Automação executada',
                    description: automationResult.notifications.map(n => n.message).join('\n'),
                }
            });
        }

        if (user.id) {
            await prisma.activity.create({
                data: {
                    leadId: lead.id,
                    userId: user.id,
                    type: 'STATUS_CHANGE',
                    title: 'Lead criado manualmente',
                    description: `Status inicial: ${lead.status}`,
                },
            });
        }

        await logAudit({
            userId: user.id,
            action: 'CREATE',
            entity: 'Lead',
            entityId: lead.id,
            changes: {
                name: lead.name,
                email: lead.email,
                source: lead.source,
                pipelineStageId: lead.pipelineStageId,
            },
        });

        try {
            await notifyActiveManagers({
                title: 'Novo lead criado',
                message: `${lead.name} foi criado no CRM.`,
                link: `/dashboard/leads/${lead.id}`,
                emailSubject: 'Novo lead criado no CRM',
            });
        } catch (notifyError) {
            console.error('Error notifying managers after lead creation:', notifyError);
        }

        if (user.role === 'MANAGER' && finalAssignedUserId && finalAssignedUserId !== user.id) {
            try {
                await notifyAssignableUser(finalAssignedUserId, {
                    title: 'Lead transferido para voce',
                    message: `${lead.name} foi transferido para sua carteira.`,
                    link: `/dashboard/leads/${lead.id}`,
                    emailSubject: 'Novo lead transferido para voce',
                });
            } catch (notifyError) {
                console.error('Error notifying assigned user after lead transfer:', notifyError);
            }
        }

        return NextResponse.json(lead, { status: 201 });
    } catch (error) {
        console.error('Error creating lead:', error);
        return NextResponse.json({ error: 'Erro ao criar lead' }, { status: 500 });
    }
}
