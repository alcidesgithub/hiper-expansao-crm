import { NextResponse } from 'next/server';
import { Lead, LeadStatus, Prisma } from '@prisma/client';
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
            const assigned = await prisma.user.findUnique({
                where: { id: data.assignedUserId },
                select: { id: true, status: true, role: true },
            });
            if (!assigned || assigned.status !== 'ACTIVE') {
                return NextResponse.json({ error: 'Usuario responsavel invalido ou inativo' }, { status: 400 });
            }
            if (!['CONSULTANT', 'MANAGER'].includes(assigned.role)) {
                return NextResponse.json({ error: 'Responsavel deve ser consultor ou manager ativo' }, { status: 400 });
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
        if (data.pipelineStageId !== undefined) updateData.pipelineStageId = data.pipelineStageId;
        if (data.assignedUserId !== undefined) updateData.assignedUserId = data.assignedUserId;

        // --- SCORING & AUTOMATION ---

        // Only run if not archived/lost/won or if explicitly reactivating? 
        // For simplicity, run if active.
        if (existing.status !== 'ARCHIVED' && existing.status !== 'WON' && existing.status !== 'LOST') {
            const settings = await prisma.systemSettings.findMany({
                where: { key: { in: ['config.scoringCriteria.v1', 'config.automationRules.v1'] } },
            });
            const scoringCriteria = ((settings.find(s => s.key === 'config.scoringCriteria.v1')?.value) as unknown as DynamicScoringCriterion[]) || [];
            const automationRules = ((settings.find(s => s.key === 'config.automationRules.v1')?.value) as unknown as AutomationRule[]) || [];

            // Merge for evaluation
            const leadForEval = {
                ...existing,
                ...data, // overwrite with updates
                // ensure numeric fields are numbers if they came as strings in JSON? 
                // leadUpdateSchema handles types, so data.estimatedValue should be correct type if defined.
            };

            const scoringInput: Partial<Lead> & { customFields?: unknown } = {
                ...leadForEval,
                phone: typeof leadForEval.phone === 'string' ? leadForEval.phone : '',
            };
            const newScore = calculateLeadScore(scoringInput, scoringCriteria);
            updateData.score = newScore;

            const allStages = await prisma.pipelineStage.findMany({ where: { pipelineId: existing.pipelineStage?.pipelineId || (await prisma.pipeline.findFirst({ where: { isDefault: true } }))?.id } });

            const automationLeadInput: Partial<Lead> = {
                ...scoringInput,
                score: newScore,
            };
            const automationResult = processAutomationRules(
                automationLeadInput,
                automationRules,
                allStages
            );

            if (automationResult.updates.pipelineStageId) {
                updateData.pipelineStageId = automationResult.updates.pipelineStageId;
                // If automation changed stage, resolvedStatus logic below might need adjustment or re-run
                // We'll let resolvedStatus logic handle the *user's* input first, but if automation overrides stage, we should check status again.
                // However, resolvedStatus logic creates 'PROPOSAL' etc based on stage properties.
                // It's safer to re-evaluate resolvedStatus if stage changed.

                const stage = allStages.find(s => s.id === updateData.pipelineStageId);
                if (stage) {
                    stageNameAfter = stage.name; // Update for log
                    if (!data.status) { // Only override status if user didn't explicitly set it
                        if (stage.isWon) resolvedStatus = 'WON';
                        else if (stage.isLost) resolvedStatus = 'LOST';
                        else resolvedStatus = 'PROPOSAL'; // Logic simplified from above
                    }
                }
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

        const assignmentChanged = data.assignedUserId !== undefined && existing.assignedUserId !== updated.assignedUserId;
        if (assignmentChanged && user.role === 'MANAGER' && updated.assignedUserId && updated.assignedUserId !== user.id) {
            await notifyAssignableUser(updated.assignedUserId, {
                title: 'Lead transferido para voce',
                message: `${updated.name} foi transferido para sua carteira.`,
                link: `/dashboard/leads/${id}`,
                emailSubject: 'Novo lead transferido para voce',
            });
        }

        if (user.id && data.pipelineStageId && existing.pipelineStageId !== data.pipelineStageId) {
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

