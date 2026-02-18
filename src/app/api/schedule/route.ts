import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scheduleBookingSchema } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { sendMeetingConfirmationToLead, sendMeetingNotificationToConsultor } from '@/lib/email';
import { logAudit } from '@/lib/audit';
import { getPublicAvailabilitySlotsForDate, validateConsultorAvailabilityWindow } from '@/lib/availability';
import { isMeetingOverlapError } from '@/lib/meeting-conflict';
import { cancelTeamsMeeting, createTeamsMeeting, isTeamsConfigured, type TeamsMeetingPayload } from '@/lib/teams';
import { createInAppNotifications, notifyActiveManagers } from '@/lib/crm-notifications';

interface StageProgression {
    pipelineStageId: string | null;
    status: 'CONTACTED';
}

interface DateParts {
    year: number;
    month: number;
    day: number;
}

const MIN_SCHEDULING_ADVANCE_HOURS = 2;
type IsTeamsConfiguredHandler = typeof isTeamsConfigured;
type CreateTeamsMeetingHandler = typeof createTeamsMeeting;
type CancelTeamsMeetingHandler = typeof cancelTeamsMeeting;

let isTeamsConfiguredHandler: IsTeamsConfiguredHandler = isTeamsConfigured;
let createTeamsMeetingHandler: CreateTeamsMeetingHandler = createTeamsMeeting;
let cancelTeamsMeetingHandler: CancelTeamsMeetingHandler = cancelTeamsMeeting;

function resolveAppUrl(request: Request): string {
    const explicitAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
    if (explicitAppUrl) return explicitAppUrl.replace(/\/$/, '');

    // Last-resort fallback to request origin to avoid localhost links in production.
    return new URL(request.url).origin.replace(/\/$/, '');
}

export function __setTeamsHandlersForTests(handlers: {
    isTeamsConfigured?: IsTeamsConfiguredHandler;
    createTeamsMeeting?: CreateTeamsMeetingHandler;
    cancelTeamsMeeting?: CancelTeamsMeetingHandler;
}): void {
    if (handlers.isTeamsConfigured) isTeamsConfiguredHandler = handlers.isTeamsConfigured;
    if (handlers.createTeamsMeeting) createTeamsMeetingHandler = handlers.createTeamsMeeting;
    if (handlers.cancelTeamsMeeting) cancelTeamsMeetingHandler = handlers.cancelTeamsMeeting;
}

export function __resetTeamsHandlersForTests(): void {
    isTeamsConfiguredHandler = isTeamsConfigured;
    createTeamsMeetingHandler = createTeamsMeeting;
    cancelTeamsMeetingHandler = cancelTeamsMeeting;
}

function getQualificationData(data: unknown): Record<string, unknown> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    return data as Record<string, unknown>;
}

function parseDateParts(date: string): DateParts | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

    const [yearRaw, monthRaw, dayRaw] = date.split('-');
    const year = Number.parseInt(yearRaw, 10);
    const month = Number.parseInt(monthRaw, 10);
    const day = Number.parseInt(dayRaw, 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

    const parsed = new Date(year, month - 1, day);
    if (
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
    ) {
        return null;
    }

    return { year, month, day };
}

function buildLocalDate(parts: DateParts, hour = 0, minute = 0, second = 0, ms = 0): Date {
    return new Date(parts.year, parts.month - 1, parts.day, hour, minute, second, ms);
}

function parseLocalDateTime(date: string, time: string): Date | null {
    const parts = parseDateParts(date);
    if (!parts) return null;
    if (!/^\d{2}:\d{2}$/.test(time)) return null;

    const [hourRaw, minuteRaw] = time.split(':');
    const hour = Number.parseInt(hourRaw, 10);
    const minute = Number.parseInt(minuteRaw, 10);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

    const parsed = buildLocalDate(parts, hour, minute);
    if (
        parsed.getFullYear() !== parts.year ||
        parsed.getMonth() !== parts.month - 1 ||
        parsed.getDate() !== parts.day ||
        parsed.getHours() !== hour ||
        parsed.getMinutes() !== minute
    ) {
        return null;
    }

    return parsed;
}

