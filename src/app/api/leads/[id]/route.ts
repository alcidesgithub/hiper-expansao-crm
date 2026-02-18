import { NextResponse } from 'next/server';
import { Lead, LeadGrade, LeadStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { leadUpdateSchema } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
import { buildLeadScope, mergeLeadWhere } from '@/lib/lead-scope';
import { can, canAny, getLeadPermissions } from '@/lib/permissions';
import { buildLeadSelect } from '@/lib/lead-select';
import { calculateLeadScore, DynamicScoringCriterion } from '@/lib/scoring';
import { processAutomationRules, AutomationRule } from '@/lib/automation';
import { notifyAssignableUser } from '@/lib/crm-notifications';
import { buildDefaultAutomationRules, DEFAULT_SCORING_CRITERIA } from '@/lib/config-options';

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

function normalizeQualificationDataForUpdate(params: {
    incoming: unknown;
    current: unknown;
    defaults: {
        name?: string;
        email?: string;
        phone?: string | null;
        company?: string | null;
        position?: string | null;
    };
}): Prisma.InputJsonValue | null | undefined {
    const { incoming, current, defaults } = params;
    if (incoming === undefined) return undefined;
    if (incoming === null) return null;

    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return undefined;

    const currentData =
        current && typeof current === 'object' && !Array.isArray(current)
            ? (current as Record<string, unknown>)
            : {};
    const merged = { ...currentData, ...(incoming as Record<string, unknown>) };

    const nowIso = new Date().toISOString();
    const cargo = normalizeText(merged.cargo) || normalizeText(defaults.position) || '';
    const numeroLojas = normalizeText(merged.numeroLojas) || '';
    const faturamento = normalizeText(merged.faturamento) || '';
    const tempoMercado = normalizeText(merged.tempoMercado) || '';
    const motivacao = normalizeText(merged.motivacao) || '';
    const conscienciaInvestimento = normalizeText(merged.conscienciaInvestimento) || '';
    const reacaoValores = normalizeText(merged.reacaoValores) || '';
    const capacidadePagamentoTotal = normalizeText(merged.capacidadePagamentoTotal) || '';
    const compromisso = normalizeText(merged.compromisso) || '';
    const desafios = Array.isArray(merged.desafios)
        ? merged.desafios.map((item) => String(item).trim()).filter(Boolean)
        : [];

    const hasStep2 = Boolean(cargo && numeroLojas && faturamento && tempoMercado);
    const hasStep3 = Boolean(motivacao || desafios.length > 0);
    const hasStep5 = Boolean(capacidadePagamentoTotal || compromisso || conscienciaInvestimento || reacaoValores);

    const normalized: Record<string, unknown> = {
        ...merged,
        isDecisionMaker:
            typeof merged.isDecisionMaker === 'boolean'
                ? merged.isDecisionMaker
                : ['proprietario', 'farmaceutico_rt', 'gerente_geral'].includes(cargo),
        gateProfile:
            typeof merged.gateProfile === 'string'
                ? merged.gateProfile
                : resolveGateProfileFromCargo(cargo),
        nome: normalizeText(merged.nome) || normalizeText(defaults.name) || '',
        email: normalizeText(merged.email) || normalizeText(defaults.email) || '',
        telefone: normalizeText(merged.telefone) || normalizeText(defaults.phone) || '',
        empresa: normalizeText(merged.empresa) || normalizeText(defaults.company) || '',
        cargo,
        cargoSub: normalizeText(merged.cargoSub) || '',
        numeroLojas,
        lojasSub: normalizeText(merged.lojasSub) || '',
        faturamento,
        localizacao: normalizeText(merged.localizacao) || normalizeText(merged.state) || '',
        city: normalizeText(merged.city) || '',
        state: normalizeText(merged.state) || '',
        tempoMercado,
        desafios,
        motivacao,
        urgencia: normalizeText(merged.urgencia) || '',
        historicoRedes: normalizeText(merged.historicoRedes) || '',
        conscienciaInvestimento,
        reacaoValores,
        capacidadeMarketing: normalizeText(merged.capacidadeMarketing) || '',
        capacidadeAdmin: normalizeText(merged.capacidadeAdmin) || '',
        capacidadePagamentoTotal,
        compromisso,
        step2CompletedAt: normalizeDateInputToIso(merged.step2CompletedAt) || (hasStep2 ? nowIso : undefined),
        step3CompletedAt: normalizeDateInputToIso(merged.step3CompletedAt) || (hasStep3 ? nowIso : undefined),
        step5CompletedAt: normalizeDateInputToIso(merged.step5CompletedAt) || (hasStep5 ? nowIso : undefined),
    };

    const sanitized = Object.fromEntries(
        Object.entries(normalized).filter(([, value]) => value !== undefined)
    );

    return sanitized as Prisma.InputJsonValue;
}

function resolveLeadGrade(score: number): LeadGrade {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 35) return 'D';
    return 'F';
}

