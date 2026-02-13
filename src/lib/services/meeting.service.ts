import { prisma } from '@/lib/prisma';
import { graphService } from './microsoft-graph.service';
import { sendEmail } from '@/lib/email';
import { addMinutes } from 'date-fns';
import { logAudit } from '@/lib/audit';

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
        const qualData = lead.qualificationData as any;
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

        // 5. Criar reunião no Teams
        const onlineMeeting = await graphService.createOnlineMeeting({
            subject,
            startDateTime,
            endDateTime,
            organizerEmail: consultant.email,
        });

        // 6. Criar evento no calendário
        const calendarEvent = await graphService.createCalendarEvent({
            consultantEmail: consultant.email,
            subject,
            startDateTime,
            endDateTime,
            joinUrl: onlineMeeting.joinWebUrl!,
            leadName: lead.name,
            leadEmail: lead.email,
            leadPhone: lead.phone,
        });

        // 7. Salvar no banco (Novo Schema v1.0)
        const meeting = await prisma.meeting.create({
            data: {
                leadId: params.leadId,
                userId: params.consultantId,
                title: subject,
                startTime: startDateTime,
                endTime: endDateTime,
                scheduledAt: startDateTime,
                duration: params.duration || 60,
                status: 'SCHEDULED',
                teamsEventId: calendarEvent.id!,
                teamsMeetingId: onlineMeeting.id!,
                teamsJoinUrl: onlineMeeting.joinWebUrl!,
                teamsThreadId: onlineMeeting.chatInfo?.threadId,
                leadNotes: params.leadNotes,
                provider: 'teams',
            },
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
                teamsJoinUrl: onlineMeeting.joinWebUrl,
            },
        });

        // 10. Enviar emails de confirmação
        await this.sendConfirmationEmails({
            meeting,
            lead,
            consultant,
            joinUrl: onlineMeeting.joinWebUrl!,
        });

        return {
            meeting,
            joinUrl: onlineMeeting.joinWebUrl!,
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
        meeting: any;
        lead: any;
        consultant: any;
        joinUrl: string;
    }) {
        // Nota: Usando a função genérica sendEmail ou as específicas se existirem no lib/email.ts
        // Como não quero quebrar se não houver templates específicos, vou usar uma lógica básica

        // Email para o Lead
        await sendEmail({
            to: params.lead.email,
            subject: 'Confirmação de Reunião - Hiperfarma',
            html: `
        <h1>Olá ${params.lead.name},</h1>
        <p>Sua reunião com <strong>${params.consultant.name}</strong> foi agendada com sucesso.</p>
        <p><strong>Data:</strong> ${params.meeting.startTime.toLocaleString('pt-BR')}</p>
        <p><strong>Link da Reunião (Teams):</strong> <a href="${params.joinUrl}">Clique aqui para entrar</a></p>
        <br/>
        <p>Atenciosamente,<br/>Expansão Hiperfarma</p>
      `,
        });

        // Email para o Consultor
        await sendEmail({
            to: params.consultant.email,
            subject: `Novo Agendamento: ${params.lead.name}`,
            html: `
        <h1>Olá ${params.consultant.name},</h1>
        <p>Um novo lead agendou uma apresentação com você.</p>
        <p><strong>Lead:</strong> ${params.lead.name}</p>
        <p><strong>Empresa:</strong> ${params.lead.company || 'Não informada'}</p>
        <p><strong>Data:</strong> ${params.meeting.startTime.toLocaleString('pt-BR')}</p>
        <p><strong>Link Teams:</strong> <a href="${params.joinUrl}">Entrar na Reunião</a></p>
      `,
        });
    }
}

export const meetingService = new MeetingService();
