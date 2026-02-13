import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { meetingUpdateSchema } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
import { buildLeadScope, mergeLeadWhere } from '@/lib/lead-scope';
import { can } from '@/lib/permissions';
import { cancelTeamsMeeting } from '@/lib/teams';
import { buildLeadSelect } from '@/lib/lead-select';

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

function isPrivileged(role?: string): boolean {
    return role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER';
}

async function getMeetingWithAccess(id: string, user: SessionUser) {
    const leadScope = await buildLeadScope(user);

    const meeting = await prisma.meeting.findFirst({
        where: {
            id,
            lead: { is: leadScope },
        },
        include: {
            lead: {
                select: buildLeadSelect({
                    user,
                    includeSensitive: true,
                    includeQualificationData: true,
                    includeRoiData: true,
                }),
            },
            user: { select: { id: true, name: true, email: true } },
        },
    });

    if (!meeting) return { error: NextResponse.json({ error: 'Reunião não encontrada' }, { status: 404 }) };

    if (!isPrivileged(user.role) && meeting.userId !== user.id) {
        return { error: NextResponse.json({ error: 'Sem permissão para acessar esta reunião' }, { status: 403 }) };
    }

    return { meeting };
}

async function resolveNextPipelineStage(leadId: string, user: SessionUser): Promise<string | null> {
    const leadScope = await buildLeadScope(user);
    const lead = await prisma.lead.findFirst({
        where: mergeLeadWhere({ id: leadId }, leadScope),
        select: {
            pipelineStageId: true,
            pipelineStage: { select: { pipelineId: true, order: true } },
        },
    });

    if (!lead?.pipelineStage?.pipelineId) return lead?.pipelineStageId ?? null;

    const nextStage = await prisma.pipelineStage.findFirst({
        where: {
            pipelineId: lead.pipelineStage.pipelineId,
            order: { gt: lead.pipelineStage.order },
            isWon: false,
            isLost: false,
        },
        orderBy: { order: 'asc' },
        select: { id: true },
    });

    return nextStage?.id ?? lead.pipelineStageId ?? null;
}

// GET /api/meetings/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!user.id) return NextResponse.json({ error: 'Usuário inválido' }, { status: 401 });

    const { id } = await params;

    try {
        const result = await getMeetingWithAccess(id, user);
        if (result.error) return result.error;
        return NextResponse.json(result.meeting);
    } catch (error) {
        console.error('Error fetching meeting:', error);
        return NextResponse.json({ error: 'Erro ao buscar reunião' }, { status: 500 });
    }
}

// PATCH /api/meetings/[id]
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!user.id) return NextResponse.json({ error: 'Usuário inválido' }, { status: 401 });
    if (!can(user, 'leads:write:own')) {
        return NextResponse.json({ error: 'Sem permissão para editar reuniões' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const access = await getMeetingWithAccess(id, user);
        if (access.error) return access.error;
        const currentMeeting = access.meeting;

        const body = await request.json();
        const parsed = meetingUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const data = parsed.data;
        if (data.status === 'COMPLETED' && !can(user, 'pipeline:advance')) {
            return NextResponse.json({ error: 'Sem permissão para concluir reunião' }, { status: 403 });
        }
        const meeting = await prisma.meeting.update({
            where: { id },
            data: {
                ...(data.title && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.startTime && { startTime: new Date(data.startTime) }),
                ...(data.endTime && { endTime: new Date(data.endTime) }),
                ...(data.status && { status: data.status }),
                ...(data.location !== undefined && { location: data.location }),
                ...(data.notes !== undefined && { notes: data.notes }),
                ...(data.nextSteps !== undefined && { nextSteps: data.nextSteps }),
                ...(data.outcome !== undefined && { outcome: data.outcome }),
                ...(data.status === 'COMPLETED' && { completedAt: new Date(), cancelledAt: null }),
                ...(data.status === 'CANCELLED' && { cancelledAt: new Date(), completedAt: null }),
                ...(data.status === 'SCHEDULED' && { cancelledAt: null }),
            },
            include: {
                lead: { select: buildLeadSelect({ user, includeSensitive: true }) },
                user: { select: { id: true, name: true } },
            },
        });

        if (data.status === 'COMPLETED') {
            const nextStageId = await resolveNextPipelineStage(meeting.leadId, user);
            await prisma.lead.update({
                where: { id: meeting.leadId },
                data: { pipelineStageId: nextStageId },
            });
        } else if (data.status === 'NO_SHOW') {
            await prisma.activity.create({
                data: {
                    leadId: meeting.leadId,
                    type: 'MEETING',
                    title: 'Lead não compareceu à reunião',
                    userId: user.id,
                },
            });
        }

        await logAudit({
            userId: user.id,
            action: 'UPDATE',
            entity: 'Meeting',
            entityId: id,
            changes: data as Record<string, unknown>,
        });

        if (
            data.status === 'CANCELLED' &&
            currentMeeting.provider === 'teams' &&
            currentMeeting.externalEventId &&
            currentMeeting.user.email
        ) {
            cancelTeamsMeeting({
                organizerEmail: currentMeeting.user.email,
                externalEventId: currentMeeting.externalEventId,
            }).catch((error) => console.error('Failed to cancel Teams meeting:', error));
        }

        return NextResponse.json(meeting);
    } catch (error) {
        console.error('Error updating meeting:', error);
        return NextResponse.json({ error: 'Erro ao atualizar reunião' }, { status: 500 });
    }
}

// DELETE /api/meetings/[id] - Cancel meeting
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!user.id) return NextResponse.json({ error: 'Usuário inválido' }, { status: 401 });
    if (!can(user, 'leads:write:own')) {
        return NextResponse.json({ error: 'Sem permissão para cancelar reuniões' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const access = await getMeetingWithAccess(id, user);
        if (access.error) return access.error;
        const currentMeeting = access.meeting;

        const meeting = await prisma.meeting.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
            },
        });

        await logAudit({
            userId: user.id,
            action: 'CANCEL',
            entity: 'Meeting',
            entityId: id,
        });

        if (
            currentMeeting.provider === 'teams' &&
            currentMeeting.externalEventId &&
            currentMeeting.user.email
        ) {
            cancelTeamsMeeting({
                organizerEmail: currentMeeting.user.email,
                externalEventId: currentMeeting.externalEventId,
            }).catch((error) => console.error('Failed to cancel Teams meeting:', error));
        }

        return NextResponse.json({ success: true, meeting });
    } catch (error) {
        console.error('Error cancelling meeting:', error);
        return NextResponse.json({ error: 'Erro ao cancelar reunião' }, { status: 500 });
    }
}
