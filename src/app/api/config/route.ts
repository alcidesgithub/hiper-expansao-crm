import { NextResponse } from 'next/server';
import { Prisma, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';
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

const scoringCriterionSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(2),
    subtitle: z.string().optional().default(''),
    category: z.enum(['DEMOGRAPHIC', 'ENGAGEMENT']),
    value: z.number().min(0).max(100),
    min: z.number().min(0).max(100).default(0),
    max: z.number().min(0).max(100).default(100),
});

const automationRuleSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(2),
    enabled: z.boolean(),
    triggerField: z.string().min(1),
    operator: z.string().min(1),
    triggerValue: z.string().min(1),
    actionType: z.string().min(1),
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

const DEFAULT_SCORING_CRITERIA = [
    { id: 'cargo-decisao', name: 'Cargo de Decisão', subtitle: 'CEO, Diretor, Head', category: 'DEMOGRAPHIC', value: 30, min: 0, max: 50 },
    { id: 'empresa-enterprise', name: 'Empresa Enterprise', subtitle: '> 500 funcionários', category: 'DEMOGRAPHIC', value: 20, min: 0, max: 50 },
    { id: 'localizacao-estrategica', name: 'Localização Estratégica', subtitle: 'SP, RJ, Sul', category: 'DEMOGRAPHIC', value: 10, min: 0, max: 30 },
    { id: 'download-material', name: 'Download de Material', subtitle: 'E-book ou guia', category: 'ENGAGEMENT', value: 15, min: 0, max: 30 },
    { id: 'abertura-email', name: 'Abertura de E-mail', subtitle: 'Taxa > 20%', category: 'ENGAGEMENT', value: 5, min: 0, max: 20 },
];

const DEFAULT_AUTOMATION_RULES = [
    {
        id: 'hot-lead',
        name: 'Notificação de Lead Quente',
        enabled: true,
        triggerField: 'leadScore',
        operator: '>',
        triggerValue: '80',
        actionType: 'notifyUser',
        actionTarget: 'Diretor Comercial',
    },
    {
        id: 'cold-lead',
        name: 'Nutrição Lead Frio',
        enabled: false,
        triggerField: 'leadScore',
        operator: '<',
        triggerValue: '55',
        actionType: 'moveStage',
        actionTarget: 'Nurturing',
    },
];

interface SessionUser {
    id?: string;
    role?: UserRole;
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

function canView(role?: UserRole): boolean {
    return can(role, 'pipeline:configure');
}

function canManage(role?: UserRole): boolean {
    return can(role, 'pipeline:configure');
}

function getSessionUser(session: unknown): SessionUser | null {
    if (!session || typeof session !== 'object') return null;
    return (session as { user?: SessionUser }).user || null;
}

function sanitizeCriteria(value: unknown) {
    const parsed = z.array(scoringCriterionSchema).safeParse(value);
    return parsed.success ? parsed.data : DEFAULT_SCORING_CRITERIA;
}

function sanitizeRules(value: unknown) {
    const parsed = z.array(automationRuleSchema).safeParse(value);
    return parsed.success ? parsed.data : DEFAULT_AUTOMATION_RULES;
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
    let pipeline = await tx.pipeline.findFirst({
        where: { isActive: true },
        include: {
            stages: {
                orderBy: { order: 'asc' },
                select: { id: true, name: true, color: true, isWon: true, isLost: true, order: true, automations: true },
            },
        },
    });

    if (!pipeline) {
        pipeline = await tx.pipeline.create({
            data: {
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
        return pipeline;
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

    if (legacyReservedStages.length > 0) {
        pipeline = await tx.pipeline.findUniqueOrThrow({
            where: { id: pipeline.id },
            include: {
                stages: {
                    orderBy: { order: 'asc' },
                    select: { id: true, name: true, color: true, isWon: true, isLost: true, order: true, automations: true },
                },
            },
        });
    }

    return pipeline;
}

function buildConfigResponse(params: {
    canManageConfig: boolean;
    pipelineName: string;
    stages: StageEntity[];
    scoringCriteria: ReturnType<typeof sanitizeCriteria>;
    automationRules: ReturnType<typeof sanitizeRules>;
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
    };
}

// GET /api/config
export async function GET() {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canView(user.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

    try {
        const result = await prisma.$transaction(async (tx) => {
            const pipeline = await ensureActivePipeline(tx);
            const settings = await tx.systemSettings.findMany({
                where: { key: { in: ['config.scoringCriteria.v1', 'config.automationRules.v1'] } },
            });

            const scoringSetting = settings.find((setting) => setting.key === 'config.scoringCriteria.v1');
            const rulesSetting = settings.find((setting) => setting.key === 'config.automationRules.v1');

            return buildConfigResponse({
                canManageConfig: canManage(user.role),
                pipelineName: pipeline.name,
                stages: pipeline.stages,
                scoringCriteria: sanitizeCriteria(scoringSetting?.value),
                automationRules: sanitizeRules(rulesSetting?.value),
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
    if (!canManage(user.role)) return NextResponse.json({ error: 'Sem permissão para editar configurações' }, { status: 403 });

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

        const response = await prisma.$transaction(async (tx) => {
            const pipeline = await ensureActivePipeline(tx);
            const existingStages = await tx.pipelineStage.findMany({
                where: { pipelineId: pipeline.id },
                orderBy: { order: 'asc' },
            });

            const existingIds = new Set(existingStages.map((stage) => stage.id));
            const submittedIds = new Set(parsed.data.stages.map((stage) => stage.id).filter((id): id is string => Boolean(id)));

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
                } else {
                    await tx.pipelineStage.create({
                        data: {
                            pipelineId: pipeline.id,
                            name: stage.name,
                            color: stage.color,
                            isWon: stage.isWon,
                            isLost: stage.isLost,
                            order,
                        },
                    });
                }
            }

            const stagesToDelete = existingStages.filter((stage) => !submittedIds.has(stage.id));
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

            await tx.systemSettings.upsert({
                where: { key: 'config.automationRules.v1' },
                update: { value: parsed.data.automationRules as Prisma.InputJsonValue },
                create: { key: 'config.automationRules.v1', value: parsed.data.automationRules as Prisma.InputJsonValue },
            });

            const freshStages = await tx.pipelineStage.findMany({
                where: { pipelineId: pipeline.id },
                orderBy: { order: 'asc' },
                select: { id: true, name: true, color: true, isWon: true, isLost: true, order: true, automations: true },
            });

            return buildConfigResponse({
                canManageConfig: true,
                pipelineName: pipeline.name,
                stages: freshStages,
                scoringCriteria: parsed.data.scoringCriteria,
                automationRules: parsed.data.automationRules,
            });
        });

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error saving config:', error);
        const message = error instanceof Error ? error.message : 'Erro ao salvar configurações';
        const isBusinessError = error instanceof Error && (
            message.includes('não pode') ||
            message.includes('inválid') ||
            message.includes('possui leads')
        );

        return NextResponse.json({ error: message }, { status: isBusinessError ? 400 : 500 });
    }
}
