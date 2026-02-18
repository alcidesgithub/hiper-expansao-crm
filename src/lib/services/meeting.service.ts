import { Lead, Meeting, Prisma, User } from '@prisma/client';
import { addMinutes } from 'date-fns';
import { logAudit } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { graphService } from './microsoft-graph.service';

function escapeHtml(value: unknown): string {
    const text = String(value ?? '');
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeUrl(url?: string): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

function formatPtBrDateTime(value: unknown): string {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toLocaleString('pt-BR');
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleString('pt-BR');
        }
    }

    return 'A confirmar';
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

        const meeting = await prisma.meeting.create({
            data: meetingData,
        });

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
        meeting: Pick<Meeting, 'startTime'>;
        lead: Pick<Lead, 'email' | 'name' | 'company'>;
        consultant: Pick<User, 'email' | 'name'>;
        joinUrl?: string;
    }) {
        const meetingLinkHtml = params.joinUrl
            ? `<p><strong>Link da Reuniao (Teams):</strong> <a href="${sanitizeUrl(params.joinUrl) || '#'}">Clique aqui para entrar</a></p>`
            : '<p><strong>Link:</strong> A confirmar</p>';

        const meetingLinkHtmlConsultant = params.joinUrl
            ? `<p><strong>Link Teams:</strong> <a href="${sanitizeUrl(params.joinUrl) || '#'}">Entrar na Reuniao</a></p>`
            : '';

        await sendEmail({
            to: params.lead.email,
            subject: 'Confirmacao de Reuniao - Hiperfarma',
            html: `
        <h1>Ola ${escapeHtml(params.lead.name)},</h1>
        <p>Sua reuniao com <strong>${escapeHtml(params.consultant.name)}</strong> foi agendada com sucesso.</p>
        <p><strong>Data:</strong> ${escapeHtml(formatPtBrDateTime(params.meeting.startTime))}</p>
        ${meetingLinkHtml}
        <br/>
        <p>Atenciosamente,<br/>Expansao Hiperfarma</p>
      `,
        });

        await sendEmail({
            to: params.consultant.email,
            subject: `Novo Agendamento: ${escapeHtml(params.lead.name)}`,
            html: `
        <h1>Ola ${escapeHtml(params.consultant.name)},</h1>
        <p>Um novo lead agendou uma apresentacao com voce.</p>
        <p><strong>Lead:</strong> ${escapeHtml(params.lead.name)}</p>
        <p><strong>Empresa:</strong> ${escapeHtml(params.lead.company || 'Nao informada')}</p>
        <p><strong>Data:</strong> ${escapeHtml(formatPtBrDateTime(params.meeting.startTime))}</p>
        ${meetingLinkHtmlConsultant}
      `,
        });
    }
}

export const meetingService = new MeetingService();
