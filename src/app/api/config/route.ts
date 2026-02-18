import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { can, canAny } from '@/lib/permissions';
import {
    AUTOMATION_ACTION_TYPES,
    AUTOMATION_OPERATORS,
    AUTOMATION_TRIGGER_FIELD_OPTIONS,
    buildDefaultAutomationRules,
    DEFAULT_SCORING_CRITERIA,
    SCORING_FIELD_OPTIONS,
    SCORING_OPERATORS,
} from '@/lib/config-options';
const LEGACY_RESERVED_STAGE_IDS = new Set(['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5', 'stage-6', 'stage-7', 'stage-8']);

const DEFAULT_PIPELINE_NAME = 'Funil de Expansão';
const DEFAULT_STAGES = [
    { name: 'Leads Novos', color: '#EAB308', order: 1, isWon: false, isLost: false },
    { name: 'Call Agendada', color: '#3B82F6', order: 2, isWon: false, isLost: false },
    { name: 'Aguardando Call', color: '#6366F1', order: 3, isWon: false, isLost: false },
    { name: 'Call Realizada', color: '#F59E0B', order: 4, isWon: false, isLost: false },
    { name: 'Proposta Enviada', color: '#F97316', order: 5, isWon: false, isLost: false },
    { name: 'Em Decisão', color: '#8B5CF6', order: 6, isWon: false, isLost: false },
    { name: 'Fechado', color: '#22C55E', order: 7, isWon: true, isLost: false },
    { name: 'Sem Fit', color: '#6B7280', order: 8, isWon: false, isLost: true },
] as const;

const SCORING_FIELD_KEYS = new Set(SCORING_FIELD_OPTIONS.map((option) => option.key));
const SCORING_OPERATOR_KEYS = new Set(SCORING_OPERATORS.map((option) => option.value));
const AUTOMATION_TRIGGER_FIELD_KEYS = new Set(AUTOMATION_TRIGGER_FIELD_OPTIONS.map((option) => option.key));
const AUTOMATION_OPERATOR_KEYS = new Set(AUTOMATION_OPERATORS.map((option) => option.value));

const scoringCriterionSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(2),
    subtitle: z.string().optional().default(''),
    category: z.enum(['PROFILE', 'FINANCIAL', 'BEHAVIOR']),
    fieldKey: z.string().min(1).default('qualificationData.step2CompletedAt'),
    operator: z.string().min(1).default('exists'),
    expectedValue: z.string().optional().default(''),
    value: z.number().min(0).max(100),
    min: z.number().min(0).max(100).default(0),
    max: z.number().min(0).max(100).default(100),
});

const automationRuleSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(2),
    enabled: z.boolean(),
    triggerField: z.string().min(1),
    operator: z.string().min(1).default('='),
    triggerValue: z.string().default(''),
    actionType: z.enum(AUTOMATION_ACTION_TYPES.map((option) => option.value) as [string, ...string[]]),
    actionTarget: z.string().min(1),
});

const pipelineStageSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    isWon: z.boolean().default(false),
    isLost: z.boolean().default(false),
});

const configPayloadSchema = z.object({
    scoringCriteria: z.array(scoringCriterionSchema).min(1),
    automationRules: z.array(automationRuleSchema),
    stages: z.array(pipelineStageSchema).min(2),
});

interface SessionUser {
    id?: string;
    role?: string;
    permissions?: string[];
}

type StageEntity = {
    id: string;
    name: string;
    color: string;
    isWon: boolean;
    isLost: boolean;
    order: number;
    automations: Prisma.JsonValue | null;
};

function canView(user?: SessionUser | null): boolean {
    return canAny(user, ['pipeline:configure', 'system:configure']);
}

function canManage(user?: SessionUser | null): boolean {
    return can(user, 'pipeline:configure');
}

function normalizeStageName(name: string): string {
    return name.trim().toLowerCase();
}

