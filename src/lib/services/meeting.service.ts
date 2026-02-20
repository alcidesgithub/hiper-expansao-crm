import { Lead, Meeting, Prisma, User } from '@prisma/client';
import { addMinutes } from 'date-fns';
import { logAudit } from '@/lib/audit';
import { sendMeetingConfirmationToLead, sendMeetingNotificationToConsultor } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { isMeetingOverlapError } from '@/lib/meeting-conflict';
import { graphService } from './microsoft-graph.service';
import { createInAppNotifications, notifyActiveManagers } from '@/lib/crm-notifications';
import { validateConsultorAvailabilityWindow } from '@/lib/availability';

const MIN_SCHEDULING_ADVANCE_HOURS = 2;
const MIN_MEETING_DURATION_MINUTES = 15;
const MAX_MEETING_DURATION_MINUTES = 180;

function resolveInternalAppUrl(): string | undefined {
    const candidates = [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXTAUTH_URL];
    for (const candidate of candidates) {
        const value = candidate?.trim();
        if (!value) continue;
        try {
            const parsed = new URL(value);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return parsed.toString().replace(/\/$/, '');
            }
        } catch {
            continue;
        }
    }
    return undefined;
}

export interface CreateMeetingParams {
    leadId: string;
    consultantId: string;
    scheduledAt: Date;
    duration?: number;
    leadNotes?: string;
    title?: string;
}

interface MeetingProgression {
    pipelineStageId: string | null;
    status: 'CONTACTED';
}

export class MeetingService {
    async scheduleMeeting(params: CreateMeetingParams) {
        if (!(params.scheduledAt instanceof Date) || Number.isNaN(params.scheduledAt.getTime())) {
            throw new Error('Data/hora invalida para agendamento');
        }

        const duration = Number.isFinite(params.duration) ? Math.round(params.duration as number) : 60;
        if (duration < MIN_MEETING_DURATION_MINUTES || duration > MAX_MEETING_DURATION_MINUTES) {
            throw new Error('Duracao de reuniao invalida');
        }

        const startDateTime = params.scheduledAt;
        const endDateTime = addMinutes(startDateTime, duration);
        if (startDateTime >= endDateTime) {
            throw new Error('Janela de reuniao invalida');
        }

        const dayOfWeek = startDateTime.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            throw new Error('Nao atendemos aos finais de semana');
        }

        const minAdvanceTime = new Date(Date.now() + MIN_SCHEDULING_ADVANCE_HOURS * 60 * 60 * 1000);
        if (startDateTime < minAdvanceTime) {
            throw new Error('Agende com no minimo 2 horas de antecedencia');
        }

        const [lead, consultant] = await Promise.all([
            prisma.lead.findUnique({
                where: { id: params.leadId },
            }),
            prisma.user.findUnique({
                where: { id: params.consultantId },
                select: { id: true, name: true, email: true, status: true, role: true },
            }),
        ]);

        if (!lead) {
            throw new Error('Lead nao encontrado');
        }

        if (lead.grade && !['A', 'B'].includes(lead.grade)) {
            throw new Error('Lead nao qualificado para agendamento automatico (Grade C/D/F)');
        }

        const qualData = (lead.qualificationData ?? null) as { hasFinancialCapacity?: boolean } | null;
        if (qualData && qualData.hasFinancialCapacity === false) {
            throw new Error('Lead sem capacidade financeira validada para agendamento');
        }

        if (!consultant || !consultant.email) {
            throw new Error('Consultor nao encontrado ou sem email configurado');
        }

        if (consultant.status !== 'ACTIVE' || !['CONSULTANT', 'MANAGER'].includes(consultant.role)) {
            throw new Error('Consultor invalido ou inativo');
        }

        const availabilityValidation = await validateConsultorAvailabilityWindow({
            consultorId: params.consultantId,
            startTime: startDateTime,
            endTime: endDateTime,
        });
        if (!availabilityValidation.ok) {
            throw new Error(availabilityValidation.reason);
        }

        const subject = params.title || `Apresentacao Hiperfarma - ${lead.name}`;

        let provider: string = 'local';
        let teamsJoinUrl: string | null = null;
        let teamsEventId: string | null = null;
        let rollbackAttempted = false;
        const rollbackTeamsMeeting = async () => {
            if (rollbackAttempted) return;
            rollbackAttempted = true;
            if (!teamsEventId || !consultant.email) return;

            try {
                await graphService.cancelCalendarEvent(consultant.email, teamsEventId);
            } catch (error) {
                console.error('Falha ao cancelar evento Teams apos rollback:', error);
            }
        };

