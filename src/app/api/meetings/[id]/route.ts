import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { meetingUpdateSchema } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
import { buildLeadScope, mergeLeadWhere } from '@/lib/lead-scope';
import { can } from '@/lib/permissions';
import { cancelTeamsMeeting } from '@/lib/teams';
import { buildLeadSelect } from '@/lib/lead-select';
import { validateConsultorAvailabilityWindow } from '@/lib/availability';
import { isMeetingOverlapError } from '@/lib/meeting-conflict';

const MIN_SCHEDULING_ADVANCE_HOURS = 2;

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

    if (!meeting) return { error: NextResponse.json({ error: 'Reuniao nao encontrada' }, { status: 404 }) };

    if (!isPrivileged(user.role) && meeting.userId !== user.id) {
        return { error: NextResponse.json({ error: 'Sem permissao para acessar esta reuniao' }, { status: 403 }) };
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
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    if (!user.id) return NextResponse.json({ error: 'Usuario invalido' }, { status: 401 });

    const { id } = await params;

    try {
        const result = await getMeetingWithAccess(id, user);
        if (result.error) return result.error;
        return NextResponse.json(result.meeting);
    } catch (error) {
        console.error('Error fetching meeting:', error);
        return NextResponse.json({ error: 'Erro ao buscar reuniao' }, { status: 500 });
    }
}

// PATCH /api/meetings/[id]
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    if (!user.id) return NextResponse.json({ error: 'Usuario invalido' }, { status: 401 });
    if (!can(user, 'leads:write:own')) {
        return NextResponse.json({ error: 'Sem permissao para editar reunioes' }, { status: 403 });
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
                { error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const data = parsed.data;
        if (data.status === 'COMPLETED' && !can(user, 'pipeline:advance')) {
            return NextResponse.json({ error: 'Sem permissao para concluir reuniao' }, { status: 403 });
        }
        const hasWindowUpdate = Boolean(data.startTime || data.endTime);
        if (hasWindowUpdate) {
            const nextStartTime = data.startTime ? new Date(data.startTime) : currentMeeting.startTime;
            const nextEndTime = data.endTime ? new Date(data.endTime) : currentMeeting.endTime;
            if (Number.isNaN(nextStartTime.getTime()) || Number.isNaN(nextEndTime.getTime())) {
                return NextResponse.json({ error: 'Data/hora invalida' }, { status: 400 });
            }
            if (nextStartTime >= nextEndTime) {
                return NextResponse.json({ error: 'Janela de reuniao invalida' }, { status: 400 });
            }
            const sameDay =
                nextStartTime.getFullYear() === nextEndTime.getFullYear() &&
                nextStartTime.getMonth() === nextEndTime.getMonth() &&
                nextStartTime.getDate() === nextEndTime.getDate();
            if (!sameDay) {
                return NextResponse.json({ error: 'A reuniao deve iniciar e terminar no mesmo dia' }, { status: 400 });
            }

            const dayOfWeek = nextStartTime.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                return NextResponse.json({ error: 'Nao atendemos aos finais de semana' }, { status: 400 });
            }

            const minAdvanceTime = new Date(Date.now() + MIN_SCHEDULING_ADVANCE_HOURS * 60 * 60 * 1000);
            if (nextStartTime < minAdvanceTime) {
                return NextResponse.json({ error: 'Agende com no minimo 2 horas de antecedencia' }, { status: 400 });
            }

            const availabilityValidation = await validateConsultorAvailabilityWindow({
                consultorId: currentMeeting.userId,
                startTime: nextStartTime,
                endTime: nextEndTime,
            });
            if (!availabilityValidation.ok) {
                return NextResponse.json({ error: availabilityValidation.reason }, { status: 409 });
            }
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
                    title: 'Lead nao compareceu a reuniao',
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
            currentMeeting.teamsEventId &&
            currentMeeting.user.email
        ) {
            cancelTeamsMeeting({
                organizerEmail: currentMeeting.user.email,
                externalEventId: currentMeeting.teamsEventId,
            }).catch((error) => console.error('Failed to cancel Teams meeting:', error));
        }

        return NextResponse.json(meeting);
    } catch (error) {
        if (isMeetingOverlapError(error)) {
            return NextResponse.json({ error: 'Horario nao disponivel para este consultor' }, { status: 409 });
        }
        console.error('Error updating meeting:', error);
        return NextResponse.json({ error: 'Erro ao atualizar reuniao' }, { status: 500 });
    }
}

// DELETE /api/meetings/[id] - Cancel meeting
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    if (!user.id) return NextResponse.json({ error: 'Usuario invalido' }, { status: 401 });
    if (!can(user, 'leads:write:own')) {
        return NextResponse.json({ error: 'Sem permissao para cancelar reunioes' }, { status: 403 });
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
            currentMeeting.teamsEventId &&
            currentMeeting.user.email
        ) {
            cancelTeamsMeeting({
                organizerEmail: currentMeeting.user.email,
                externalEventId: currentMeeting.teamsEventId,
            }).catch((error) => console.error('Failed to cancel Teams meeting:', error));
        }

        return NextResponse.json({ success: true, meeting });
    } catch (error) {
        console.error('Error cancelling meeting:', error);
        return NextResponse.json({ error: 'Erro ao cancelar reuniao' }, { status: 500 });
    }
}