function operatorRequiresValue(operator: string): boolean {
    return operator !== 'exists' && operator !== 'not_exists';
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

function sanitizeCriteria(value: unknown) {
    const parsed = z.array(scoringCriterionSchema).safeParse(value);
    if (!parsed.success) return DEFAULT_SCORING_CRITERIA;

    const raw = Array.isArray(value) ? value : [];
    const hasDynamicFieldSelection = raw.some((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        const fieldKey = (item as Record<string, unknown>).fieldKey;
        return typeof fieldKey === 'string' && fieldKey.length > 0;
    });

    return hasDynamicFieldSelection ? parsed.data : DEFAULT_SCORING_CRITERIA;
}

function sanitizeRules(value: unknown, stages: StageEntity[]) {
    const parsed = z.array(automationRuleSchema).safeParse(value);
    if (parsed.success) {
        return parsed.data.map((rule) => {
            if (rule.actionType !== 'move_stage') return rule;
            const byId = stages.find((stage) => stage.id === rule.actionTarget);
            if (byId) return rule;

            const byName = stages.find((stage) => stage.name.toLowerCase() === rule.actionTarget.toLowerCase());
            if (!byName) return rule;
            return { ...rule, actionTarget: byName.id };
        });
    }
    return buildDefaultAutomationRules(stages);
}

function isReservedStage(automations: Prisma.JsonValue | null): boolean {
    if (!automations || typeof automations !== 'object' || Array.isArray(automations)) return false;
    return (automations as Record<string, unknown>).systemReserved === true;
}

function ensureReservedAutomation(automations: Prisma.JsonValue | null): Prisma.InputJsonValue {
    if (automations && typeof automations === 'object' && !Array.isArray(automations)) {
        return { ...(automations as Record<string, unknown>), systemReserved: true } as Prisma.InputJsonValue;
    }
    return { systemReserved: true } as Prisma.InputJsonValue;
}

async function ensureActivePipeline(tx: Prisma.TransactionClient) {
    let pipelines = await tx.pipeline.findMany({
        include: {
            stages: {
                orderBy: { order: 'asc' },
                select: { id: true, name: true, color: true, isWon: true, isLost: true, order: true, automations: true },
            },
        },
        orderBy: [{ isActive: 'desc' }, { isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    if (pipelines.length === 0) {
        const createdPipeline = await tx.pipeline.create({
            data: {
                id: 'pipeline-default',
                name: DEFAULT_PIPELINE_NAME,
                isActive: true,
                isDefault: true,
                stages: {
                    create: DEFAULT_STAGES.map((stage) => ({
                        ...stage,
                        automations: { systemReserved: true } as Prisma.InputJsonValue,
                    })),
                },
            },
            include: {
                stages: {
                    orderBy: { order: 'asc' },
                    select: { id: true, name: true, color: true, isWon: true, isLost: true, order: true, automations: true },
                },
            },
        });
        return createdPipeline;
    }

    const pipeline =
        pipelines.find((item) => item.id === 'pipeline-default') ||
        pipelines.find((item) => item.isActive) ||
        pipelines[0];

    await tx.pipeline.updateMany({
        where: {
            id: { not: pipeline.id },
            OR: [{ isActive: true }, { isDefault: true }],
        },
        data: { isActive: false, isDefault: false },
    });

    if (!pipeline.isActive || !pipeline.isDefault) {
        await tx.pipeline.update({
            where: { id: pipeline.id },
            data: { isActive: true, isDefault: true },
        });
    }

    const legacyReservedStages = pipeline.stages.filter(
        (stage) => LEGACY_RESERVED_STAGE_IDS.has(stage.id) && !isReservedStage(stage.automations)
    );

    for (const stage of legacyReservedStages) {
        await tx.pipelineStage.update({
            where: { id: stage.id },
            data: { automations: ensureReservedAutomation(stage.automations) },
        });
    }

    if (legacyReservedStages.length > 0 || !pipeline.isActive || !pipeline.isDefault) {
        pipelines = await tx.pipeline.findMany({
            where: { id: pipeline.id },
            include: {
                stages: {
                    orderBy: { order: 'asc' },
                    select: { id: true, name: true, color: true, isWon: true, isLost: true, order: true, automations: true },
                },
            },
        });
    }

    let normalized = pipelines.find((item) => item.id === pipeline.id) || pipeline;

    if (normalized.stages.length === 0) {
        await tx.pipelineStage.createMany({
            data: DEFAULT_STAGES.map((stage) => ({
                pipelineId: normalized.id,
                name: stage.name,
                color: stage.color,
                order: stage.order,
                isWon: stage.isWon,
                isLost: stage.isLost,
                automations: { systemReserved: true } as Prisma.InputJsonValue,
            })),
        });

        normalized = await tx.pipeline.findUniqueOrThrow({
            where: { id: normalized.id },
            include: {
                stages: {
                    orderBy: { order: 'asc' },
                    select: { id: true, name: true, color: true, isWon: true, isLost: true, order: true, automations: true },
                },
            },
        });
    }

    return normalized;
}

function buildConfigResponse(params: {
    canManageConfig: boolean;
    pipelineName: string;
    stages: StageEntity[];
    scoringCriteria: ReturnType<typeof sanitizeCriteria>;
    automationRules: ReturnType<typeof sanitizeRules>;
    users: Array<{ id: string; name: string | null; role: string }>;
}) {
    return {
        permissions: {
            canManage: params.canManageConfig,
        },
        pipeline: {
            name: params.pipelineName,
            stages: params.stages.map((stage) => ({
                id: stage.id,
                name: stage.name,
                color: stage.color,
                isWon: stage.isWon,
                isLost: stage.isLost,
                order: stage.order,
                reserved: isReservedStage(stage.automations),
            })),
        },
        scoringCriteria: params.scoringCriteria,
        automationRules: params.automationRules,
        users: params.users,
        catalogs: {
            scoringFields: SCORING_FIELD_OPTIONS,
            scoringOperators: SCORING_OPERATORS,
            automationTriggerFields: AUTOMATION_TRIGGER_FIELD_OPTIONS,
            automationOperators: AUTOMATION_OPERATORS,
            automationActionTypes: AUTOMATION_ACTION_TYPES,
        },
    };
}

// GET /api/config
export async function GET() {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canView(user)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

    try {
        const result = await prisma.$transaction(async (tx) => {
            const pipeline = await ensureActivePipeline(tx);
            const settings = await tx.systemSettings.findMany({
                where: { key: { in: ['config.scoringCriteria.v1', 'config.automationRules.v1'] } },
            });

            const scoringSetting = settings.find((setting) => setting.key === 'config.scoringCriteria.v1');
            const rulesSetting = settings.find((setting) => setting.key === 'config.automationRules.v1');

            const users = await tx.user.findMany({
                where: { status: 'ACTIVE' },
                select: { id: true, name: true, role: true },
                orderBy: { name: 'asc' },
            });

            return buildConfigResponse({
                canManageConfig: canManage(user),
                pipelineName: pipeline.name,
                stages: pipeline.stages,
                scoringCriteria: sanitizeCriteria(scoringSetting?.value),
                automationRules: sanitizeRules(rulesSetting?.value, pipeline.stages),
                users,
            });
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching config:', error);
        return NextResponse.json({ error: 'Erro ao carregar configurações' }, { status: 500 });
    }
}

// PUT /api/config
export async function PUT(request: Request) {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canManage(user)) return NextResponse.json({ error: 'Sem permissão para editar configurações' }, { status: 403 });

    try {
        const body = await request.json();
        const parsed = configPayloadSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const wonCount = parsed.data.stages.filter((stage) => stage.isWon).length;
        const lostCount = parsed.data.stages.filter((stage) => stage.isLost).length;
        if (wonCount > 1 || lostCount > 1) {
            return NextResponse.json(
                { error: 'Apenas um estágio pode ser Ganho e um pode ser Perdido' },
                { status: 400 }
            );
        }

        for (const criterion of parsed.data.scoringCriteria) {
            if (!SCORING_FIELD_KEYS.has(criterion.fieldKey)) {
                return NextResponse.json(
                    { error: `Critério "${criterion.name}" possui campo inválido` },
                    { status: 400 }
                );
            }
            if (!SCORING_OPERATOR_KEYS.has(criterion.operator)) {
                return NextResponse.json(
                    { error: `Critério "${criterion.name}" possui operador inválido` },
                    { status: 400 }
                );
            }
            if (criterion.min > criterion.max) {
                return NextResponse.json(
                    { error: `Critério "${criterion.name}" possui faixa min/max inválida` },
                    { status: 400 }
                );
            }
            if (criterion.value < criterion.min || criterion.value > criterion.max) {
                return NextResponse.json(
                    { error: `Critério "${criterion.name}" possui valor fora da faixa min/max` },
                    { status: 400 }
                );
            }
        }

        const activeUsers = await prisma.user.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, role: true },
        });
        const activeUserIds = new Set(activeUsers.map((item) => item.id));
        const assignableUserIds = new Set(
            activeUsers
                .filter((item) => item.role === 'CONSULTANT' || item.role === 'MANAGER')
                .map((item) => item.id)
        );
        const managerTargets = new Set(
            activeUsers
                .filter((item) => item.role === 'MANAGER' || item.role === 'DIRECTOR' || item.role === 'ADMIN')
                .map((item) => item.id)
        );
        const submittedStageIds = new Set(
            parsed.data.stages.map((stage) => stage.id).filter((id): id is string => Boolean(id))
        );
        const submittedStageNames = new Set(
            parsed.data.stages.map((stage) => normalizeStageName(stage.name))
        );

        for (const rule of parsed.data.automationRules) {
            if (!AUTOMATION_TRIGGER_FIELD_KEYS.has(rule.triggerField)) {
                return NextResponse.json(
                    { error: `Regra "${rule.name}" possui campo de gatilho inválido` },
                    { status: 400 }
                );
            }
            if (!AUTOMATION_OPERATOR_KEYS.has(rule.operator)) {
                return NextResponse.json(
                    { error: `Regra "${rule.name}" possui operador inválido` },
                    { status: 400 }
                );
            }

            if (operatorRequiresValue(rule.operator) && !rule.triggerValue.trim()) {
                return NextResponse.json(
                    { error: `Regra "${rule.name}" exige um valor de gatilho para o operador selecionado` },
                    { status: 400 }
                );
            }

            const actionNeedsTarget =
                rule.actionType === 'move_stage' ||
                rule.actionType === 'assign_user' ||
                rule.actionType === 'notify_user' ||
                rule.actionType === 'add_tag';
            if (actionNeedsTarget && !rule.actionTarget.trim()) {
                return NextResponse.json(
                    { error: `Regra "${rule.name}" exige um alvo para a ação selecionada` },
                    { status: 400 }
                );
            }

            if (rule.actionType === 'move_stage') {
                const stageTarget = rule.actionTarget.trim();
                const targetExistsById = submittedStageIds.has(stageTarget);
                const targetExistsByName = submittedStageNames.has(normalizeStageName(stageTarget));
                if (!targetExistsById && !targetExistsByName) {
                    return NextResponse.json(
                        { error: `Regra "${rule.name}" referencia um estágio inválido` },
                        { status: 400 }
                    );
                }
            }

            if (rule.actionType === 'assign_user' && !assignableUserIds.has(rule.actionTarget.trim())) {
                return NextResponse.json(
                    { error: `Regra "${rule.name}" deve atribuir para consultor ou manager ativo` },
                    { status: 400 }
                );
            }

            if (rule.actionType === 'notify_user' && !activeUserIds.has(rule.actionTarget.trim())) {
                return NextResponse.json(
                    { error: `Regra "${rule.name}" referencia usuário de notificação inválido` },
                    { status: 400 }
                );
            }

            if (
                rule.actionType === 'notify_manager' &&
                rule.actionTarget.trim() !== 'all_managers' &&
                !managerTargets.has(rule.actionTarget.trim())
            ) {
                return NextResponse.json(
                    { error: `Regra "${rule.name}" referencia gestor inválido para notificação` },
                    { status: 400 }
                );
            }
        }

        const response = await prisma.$transaction(async (tx) => {
            const pipeline = await ensureActivePipeline(tx);
            const existingStages = await tx.pipelineStage.findMany({
                where: { pipelineId: pipeline.id },
                orderBy: { order: 'asc' },
            });

            const existingIds = new Set(existingStages.map((stage) => stage.id));
            const submittedExistingIds = new Set(
                parsed.data.stages
                    .map((stage) => stage.id)
                    .filter((id): id is string => Boolean(id && existingIds.has(id)))
            );
            const submittedToPersistedStageIds = new Map<string, string>();

            for (let index = 0; index < parsed.data.stages.length; index += 1) {
                const stage = parsed.data.stages[index];
                const order = index + 1;

                if (stage.id && existingIds.has(stage.id)) {
                    await tx.pipelineStage.update({
                        where: { id: stage.id },
                        data: {
                            name: stage.name,
                            color: stage.color,
                            isWon: stage.isWon,
                            isLost: stage.isLost,
                            order,
                        },
                    });
                    submittedToPersistedStageIds.set(stage.id, stage.id);
                } else {
                    const createdStage = await tx.pipelineStage.create({
                        data: {
                            pipelineId: pipeline.id,
                            name: stage.name,
                            color: stage.color,
                            isWon: stage.isWon,
                            isLost: stage.isLost,
                            order,
                        },
                    });
                    if (stage.id) {
                        submittedToPersistedStageIds.set(stage.id, createdStage.id);
                    }
                }
            }

            const stagesToDelete = existingStages.filter((stage) => !submittedExistingIds.has(stage.id));
            for (const stage of stagesToDelete) {
                if (isReservedStage(stage.automations)) {
                    throw new Error(`O estágio ${stage.name} é reservado e não pode ser removido`);
                }

                const leadCount = await tx.lead.count({ where: { pipelineStageId: stage.id } });
                if (leadCount > 0) {
                    throw new Error(`O estágio ${stage.name} possui leads e não pode ser removido`);
                }

                await tx.pipelineStage.delete({ where: { id: stage.id } });
            }

            await tx.systemSettings.upsert({
                where: { key: 'config.scoringCriteria.v1' },
                update: { value: parsed.data.scoringCriteria as Prisma.InputJsonValue },
                create: { key: 'config.scoringCriteria.v1', value: parsed.data.scoringCriteria as Prisma.InputJsonValue },
            });

            const freshStages = await tx.pipelineStage.findMany({
                where: { pipelineId: pipeline.id },
                orderBy: { order: 'asc' },
                select: { id: true, name: true, color: true, isWon: true, isLost: true, order: true, automations: true },
            });
            const freshStageIds = new Set(freshStages.map((stage) => stage.id));
            const freshStageNameToId = new Map(
                freshStages.map((stage) => [normalizeStageName(stage.name), stage.id])
            );
            const normalizedAutomationRules = parsed.data.automationRules.map((rule) => {
                const normalizedRule = { ...rule, actionTarget: rule.actionTarget.trim() };
                if (normalizedRule.actionType !== 'move_stage') return normalizedRule;

                let resolvedTarget =
                    submittedToPersistedStageIds.get(normalizedRule.actionTarget) ||
                    normalizedRule.actionTarget;
                if (!freshStageIds.has(resolvedTarget)) {
                    const byName = freshStageNameToId.get(normalizeStageName(resolvedTarget));
                    if (byName) resolvedTarget = byName;
                }
                if (!freshStageIds.has(resolvedTarget)) {
                    throw new Error(`Regra "${normalizedRule.name}" referencia estágio inexistente`);
                }
                return { ...normalizedRule, actionTarget: resolvedTarget };
            });

            await tx.systemSettings.upsert({
                where: { key: 'config.automationRules.v1' },
                update: { value: normalizedAutomationRules as Prisma.InputJsonValue },
                create: { key: 'config.automationRules.v1', value: normalizedAutomationRules as Prisma.InputJsonValue },
            });

            const users = await tx.user.findMany({
                where: { status: 'ACTIVE' },
                select: { id: true, name: true, role: true },
                orderBy: { name: 'asc' },
            });

            return buildConfigResponse({
                canManageConfig: true,
                pipelineName: pipeline.name,
                stages: freshStages,
                scoringCriteria: parsed.data.scoringCriteria,
                automationRules: normalizedAutomationRules,
                users,
            });
        });

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error saving config:', error);
        const message = error instanceof Error ? error.message : 'Erro ao salvar configurações';
        const isBusinessError = error instanceof Error && (
            message.includes('não pode') ||
            message.includes('inválid') ||
            message.includes('possui leads') ||
            message.includes('referencia') ||
            message.includes('inexistente')
        );

        return NextResponse.json({ error: message }, { status: isBusinessError ? 400 : 500 });
    }
}
