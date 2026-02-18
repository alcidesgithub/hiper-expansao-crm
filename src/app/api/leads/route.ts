import { NextResponse } from 'next/server';
import { Lead, LeadGrade, LeadSource, LeadStatus, Prisma } from '@prisma/client';
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
        if (stageId) {
            const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId }, select: { id: true } });
            if (!stage) {
                return NextResponse.json({ error: 'Etapa de pipeline inválida' }, { status: 400 });
            }
        } else {
            const firstStage = await prisma.pipelineStage.findFirst({
                where: { pipeline: { isActive: true } },
                orderBy: { order: 'asc' },
                select: { id: true },
            });
            if (!firstStage) {
                return NextResponse.json({ error: 'Nenhuma etapa ativa de pipeline encontrada' }, { status: 422 });
            }
            stageId = firstStage.id;
        }

        if (parsed.data.assignedUserId) {
            const assigned = await prisma.user.findUnique({
                where: { id: parsed.data.assignedUserId },
                select: { id: true, status: true },
            });
            if (!assigned || assigned.status !== 'ACTIVE') {
                return NextResponse.json({ error: 'Usuário responsável inválido ou inativo' }, { status: 400 });
            }
        }

        let assignedUserId = parsed.data.assignedUserId || null;

        if (user.role === 'CONSULTANT') {
            if (!user.id) return NextResponse.json({ error: 'Usuário inválido' }, { status: 401 });
            assignedUserId = user.id;
        }

        // --- SCORING & AUTOMATION ---

        // 1. Load Configuration
        const settings = await prisma.systemSettings.findMany({
            where: { key: { in: ['config.scoringCriteria.v1', 'config.automationRules.v1'] } },
        });

        const scoringCriteria = ((settings.find(s => s.key === 'config.scoringCriteria.v1')?.value) as unknown as DynamicScoringCriterion[]) || [];
        const automationRules = ((settings.find(s => s.key === 'config.automationRules.v1')?.value) as unknown as AutomationRule[]) || [];

        // 2. Prepare Lead Data for Evaluation
        const initialLeadData = {
            ...parsed.data,
            status: 'NEW' as LeadStatus,
            pipelineStageId: stageId,
            assignedUserId,
        };

        // 3. Calculate Score
        const scoringInput: Partial<Lead> & { customFields?: unknown } = {
            ...initialLeadData,
            phone: typeof initialLeadData.phone === 'string' ? initialLeadData.phone : '',
            company: initialLeadData.company ?? null,
        };
        const score = calculateLeadScore(scoringInput, scoringCriteria);

        // 4. Run Automation
        const allStages = await prisma.pipelineStage.findMany({ where: { pipelineId: (await prisma.pipeline.findFirst({ where: { isDefault: true } }))?.id } });
        const automationLeadInput: Partial<Lead> = {
            ...scoringInput,
            score,
        };
        const automationResult = processAutomationRules(
            automationLeadInput,
            automationRules,
            allStages
        );

        // 5. Apply Automation Updates
        const finalStageId = automationResult.updates.pipelineStageId || stageId;
        // If automation changed stage, we might want to check if it's valid, but we assume automation rules are valid.

        const lead = await prisma.lead.create({
            data: {
                name: parsed.data.name.trim(),
                email: parsed.data.email.trim(),
                phone: parsed.data.phone?.trim() || '',
                company: parsed.data.company?.trim() || null,
                source: parsed.data.source,
                status: 'NEW', // Automation might change this too if we allowed it, but for now stick to NEW unless stage implies otherwise
                score, // Persist calculated score
                assignedUserId,
                pipelineStageId: finalStageId,
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

        return NextResponse.json(lead, { status: 201 });
    } catch (error) {
        console.error('Error creating lead:', error);
        return NextResponse.json({ error: 'Erro ao criar lead' }, { status: 500 });
    }
}