async function getLeadDetails(id: string, scope: Prisma.LeadWhereInput, user: SessionUser) {
    const leadSelect = buildLeadSelect({
        user,
        includeRelations: true,
        includeSensitive: true,
        includeQualificationData: true,
        includeRoiData: true,
    });

    const lead = await prisma.lead.findFirst({
        where: mergeLeadWhere({ id }, scope),
        select: {
            ...leadSelect,
            pipelineStage: true,
            assignedUser: { select: { id: true, name: true, email: true } },
            activities: { orderBy: { createdAt: 'desc' }, take: 20, include: { user: { select: { id: true, name: true } } } },
            notes: { orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }], take: 40, include: { user: { select: { id: true, name: true } } } },
            meetings: { orderBy: { startTime: 'desc' }, take: 15 },
            tasks: { orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }], take: 40, include: { user: { select: { id: true, name: true } } } },
        },
    });

    if (!lead) return null;

    const pipelineId = lead.pipelineStage?.pipelineId || null;
    const availableStages = pipelineId
        ? await prisma.pipelineStage.findMany({
            where: { pipelineId },
            orderBy: { order: 'asc' },
            select: { id: true, name: true, order: true, color: true, isWon: true, isLost: true },
        })
        : [];

    return {
        ...lead,
        availableStages,
    };
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canView(user)) return NextResponse.json({ error: 'Sem permissão para visualizar leads' }, { status: 403 });

    const { id } = await params;

    try {
        const leadScope = await buildLeadScope(user);
        const lead = await getLeadDetails(id, leadScope, user);
        if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

        return NextResponse.json({
            ...lead,
            permissions: getLeadPermissions(user, lead),
        });
    } catch (error) {
        console.error('Error fetching lead:', error);
        return NextResponse.json({ error: 'Erro ao buscar lead' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canManage(user)) return NextResponse.json({ error: 'Sem permissão para editar leads' }, { status: 403 });

    const { id } = await params;

    try {
        const body = await request.json();
        const parsed = leadUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const data = parsed.data;
        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
        }

        if (data.pipelineStageId !== undefined && !can(user, 'pipeline:advance')) {
            return NextResponse.json({ error: 'Sem permissão para avançar pipeline' }, { status: 403 });
        }

        const leadScope = await buildLeadScope(user);
        const existing = await prisma.lead.findFirst({
            where: mergeLeadWhere({ id }, leadScope),
            include: { pipelineStage: { select: { id: true, name: true, pipelineId: true } } },
        });

        if (!existing) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

        if (data.assignedUserId) {
            const assignmentError = await validateAssignableUser(data.assignedUserId);
            if (assignmentError) {
                return NextResponse.json({ error: assignmentError }, { status: 400 });
            }
        }

        if (data.assignedUserId !== undefined && !can(user, 'leads:assign')) {
            if (!user.id || data.assignedUserId !== user.id) {
                return NextResponse.json(
                    { error: 'Sem permissão para atribuir leads' },
                    { status: 403 }
                );
            }
        }

        if (user.role === 'CONSULTANT') {
            if (!user.id) return NextResponse.json({ error: 'Usuário inválido' }, { status: 401 });
            if (data.assignedUserId && data.assignedUserId !== user.id) {
                return NextResponse.json(
                    { error: 'Sem permissão para transferir este lead' },
                    { status: 403 }
                );
            }
        }

        const stageNameBefore = existing.pipelineStage?.name || null;
        let stageNameAfter: string | null = null;
        let resolvedStatus = data.status || existing.status;

        if (data.pipelineStageId) {
            const stage = await prisma.pipelineStage.findUnique({
                where: { id: data.pipelineStageId },
                select: { id: true, name: true, pipelineId: true, isWon: true, isLost: true },
            });
            if (!stage) return NextResponse.json({ error: 'Etapa de pipeline não encontrada' }, { status: 400 });

            if (existing.pipelineStage?.pipelineId && existing.pipelineStage.pipelineId !== stage.pipelineId) {
                return NextResponse.json({ error: 'Etapa não pertence ao mesmo pipeline do lead' }, { status: 400 });
            }

            stageNameAfter = stage.name;
            if (!data.status) {
                if (stage.isWon) resolvedStatus = 'WON';
                else if (stage.isLost) resolvedStatus = 'LOST';
                else if (existing.status === 'WON' || existing.status === 'LOST' || existing.status === 'ARCHIVED') resolvedStatus = 'PROPOSAL';
            }
        }

        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.phone !== undefined) updateData.phone = data.phone || '';
        if (data.company !== undefined) updateData.company = data.company;
        if (data.position !== undefined) updateData.position = data.position;
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.expectedCloseDate !== undefined) updateData.expectedCloseDate = parseDateInput(data.expectedCloseDate);
        if (data.pipelineStageId !== undefined) updateData.pipelineStageId = data.pipelineStageId;
        if (data.assignedUserId !== undefined) updateData.assignedUserId = data.assignedUserId;

        const normalizedQualificationData = normalizeQualificationDataForUpdate({
            incoming: data.qualificationData,
            current: existing.qualificationData,
            defaults: {
                name: data.name ?? existing.name,
                email: data.email ?? existing.email,
                phone: data.phone ?? existing.phone,
                company: data.company ?? existing.company,
                position: data.position ?? existing.position,
            },
        });
        if (data.qualificationData !== undefined) {
            updateData.qualificationData = normalizedQualificationData;
        }
        const qualificationDataForEvaluation = (
            data.qualificationData !== undefined
                ? normalizedQualificationData
                : existing.qualificationData
        ) as Prisma.JsonValue | null | undefined;
        const expectedCloseDateForEvaluation =
            data.expectedCloseDate !== undefined
                ? parseDateInput(data.expectedCloseDate)
                : existing.expectedCloseDate;

        // --- SCORING & AUTOMATION ---

        // Only run if not archived/lost/won or if explicitly reactivating? 
        // For simplicity, run if active.
        if (existing.status !== 'ARCHIVED' && existing.status !== 'WON' && existing.status !== 'LOST') {
            const settings = await prisma.systemSettings.findMany({
                where: { key: { in: ['config.scoringCriteria.v1', 'config.automationRules.v1'] } },
            });
            const configuredScoringCriteria = (settings.find((setting) => setting.key === 'config.scoringCriteria.v1')?.value) as
                | DynamicScoringCriterion[]
                | undefined;

            // Merge for evaluation
            const leadForEval = {
                ...existing,
                ...data, // overwrite with updates
                expectedCloseDate: expectedCloseDateForEvaluation,
                qualificationData: qualificationDataForEvaluation,
                // ensure numeric fields are numbers if they came as strings in JSON? 
                // leadUpdateSchema handles types, so data.estimatedValue should be correct type if defined.
            };

            const scoringInput: Partial<Lead> & { customFields?: unknown } = {
                ...leadForEval,
                phone: typeof leadForEval.phone === 'string' ? leadForEval.phone : '',
            };
            const scoringCriteria = Array.isArray(configuredScoringCriteria) && configuredScoringCriteria.length > 0
                ? configuredScoringCriteria
                : DEFAULT_SCORING_CRITERIA;
            const newScore = calculateLeadScore(scoringInput, scoringCriteria);
            const newGrade = resolveLeadGrade(newScore);
            updateData.score = newScore;
            updateData.grade = newGrade;

            const allStages = await prisma.pipelineStage.findMany({
                where: { pipelineId: existing.pipelineStage?.pipelineId || (await prisma.pipeline.findFirst({ where: { isDefault: true } }))?.id },
                orderBy: { order: 'asc' },
            });
            const configuredAutomationRules = (settings.find((setting) => setting.key === 'config.automationRules.v1')?.value) as
                | AutomationRule[]
                | undefined;
            const automationRules = Array.isArray(configuredAutomationRules) && configuredAutomationRules.length > 0
                ? configuredAutomationRules
                : buildDefaultAutomationRules(allStages);

            const automationLeadInput: Partial<Lead> = {
                ...scoringInput,
                score: newScore,
                grade: newGrade,
            };
            const automationResult = processAutomationRules(
                automationLeadInput,
                automationRules,
                allStages
            );

            if (automationResult.updates.pipelineStageId) {
                const nextStageId = String(automationResult.updates.pipelineStageId);
                const stage = allStages.find((item) => item.id === nextStageId);
                if (!stage) {
                    return NextResponse.json(
                        { error: 'Regra de automação aponta para etapa inválida' },
                        { status: 400 }
                    );
                }

                updateData.pipelineStageId = nextStageId;
                stageNameAfter = stage.name;
                if (!data.status) {
                    if (stage.isWon) resolvedStatus = 'WON';
                    else if (stage.isLost) resolvedStatus = 'LOST';
                    else resolvedStatus = 'PROPOSAL';
                }
            }

            if (
                typeof automationResult.updates.assignedUserId === 'string' &&
                automationResult.updates.assignedUserId.trim()
            ) {
                updateData.assignedUserId = automationResult.updates.assignedUserId.trim();
            }

            if (user.role === 'CONSULTANT') {
                if (!user.id) return NextResponse.json({ error: 'Usuário inválido' }, { status: 401 });
                updateData.assignedUserId = user.id;
            }

            if (typeof updateData.assignedUserId === 'string' && updateData.assignedUserId.trim()) {
                const assignmentError = await validateAssignableUser(updateData.assignedUserId.trim());
                if (assignmentError) {
                    return NextResponse.json({ error: `Regra de automação inválida: ${assignmentError}` }, { status: 400 });
                }
            }

            const mergedCustomFields = mergeAutomationTags(existing.customFields, automationResult.actions);
            if (mergedCustomFields) {
                updateData.customFields = mergedCustomFields;
            }

            // Notification side effect
            if (automationResult.notifications.length > 0) {
                await prisma.activity.create({
                    data: {
                        leadId: id,
                        userId: user.id || 'system',
                        type: 'NOTE',
                        title: 'Automação (Update)',
                        description: automationResult.notifications.map(n => n.message).join('\n'),
                    }
                });
            }
        }

        updateData.status = resolvedStatus;
        if (resolvedStatus === 'WON') {
            updateData.convertedAt = new Date();
            updateData.lostAt = null;
        } else if (resolvedStatus === 'LOST') {
            updateData.lostAt = new Date();
            updateData.convertedAt = null;
        } else if (data.status !== undefined || data.pipelineStageId !== undefined) {
            updateData.convertedAt = null;
            updateData.lostAt = null;
        }

        const updated = await prisma.lead.update({
            where: { id },
            data: updateData,
            select: buildLeadSelect({
                user,
                includeRelations: true,
                includeSensitive: true,
                includeQualificationData: true,
                includeRoiData: true,
            }),
        });

        const assignmentChanged = existing.assignedUserId !== updated.assignedUserId;
        if (assignmentChanged && user.role === 'MANAGER' && updated.assignedUserId && updated.assignedUserId !== user.id) {
            try {
                await notifyAssignableUser(updated.assignedUserId, {
                    title: 'Lead transferido para voce',
                    message: `${updated.name} foi transferido para sua carteira.`,
                    link: `/dashboard/leads/${id}`,
                    emailSubject: 'Novo lead transferido para voce',
                });
            } catch (notifyError) {
                console.error('Error notifying assigned user after lead update:', notifyError);
            }
        }

        if (user.id && existing.pipelineStageId !== updated.pipelineStageId) {
            await prisma.activity.create({
                data: {
                    leadId: id,
                    userId: user.id,
                    type: 'STAGE_CHANGE',
                    title: 'Etapa do pipeline alterada',
                    description: `De ${stageNameBefore || 'Sem etapa'} para ${stageNameAfter || 'Sem etapa'}`,
                },
            });
        }

        if (user.id && existing.status !== resolvedStatus) {
            await prisma.activity.create({
                data: {
                    leadId: id,
                    userId: user.id,
                    type: 'STATUS_CHANGE',
                    title: 'Status do lead alterado',
                    description: `De ${existing.status} para ${resolvedStatus}`,
                },
            });
        }

        await logAudit({
            userId: user.id,
            action: 'UPDATE',
            entity: 'Lead',
            entityId: id,
            changes: {
                ...data,
                resolvedStatus,
                previousStatus: existing.status,
            } as Record<string, unknown>,
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating lead:', error);
        return NextResponse.json({ error: 'Erro ao atualizar lead' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!can(user, 'leads:delete')) return NextResponse.json({ error: 'Sem permissão para arquivar leads' }, { status: 403 });

    const { id } = await params;

    try {
        const leadScope = await buildLeadScope(user);
        const existing = await prisma.lead.findFirst({
            where: mergeLeadWhere({ id }, leadScope),
            select: { id: true, status: true },
        });

        if (!existing) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

        if (existing.status !== 'ARCHIVED') {
            await prisma.lead.update({
                where: { id },
                data: {
                    status: 'ARCHIVED' as LeadStatus,
                },
            });

            if (user.id) {
                await prisma.activity.create({
                    data: {
                        leadId: id,
                        userId: user.id,
                        type: 'STATUS_CHANGE',
                        title: 'Lead arquivado',
                        description: `Status alterado de ${existing.status} para ARCHIVED`,
                    },
                });
            }
        }

        await logAudit({
            userId: user.id,
            action: 'DELETE',
            entity: 'Lead',
            entityId: id,
            changes: { softDelete: true },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error archiving lead:', error);
        return NextResponse.json({ error: 'Erro ao arquivar lead' }, { status: 500 });
    }
}

