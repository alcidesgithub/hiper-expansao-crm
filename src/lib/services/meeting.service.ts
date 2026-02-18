import { prisma } from '@/lib/prisma';
import { graphService } from './microsoft-graph.service';
import { sendEmail } from '@/lib/email';
import { addMinutes } from 'date-fns';
import { logAudit } from '@/lib/audit';
import { Lead, Meeting, Prisma, User } from '@prisma/client';

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
    /**
     * Agenda reunião completa (Teams + Calendar + DB + Email)
     * Baseado no Guia de Implementação v1.0
     */
    async scheduleMeeting(params: CreateMeetingParams) {
        // 1. Validar lead
        const lead = await prisma.lead.findUnique({
            where: { id: params.leadId },
        });

        if (!lead) {
            throw new Error('Lead não encontrado');
        }

        // Validação de Grade conforme PRD (A/B)
        if (lead.grade && !['A', 'B'].includes(lead.grade)) {
            throw new Error('Lead não qualificado para agendamento automático (Grade C/D/F)');
        }

        // Validação financeira (campo qualificationData no schema)
        const qualData = (lead.qualificationData ?? null) as { hasFinancialCapacity?: boolean } | null;
        // Nota: O guia menciona hasFinancialCapacity, vamos verificar se existe no JSON
        if (qualData && qualData.hasFinancialCapacity === false) {
            throw new Error('Lead sem capacidade financeira validada para agendamento');
        }

        // 2. Buscar consultor
        const consultant = await prisma.user.findUnique({
            where: { id: params.consultantId },
        });

        if (!consultant || !consultant.email) {
            throw new Error('Consultor não encontrado ou sem email configurado');
        }

        // 3. Verificar slot disponível (usando a lógica do banco)
        const isSlotAvailable = await this.isSlotAvailable(
            params.consultantId,
            params.scheduledAt,
            params.duration || 60
        );

        if (!isSlotAvailable) {
            throw new Error('Horário não disponível para este consultor');
        }

        // 4. Calcular datas
        const startDateTime = params.scheduledAt;
        const endDateTime = addMinutes(startDateTime, params.duration || 60);
        const subject = params.title || `Apresentação Hiperfarma - ${lead.name}`;

        // 5. Criar reunião no Teams (se configurado)
        let onlineMeeting = null;
        let calendarEvent = null;
        const isTeamsConfigured = graphService.isConfigured();

        if (isTeamsConfigured) {
            try {
                onlineMeeting = await graphService.createOnlineMeeting({
                    subject,
                    startDateTime,
                    endDateTime,
                    organizerEmail: consultant.email,
                });

                // 6. Criar evento no calendário
                calendarEvent = await graphService.createCalendarEvent({
                    consultantEmail: consultant.email,
                    subject,
                    startDateTime,
                    endDateTime,
                    joinUrl: onlineMeeting.joinWebUrl!,
                    leadName: lead.name,
                    leadEmail: lead.email,
                    leadPhone: lead.phone,
                });
            } catch (error) {
                console.error('Falha ao criar reunião no Teams, prosseguindo com reunião local:', error);
                // Fallback para local se falhar a criação no Teams mesmo configurado
            }
        }

        // 7. Salvar no banco (Novo Schema v1.0)
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
            provider: onlineMeeting ? 'teams' : 'local',
        };

        if (onlineMeeting && calendarEvent) {
            meetingData.teamsEventId = calendarEvent.id!;
            meetingData.teamsMeetingId = onlineMeeting.id!;
            meetingData.teamsJoinUrl = onlineMeeting.joinWebUrl!;
            meetingData.teamsThreadId = onlineMeeting.chatInfo?.threadId;
        }

        const meeting = await prisma.meeting.create({
            data: meetingData,
        });

        // 8. Atualizar status do lead
        await prisma.lead.update({
            where: { id: params.leadId },
            data: {
                meetingScheduled: true,
                lastMeetingAt: startDateTime,
                status: 'QUALIFIED', // Ou um status específico de agendado se preferir
            },
        });

        // 9. Registrar em AuditLog
        await logAudit({
            userId: consultant.id,
            action: 'MEETING_SCHEDULED',
            entity: 'Meeting',
            entityId: meeting.id,
            changes: {
                leadId: params.leadId,
                scheduledAt: startDateTime,
                teamsJoinUrl: onlineMeeting?.joinWebUrl ?? undefined,
                provider: meetingData.provider,
            },
        });

        // 10. Enviar emails de confirmação
        await this.sendConfirmationEmails({
            meeting,
            lead,
            consultant,
            joinUrl: onlineMeeting?.joinWebUrl ?? undefined,
        });

        return {
            meeting,
            joinUrl: onlineMeeting?.joinWebUrl ?? undefined,
        };
    }

    /**
     * Verifica se slot está disponível (Lógica simplificada buscando conflitos)
     */
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

    /**
     * Cancela reunião
     */
    async cancelMeeting(meetingId: string, reason?: string, cancelledBy?: string) {
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: {
                user: true,
                lead: true,
            },
        });

        if (!meeting) {
            throw new Error('Reunião não encontrada');
        }

        // Cancelar no Teams e Calendário
        if (meeting.teamsEventId && meeting.user.email) {
            try {
                await graphService.cancelCalendarEvent(meeting.user.email, meeting.teamsEventId);
            } catch (e) {
                console.error('Failed to cancel Teams event, proceeding with DB update', e);
            }
        }

        // Atualizar no banco
        await prisma.meeting.update({
            where: { id: meetingId },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelReason: reason,
                cancelledBy,
            },
        });

        // Notificar audit
        await logAudit({
            userId: cancelledBy || meeting.userId,
            action: 'MEETING_CANCELLED',
            entity: 'Meeting',
            entityId: meeting.id,
            changes: { reason },
        });
    }

    /**
     * Envia emails de confirmação (Abstração sobre o email.ts existente)
     */
    private async sendConfirmationEmails(params: {
        meeting: Pick<Meeting, 'startTime'>;
        lead: Pick<Lead, 'email' | 'name' | 'company'>;
        consultant: Pick<User, 'email' | 'name'>;
        joinUrl?: string;
    }) {
        // Nota: Usando a função genérica sendEmail ou as específicas se existirem no lib/email.ts
        // Como não quero quebrar se não houver templates específicos, vou usar uma lógica básica

        const meetingLinkHtml = params.joinUrl
            ? `<p><strong>Link da Reunião (Teams):</strong> <a href="${sanitizeUrl(params.joinUrl) || '#'}">Clique aqui para entrar</a></p>`
            : '<p><strong>Local:</strong> A confirmar (Reunião Presencial/Telefone)</p>';

        const meetingLinkHtmlConsultant = params.joinUrl
            ? `<p><strong>Link Teams:</strong> <a href="${sanitizeUrl(params.joinUrl) || '#'}">Entrar na Reunião</a></p>`
            : '';

        // Email para o Lead
        await sendEmail({
            to: params.lead.email,
            subject: 'Confirmação de Reunião - Hiperfarma',
            html: `
        <h1>Olá ${escapeHtml(params.lead.name)},</h1>
        <p>Sua reunião com <strong>${escapeHtml(params.consultant.name)}</strong> foi agendada com sucesso.</p>
        <p><strong>Data:</strong> ${escapeHtml(formatPtBrDateTime(params.meeting.startTime))}</p>
        ${meetingLinkHtml}
        <br/>
        <p>Atenciosamente,<br/>Expansão Hiperfarma</p>
      `,
        });

        // Email para o Consultor
        await sendEmail({
            to: params.consultant.email,
            subject: `Novo Agendamento: ${escapeHtml(params.lead.name)}`,
            html: `
        <h1>Olá ${escapeHtml(params.consultant.name)},</h1>
        <p>Um novo lead agendou uma apresentação com você.</p>
        <p><strong>Lead:</strong> ${escapeHtml(params.lead.name)}</p>
        <p><strong>Empresa:</strong> ${escapeHtml(params.lead.company || 'Não informada')}</p>
        <p><strong>Data:</strong> ${escapeHtml(formatPtBrDateTime(params.meeting.startTime))}</p>
        ${meetingLinkHtmlConsultant}
      `,
        });
    }
}

export const meetingService = new MeetingService();