        if (graphService.isConfigured()) {
            try {
                const calendarEvent = await graphService.createCalendarEvent({
                    consultantEmail: consultant.email,
                    subject,
                    startDateTime,
                    endDateTime,
                    leadName: lead.name,
                    leadEmail: lead.email,
                    leadPhone: lead.phone,
                    description: params.leadNotes,
                });
                const joinUrl = calendarEvent.onlineMeeting?.joinUrl || null;
                if (joinUrl) {
                    provider = 'teams';
                    teamsJoinUrl = joinUrl;
                    teamsEventId = calendarEvent.id || null;
                } else {
                    console.warn('Teams configurado, mas Graph retornou evento sem joinUrl. Seguindo como reuniao local.');
                }
            } catch (error) {
                console.error('Falha ao criar reuniao no Teams. Seguindo com agenda interna:', error);
            }
        }

        const meetingData: Prisma.MeetingUncheckedCreateInput = {
            leadId: params.leadId,
            userId: params.consultantId,
            title: subject,
            startTime: startDateTime,
            endTime: endDateTime,
            scheduledAt: startDateTime,
            duration,
            status: 'SCHEDULED',
            leadNotes: params.leadNotes,
            provider,
            teamsJoinUrl,
        };

        if (teamsEventId) {
            meetingData.teamsEventId = teamsEventId;
        }

