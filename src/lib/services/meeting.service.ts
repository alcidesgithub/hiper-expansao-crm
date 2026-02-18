import { Lead, Meeting, Prisma, User } from '@prisma/client';
import { addMinutes } from 'date-fns';
import { logAudit } from '@/lib/audit';
import { sendMeetingConfirmationToLead, sendMeetingNotificationToConsultor } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { isMeetingOverlapError } from '@/lib/meeting-conflict';
import { graphService } from './microsoft-graph.service';

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

export class MeetingService {
    async scheduleMeeting(params: CreateMeetingParams) {
        const lead = await prisma.lead.findUnique({
            where: { id: params.leadId },
        });

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

        const consultant = await prisma.user.findUnique({
            where: { id: params.consultantId },
        });

        if (!consultant || !consultant.email) {
            throw new Error('Consultor nao encontrado ou sem email configurado');
        }

        const isSlotAvailable = await this.isSlotAvailable(
            params.consultantId,
            params.scheduledAt,
            params.duration || 60
        );

        if (!isSlotAvailable) {
            throw new Error('Horario nao disponivel para este consultor');
        }

        const startDateTime = params.scheduledAt;
        const endDateTime = addMinutes(startDateTime, params.duration || 60);
        const subject = params.title || `Apresentacao Hiperfarma - ${lead.name}`;

        let provider: string = 'local';
        let teamsJoinUrl: string | null = null;
        let teamsEventId: string | null = null;

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
            duration: params.duration || 60,
            status: 'SCHEDULED',
            leadNotes: params.leadNotes,
            provider,
            teamsJoinUrl,
        };

        if (teamsEventId) {
            meetingData.teamsEventId = teamsEventId;
        }

        const meeting = await (async () => {
            try {
                return await prisma.meeting.create({
                    data: meetingData,
                });
            } catch (error) {
                if (isMeetingOverlapError(error)) {
                    throw new Error('Horario nao disponivel para este consultor');
                }
                throw error;
            }
        })();

        await prisma.lead.update({
            where: { id: params.leadId },
            data: {
                meetingScheduled: true,
                lastMeetingAt: startDateTime,
                status: 'QUALIFIED',
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

        await this.sendConfirmationEmails({
            meeting,
            lead,
            consultant,
            joinUrl: teamsJoinUrl || undefined,
            leadNotes: params.leadNotes,
        });

        return {
            meeting,
            joinUrl: teamsJoinUrl || undefined,
        };
    }

    async isSlotAvailable(
        userId: string,
        startDateTime: Date,
        duration: number
    ): Promise<boolean> {
        const endDateTime = addMinutes(startDateTime, duration);

        const conflictingMeetings = await prisma.meeting.findMany({
            where: {
                userId,
                status: {
                    in: ['SCHEDULED', 'RESCHEDULED', 'COMPLETED'],
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

        await Promise.all([
            sendMeetingConfirmationToLead({
                leadName: params.lead.name,
                leadEmail: params.lead.email,
                consultorName: params.consultant.name,
                date,
                time,
                meetingLink: params.joinUrl,
                appUrl,
            }),
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
            }),
        ]);
    }
}

export const meetingService = new MeetingService();