async function resolveMeetingProgression(leadId: string): Promise<StageProgression> {
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

// GET /api/schedule - Get available slots (public)
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
        return NextResponse.json({ error: 'Parametro date e obrigatorio' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rl = await rateLimit(`schedule:slots:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Muitas requisicoes' }, { status: 429 });
    }

    try {
        const result = await getPublicAvailabilitySlotsForDate(date, {
            minAdvanceHours: MIN_SCHEDULING_ADVANCE_HOURS,
        });
        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json({
            date: result.date,
            slots: result.slots,
            availableCount: result.availableCount,
            message: result.message,
        });
    } catch (error) {
        console.error('Error generating slots:', error);
        return NextResponse.json({ error: 'Erro ao gerar horarios' }, { status: 500 });
    }
}

// POST /api/schedule - Book a meeting (public self-service)
export async function POST(request: Request) {
    const ip = getClientIp(request);
    const rl = await rateLimit(`schedule:book:${ip}`, { limit: 5, windowSec: 300 });
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Muitas tentativas de agendamento' }, { status: 429 });
    }

    let rollbackAttempted = false;
    let meetingPersisted = false;
    let teamsRollbackContext: { organizerEmail: string; externalEventId: string } | null = null;
    const rollbackTeamsMeeting = async () => {
        if (rollbackAttempted) return;
        rollbackAttempted = true;
        if (!teamsRollbackContext) return;
        try {
            await cancelTeamsMeetingHandler({
                organizerEmail: teamsRollbackContext.organizerEmail,
                externalEventId: teamsRollbackContext.externalEventId,
            });
        } catch (error) {
            console.error('Failed to rollback Teams meeting:', error);
        }
    };

    try {
        const body = await request.json();
        const parsed = scheduleBookingSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { leadId, token, consultorId, date, time, notes } = parsed.data;

        const startTime = parseLocalDateTime(date, time);
        if (!startTime || Number.isNaN(startTime.getTime())) {
            return NextResponse.json({ error: 'Data/hora invalida' }, { status: 400 });
        }
        const minAdvanceTime = new Date(Date.now() + MIN_SCHEDULING_ADVANCE_HOURS * 60 * 60 * 1000);
        if (startTime < minAdvanceTime) {
            return NextResponse.json({ error: 'Agende com no minimo 2 horas de antecedencia' }, { status: 400 });
        }

        const dayOfWeek = startTime.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return NextResponse.json({ error: 'Nao atendemos aos finais de semana' }, { status: 400 });
        }

        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

        const [lead, consultor] = await Promise.all([
            prisma.lead.findUnique({
                where: { id: leadId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    company: true,
                    grade: true,
                    score: true,
                    qualificationData: true,
                    assignedUserId: true,
                },
            }),
            prisma.user.findUnique({
                where: { id: consultorId },
                select: { id: true, name: true, email: true, role: true, status: true },
            }),
        ]);

        if (!lead) {
            return NextResponse.json({ error: 'Lead nao encontrado' }, { status: 404 });
        }

        const qualificationData = getQualificationData(lead.qualificationData);
        if (qualificationData.funnelToken !== token) {
            return NextResponse.json({ error: 'Sessao de agendamento invalida' }, { status: 403 });
        }
        if (!qualificationData.step5CompletedAt) {
            return NextResponse.json({ error: 'Finalize a qualificacao antes de agendar' }, { status: 403 });
        }
        if (!lead.grade || !['A', 'B'].includes(lead.grade)) {
            return NextResponse.json({ error: 'Somente leads aprovados podem agendar' }, { status: 403 });
        }

        if (!consultor || consultor.status !== 'ACTIVE' || !['CONSULTANT', 'MANAGER'].includes(consultor.role)) {
            return NextResponse.json({ error: 'Consultor invalido ou inativo' }, { status: 404 });
        }

        const availabilityValidation = await validateConsultorAvailabilityWindow({
            consultorId,
            startTime,
            endTime,
        });
        if (!availabilityValidation.ok) {
            return NextResponse.json({ error: availabilityValidation.reason }, { status: 409 });
        }

        let teamsMeeting: TeamsMeetingPayload | null = null;
        if (isTeamsConfiguredHandler()) {
            try {
                teamsMeeting = await createTeamsMeetingHandler({
                    organizerEmail: consultor.email,
                    leadEmail: lead.email,
                    leadName: lead.name,
                    subject: `Reuniao de Expansao - ${lead.name}`,
                    description: notes || null,
                    startTime,
                    endTime,
                });
                teamsRollbackContext = {
                    organizerEmail: consultor.email,
                    externalEventId: teamsMeeting.externalEventId,
                };
            } catch (error) {
                console.error('Error creating Teams meeting. Proceeding with internal schedule:', error);
                teamsMeeting = null;
            }
        }

        const booking = await (async () => {
            try {
                return await prisma.$transaction(async (tx) => {
                    const leadLockKey = `schedule:lead:${leadId}`;
                    const slotLockKey = `schedule:${consultorId}:${date}:${time}`;
                    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${leadLockKey}))`;
                    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${slotLockKey}))`;

                    const existingLeadMeeting = await tx.meeting.findFirst({
                        where: {
                            leadId,
                            status: { in: ['SCHEDULED', 'RESCHEDULED'] },
                        },
                        select: { id: true },
                    });
                    if (existingLeadMeeting) {
                        return { kind: 'LEAD_CONFLICT' as const };
                    }

                    const conflict = await tx.meeting.findFirst({
                        where: {
                            userId: consultorId,
                            status: { in: ['SCHEDULED', 'RESCHEDULED'] },
                            startTime: { lt: endTime },
                            endTime: { gt: startTime },
                        },
                        select: { id: true },
                    });

                    if (conflict) return { kind: 'SLOT_CONFLICT' as const };

                    const meeting = await tx.meeting.create({
                        data: {
                            leadId,
                            userId: consultorId,
                            title: `Reuniao de Expansao - ${lead.name}`,
                            description: notes || null,
                            startTime,
                            endTime,
                            selfScheduled: true,
                            status: 'SCHEDULED',
                            teamsJoinUrl: teamsMeeting?.meetingLink ?? null,
                            teamsEventId: teamsMeeting?.externalEventId ?? null,
                            provider: teamsMeeting?.provider ?? 'local',
                        },
                    });

                    return { kind: 'CREATED' as const, meeting };
                });
            } catch (error) {
                if (isMeetingOverlapError(error)) {
                    await rollbackTeamsMeeting();
                    return { kind: 'SLOT_CONFLICT' as const };
                }
                throw error;
            }
        })();

        if (booking.kind === 'LEAD_CONFLICT') {
            await rollbackTeamsMeeting();
            return NextResponse.json({ error: 'Este lead ja possui reuniao agendada' }, { status: 409 });
        }
        if (booking.kind === 'SLOT_CONFLICT') {
            await rollbackTeamsMeeting();
            return NextResponse.json({ error: 'Horario indisponivel' }, { status: 409 });
        }

        const meeting = booking.meeting;
        meetingPersisted = true;
        const progression = await resolveMeetingProgression(leadId);
        await prisma.lead.update({
            where: { id: leadId },
            data: progression,
        });

        await prisma.activity.create({
            data: {
                leadId,
                type: 'MEETING',
                title: 'Reuniao agendada (self-service)',
                description: `${date} as ${time} com ${consultor.name}`,
                userId: consultorId,
            },
        });

        const dateFormatted = startTime.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const timeFormatted = `${time} - ${endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        const appUrl = resolveAppUrl(request);

        sendMeetingConfirmationToLead({
            leadName: lead.name,
            leadEmail: lead.email,
            consultorName: consultor.name,
            date: dateFormatted,
            time: timeFormatted,
            meetingLink: meeting.teamsJoinUrl || undefined,
            appUrl,
        }).catch((err) => console.error('[Schedule] Email to lead failed:', err));

        const shouldNotifyConsultant = lead.assignedUserId === consultorId;
        if (shouldNotifyConsultant) {
            sendMeetingNotificationToConsultor({
                consultorEmail: consultor.email,
                consultorName: consultor.name,
                leadName: lead.name,
                leadEmail: lead.email,
                leadPhone: lead.phone || '',
                leadCompany: lead.company || '',
                score: lead.score || 0,
                grade: lead.grade || 'C',
                desafios: [],
                urgencia: '',
                date: dateFormatted,
                time: timeFormatted,
                meetingLink: meeting.teamsJoinUrl || undefined,
                leadNotes: notes || undefined,
                leadCrmUrl: `${appUrl}/dashboard/leads/${leadId}`,
                appUrl,
            }).catch((err) => console.error('[Schedule] Email to consultor failed:', err));

            await createInAppNotifications([consultorId], {
                title: 'Reuniao agendada',
                message: `Nova reuniao com ${lead.name}.`,
                link: `/dashboard/leads/${leadId}`,
                type: 'info',
            });
        }

        await notifyActiveManagers({
            title: 'Reuniao agendada',
            message: `${lead.name} teve reuniao agendada com ${consultor.name}.`,
            link: `/dashboard/leads/${leadId}`,
            emailSubject: 'Nova reuniao agendada no CRM',
        });

        await logAudit({
            userId: consultorId,
            action: 'SELF_SCHEDULE',
            entity: 'Meeting',
            entityId: meeting.id,
            changes: { leadId, consultorId, date, time },
        });

        return NextResponse.json({
            success: true,
            meeting: {
                id: meeting.id,
                date: dateFormatted,
                time: timeFormatted,
                consultorName: consultor.name,
            },
        }, { status: 201 });
    } catch (error) {
        if (!meetingPersisted) {
            await rollbackTeamsMeeting();
        }
        console.error('Error booking meeting:', error);
        return NextResponse.json({ error: 'Erro ao agendar reuniao' }, { status: 500 });
    }
}