        const booking = await (async () => {
            try {
                return await prisma.$transaction(async (tx) => {
                    const leadLockKey = `schedule:lead:${params.leadId}`;
                    const slotLockKey = `schedule:${params.consultantId}:${startDateTime.toISOString()}:${duration}`;
                    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${leadLockKey}))`;
                    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${slotLockKey}))`;

                    const existingLeadMeeting = await tx.meeting.findFirst({
                        where: {
                            leadId: params.leadId,
                            status: { in: ['SCHEDULED', 'RESCHEDULED'] },
                        },
                        select: { id: true },
                    });
                    if (existingLeadMeeting) return { kind: 'LEAD_CONFLICT' as const };

                    const conflict = await tx.meeting.findFirst({
                        where: {
                            userId: params.consultantId,
                            status: { in: ['SCHEDULED', 'RESCHEDULED'] },
                            startTime: { lt: endDateTime },
                            endTime: { gt: startDateTime },
                        },
                        select: { id: true },
                    });
                    if (conflict) return { kind: 'SLOT_CONFLICT' as const };

                    const meeting = await tx.meeting.create({
                        data: meetingData,
                    });

                    return { kind: 'CREATED' as const, meeting };
                });
            } catch (error) {
                if (isMeetingOverlapError(error)) {
                    return { kind: 'SLOT_CONFLICT' as const };
                }
                throw error;
            }
        })();

        if (booking.kind === 'LEAD_CONFLICT') {
            await rollbackTeamsMeeting();
            throw new Error('Este lead ja possui reuniao agendada');
        }
        if (booking.kind === 'SLOT_CONFLICT') {
            await rollbackTeamsMeeting();
            throw new Error('Horario nao disponivel para este consultor');
        }

        const meeting = booking.meeting;
        const progression = await this.resolveMeetingProgression(params.leadId);
        await prisma.lead.update({
            where: { id: params.leadId },
            data: {
                meetingScheduled: true,
                lastMeetingAt: startDateTime,
                status: progression.status,
                pipelineStageId: progression.pipelineStageId,
            },
        });

        await logAudit({
            userId: consultant.id,
            action: 'MEETING_SCHEDULED',
            entity: 'Meeting',
            entityId: meeting.id,
            changes: {
                leadId: params.leadId,
                scheduledAt: startDateTime,
                teamsJoinUrl: teamsJoinUrl || undefined,
                provider: meetingData.provider,
            },
        });

        const shouldNotifyConsultant = lead.assignedUserId === consultant.id;

        await this.sendConfirmationEmails({
            meeting,
            lead,
            consultant,
            joinUrl: teamsJoinUrl || undefined,
            leadNotes: params.leadNotes,
            notifyConsultant: shouldNotifyConsultant,
        });

        try {
            await notifyActiveManagers({
                title: 'Reuniao agendada',
                message: `${lead.name} teve reuniao agendada com ${consultant.name}.`,
                link: `/dashboard/leads/${lead.id}`,
                emailSubject: 'Nova reuniao agendada no CRM',
            });

            if (shouldNotifyConsultant) {
                await createInAppNotifications([consultant.id], {
                    title: 'Reuniao agendada',
                    message: `Nova reuniao com ${lead.name}.`,
                    link: `/dashboard/leads/${lead.id}`,
                    type: 'info',
                });
            }
        } catch (notifyErr) {
            console.error('Failed to create in-app notifications for meeting:', notifyErr);
        }

        return {
            meeting,
            joinUrl: teamsJoinUrl || undefined,
        };
    }

    private async resolveMeetingProgression(leadId: string): Promise<MeetingProgression> {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            select: {
                pipelineStageId: true,
                pipelineStage: { select: { pipelineId: true, order: true } },
            },
        });

        let nextStageId = lead?.pipelineStageId ?? null;
        if (lead?.pipelineStage?.pipelineId) {
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
            if (nextStage) nextStageId = nextStage.id;
        }

        return {
            status: 'CONTACTED',
            pipelineStageId: nextStageId,
        };
    }

    async isSlotAvailable(
        userId: string,
        startDateTime: Date,
        duration: number
    ): Promise<boolean> {
        if (!(startDateTime instanceof Date) || Number.isNaN(startDateTime.getTime())) return false;
        if (!Number.isFinite(duration) || duration <= 0) return false;

        const endDateTime = addMinutes(startDateTime, duration);
        const availabilityValidation = await validateConsultorAvailabilityWindow({
            consultorId: userId,
            startTime: startDateTime,
            endTime: endDateTime,
        });
        if (!availabilityValidation.ok) return false;

        const conflictingMeetings = await prisma.meeting.findMany({
            where: {
                userId,
                status: {
                    in: ['SCHEDULED', 'RESCHEDULED'],
                },
                OR: [
                    {
                        startTime: { gte: startDateTime, lt: endDateTime },
                    },
                    {
                        endTime: { gt: startDateTime, lte: endDateTime },
                    },
                    {
                        AND: [
                            { startTime: { lte: startDateTime } },
                            { endTime: { gte: endDateTime } },
                        ],
                    },
                ],
            },
        });

        return conflictingMeetings.length === 0;
    }

    async cancelMeeting(meetingId: string, reason?: string, cancelledBy?: string) {
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: {
                user: true,
                lead: true,
            },
        });

        if (!meeting) {
            throw new Error('Reuniao nao encontrada');
        }

        if (meeting.teamsEventId && meeting.user.email) {
            try {
                await graphService.cancelCalendarEvent(meeting.user.email, meeting.teamsEventId);
            } catch (e) {
                console.error('Failed to cancel Teams event, proceeding with DB update', e);
            }
        }

        await prisma.meeting.update({
            where: { id: meetingId },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelReason: reason,
                cancelledBy,
            },
        });

        await logAudit({
            userId: cancelledBy || meeting.userId,
            action: 'MEETING_CANCELLED',
            entity: 'Meeting',
            entityId: meeting.id,
            changes: { reason },
        });
    }

    private async sendConfirmationEmails(params: {
        meeting: Pick<Meeting, 'startTime' | 'endTime'>;
        lead: Pick<Lead, 'id' | 'email' | 'name' | 'company' | 'phone' | 'score' | 'grade'>;
        consultant: Pick<User, 'email' | 'name'>;
        joinUrl?: string;
        leadNotes?: string;
        notifyConsultant: boolean;
    }) {
        const appUrl = resolveInternalAppUrl();
        const date = params.meeting.startTime.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const startHour = params.meeting.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const endHour = params.meeting.endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const time = `${startHour} - ${endHour}`;
        const leadCrmUrl = appUrl ? `${appUrl}/dashboard/leads/${params.lead.id}` : undefined;

        const emailJobs = [
            sendMeetingConfirmationToLead({
                leadName: params.lead.name,
                leadEmail: params.lead.email,
                consultorName: params.consultant.name,
                date,
                time,
                meetingLink: params.joinUrl,
                appUrl,
            }),
        ];

        if (params.notifyConsultant) {
            emailJobs.push(
                sendMeetingNotificationToConsultor({
                    consultorEmail: params.consultant.email,
                    consultorName: params.consultant.name,
                    leadName: params.lead.name,
                    leadEmail: params.lead.email,
                    leadPhone: params.lead.phone || undefined,
                    leadCompany: params.lead.company || undefined,
                    score: params.lead.score ?? undefined,
                    grade: params.lead.grade ?? undefined,
                    date,
                    time,
                    meetingLink: params.joinUrl,
                    leadNotes: params.leadNotes,
                    leadCrmUrl,
                    appUrl,
                })
            );
        }

        await Promise.all(emailJobs);
    }
}

export const meetingService = new MeetingService();
