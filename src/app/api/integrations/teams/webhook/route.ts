import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { getTeamsEvent, type TeamsEventPayload } from '@/lib/teams';
import { getTeamsWebhookClientState } from '@/lib/teams-sync';

export const runtime = 'nodejs';

interface TeamsGraphNotification {
    changeType?: string;
    clientState?: string;
    resource?: string;
    resourceData?: {
        id?: string;
    };
}

interface ParsedResource {
    organizer: string | null;
    externalEventId: string | null;
}

type GetTeamsEventHandler = typeof getTeamsEvent;
type GetClientStateHandler = typeof getTeamsWebhookClientState;
type TeamsWebhookProcessingMode = 'background' | 'sync';
const MAX_NOTIFICATIONS_PER_REQUEST = 100;
const QUEUE_BATCH_SIZE = 25;
const QUEUE_MAX_ATTEMPTS = 5;
const QUEUE_RETRY_BASE_MS = 30_000;
const QUEUE_STALE_PROCESSING_MS = 5 * 60 * 1000;

let getTeamsEventHandler: GetTeamsEventHandler = getTeamsEvent;
let getClientStateHandler: GetClientStateHandler = getTeamsWebhookClientState;
let processingMode: TeamsWebhookProcessingMode = 'background';
let queueDrainInFlight = false;
let queueDrainRequested = false;

export function __setTeamsWebhookHandlersForTests(handlers: {
    getTeamsEvent?: GetTeamsEventHandler;
    getClientState?: GetClientStateHandler;
}): void {
    if (handlers.getTeamsEvent) getTeamsEventHandler = handlers.getTeamsEvent;
    if (handlers.getClientState) getClientStateHandler = handlers.getClientState;
}

export function __resetTeamsWebhookHandlersForTests(): void {
    getTeamsEventHandler = getTeamsEvent;
    getClientStateHandler = getTeamsWebhookClientState;
    processingMode = 'background';
    queueDrainInFlight = false;
    queueDrainRequested = false;
}

export function __setTeamsWebhookProcessingModeForTests(mode: TeamsWebhookProcessingMode): void {
    processingMode = mode;
}

function parseResource(resource?: string): ParsedResource {
    if (!resource) return { organizer: null, externalEventId: null };
    const trimmed = resource.trim();
    if (!trimmed) return { organizer: null, externalEventId: null };

    const slashMatch = trimmed.match(/\/users\/([^/]+)\/events\/([^/?]+)/i);
    if (slashMatch) {
        return {
            organizer: decodeURIComponent(slashMatch[1] || ''),
            externalEventId: decodeURIComponent(slashMatch[2] || ''),
        };
    }

    const functionStyleMatch = trimmed.match(/Users\('([^']+)'\)\/Events\('([^']+)'\)/i);
    if (functionStyleMatch) {
        return {
            organizer: decodeURIComponent(functionStyleMatch[1] || ''),
            externalEventId: decodeURIComponent(functionStyleMatch[2] || ''),
        };
    }

    return { organizer: null, externalEventId: null };
}

function readValidationToken(request: Request): string | null {
    const token = new URL(request.url).searchParams.get('validationToken');
    if (!token) return null;
    return token;
}

function isValidChangeType(changeType?: string): boolean {
    return changeType === 'created' || changeType === 'updated' || changeType === 'deleted';
}

function safeTokenCompare(expected: string, provided?: string): boolean {
    if (!provided) return false;

    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);
    if (expectedBuffer.length !== providedBuffer.length) return false;

    return timingSafeEqual(expectedBuffer, providedBuffer);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseNotification(value: Prisma.JsonValue): TeamsGraphNotification | null {
    if (!isRecord(value)) return null;
    return value as TeamsGraphNotification;
}

function buildRetryDate(attempts: number): Date {
    const delay = Math.min(QUEUE_RETRY_BASE_MS * Math.max(attempts, 1), 30 * 60 * 1000);
    return new Date(Date.now() + delay);
}

function buildMeetingUpdate(
    current: {
        startTime: Date;
        endTime: Date;
        status: string;
        teamsJoinUrl: string | null;
        provider: string | null;
    },
    teamsEvent: TeamsEventPayload
): Prisma.MeetingUpdateInput {
    const update: Prisma.MeetingUpdateInput = {};
    if (current.provider !== 'teams') {
        update.provider = 'teams';
    }

    const nextStartTime = teamsEvent.startTime;
    const nextEndTime = teamsEvent.endTime;
    const hasStart = nextStartTime instanceof Date && !Number.isNaN(nextStartTime.getTime());
    const hasEnd = nextEndTime instanceof Date && !Number.isNaN(nextEndTime.getTime());
    const startChanged = hasStart && nextStartTime.getTime() !== current.startTime.getTime();
    const endChanged = hasEnd && nextEndTime.getTime() !== current.endTime.getTime();
    const timeChanged = startChanged || endChanged;
    const canChangeStatus = current.status !== 'COMPLETED' && current.status !== 'NO_SHOW';

    if (hasStart && startChanged) update.startTime = nextStartTime;
    if (hasEnd && endChanged) update.endTime = nextEndTime;

    if (teamsEvent.meetingLink && teamsEvent.meetingLink !== current.teamsJoinUrl) {
        update.teamsJoinUrl = teamsEvent.meetingLink;
    }

    if (timeChanged && canChangeStatus) {
        update.status = 'RESCHEDULED';
        update.cancelledAt = null;
    } else if (current.status === 'CANCELLED' && canChangeStatus) {
        update.status = 'SCHEDULED';
        update.cancelledAt = null;
    }

    return update;
}

function shouldUpdateMeeting(update: Prisma.MeetingUpdateInput): boolean {
    return Object.keys(update).length > 0;
}

async function syncCancellation(meeting: {
    id: string;
    leadId: string;
    userId: string;
    status: string;
}): Promise<'updated' | 'ignored'> {
    if (meeting.status === 'CANCELLED') return 'ignored';

    await prisma.$transaction(async (tx) => {
        await tx.meeting.update({
            where: { id: meeting.id },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                completedAt: null,
                provider: 'teams',
            },
        });

        await tx.activity.create({
            data: {
                leadId: meeting.leadId,
                userId: meeting.userId,
                type: 'MEETING',
                title: 'Reuniao cancelada via Teams',
            },
        });
    });

    await logAudit({
        userId: meeting.userId,
        action: 'TEAMS_SYNC',
        entity: 'Meeting',
        entityId: meeting.id,
        changes: { status: 'CANCELLED', source: 'teams-webhook' },
    });

    return 'updated';
}

async function processNotification(notification: TeamsGraphNotification): Promise<'updated' | 'ignored'> {
    const expectedClientState = getClientStateHandler();
    if (!expectedClientState) return 'ignored';
    if (!safeTokenCompare(expectedClientState, notification.clientState)) return 'ignored';
    if (!isValidChangeType(notification.changeType)) return 'ignored';

    const parsed = parseResource(notification.resource);
    const teamsEventId = parsed.externalEventId || notification.resourceData?.id || null;
    if (!teamsEventId) return 'ignored';

    const meeting = await prisma.meeting.findUnique({
        where: { teamsEventId },
        select: {
            id: true,
            leadId: true,
            userId: true,
            status: true,
            startTime: true,
            endTime: true,
            teamsJoinUrl: true,
            provider: true,
            user: { select: { email: true } },
        },
    });
    if (!meeting) return 'ignored';

    if (notification.changeType === 'deleted') {
        return syncCancellation(meeting);
    }

    const organizer = meeting.user.email || parsed.organizer;
    if (!organizer) return 'ignored';

    const teamsEvent = await getTeamsEventHandler({
        organizerEmail: organizer,
        externalEventId: teamsEventId,
    });

    if (!teamsEvent || teamsEvent.isCancelled) {
        return syncCancellation(meeting);
    }

    const update = buildMeetingUpdate(meeting, teamsEvent);
    if (!shouldUpdateMeeting(update)) return 'ignored';

    await prisma.meeting.update({
        where: { id: meeting.id },
        data: update,
    });

    await logAudit({
        userId: meeting.userId,
        action: 'TEAMS_SYNC',
        entity: 'Meeting',
        entityId: meeting.id,
        changes: {
            source: 'teams-webhook',
            teamsEventId,
            status: update.status || meeting.status,
            teamsJoinUrlUpdated: update.teamsJoinUrl !== undefined,
        },
    });

    if (update.status === 'RESCHEDULED') {
        await prisma.activity.create({
            data: {
                leadId: meeting.leadId,
                userId: meeting.userId,
                type: 'MEETING',
                title: 'Reuniao reagendada via Teams',
            },
        });
    }

    return 'updated';
}

async function processNotifications(notifications: TeamsGraphNotification[]): Promise<void> {
    for (const notification of notifications) {
        try {
            await processNotification(notification);
        } catch (error) {
            console.error('Error processing Teams webhook notification:', error);
        }
    }
}

function scheduleQueueDrain(): void {
    if (queueDrainInFlight) {
        queueDrainRequested = true;
        return;
    }

    queueDrainRequested = false;
    setTimeout(() => {
        void drainQueue();
    }, 0);
}

async function enqueueNotifications(notifications: TeamsGraphNotification[]): Promise<void> {
    if (!notifications.length) return;

    await prisma.teamsWebhookJob.createMany({
        data: notifications.map((notification) => ({
            status: 'PENDING',
            attempts: 0,
            nextRunAt: new Date(),
            notification: notification as unknown as Prisma.InputJsonValue,
        })),
    });
}

async function drainQueueBatch(): Promise<number> {
    const staleLockCutoff = new Date(Date.now() - QUEUE_STALE_PROCESSING_MS);
    const rows = await prisma.teamsWebhookJob.findMany({
        where: {
            OR: [
                {
                    status: 'PENDING',
                    nextRunAt: { lte: new Date() },
                },
                {
                    status: 'PROCESSING',
                    lockedAt: { lte: staleLockCutoff },
                },
            ],
        },
        orderBy: [
            { nextRunAt: 'asc' },
            { createdAt: 'asc' },
        ],
        take: QUEUE_BATCH_SIZE,
    });

    let processed = 0;
    for (const row of rows) {
        const notification = parseNotification(row.notification as Prisma.JsonValue);
        if (!notification) {
            await prisma.teamsWebhookJob.delete({ where: { id: row.id } }).catch(() => undefined);
            continue;
        }

        const now = new Date();
        const claim = await prisma.teamsWebhookJob.updateMany({
            where: {
                id: row.id,
                updatedAt: row.updatedAt,
            },
            data: {
                status: 'PROCESSING',
                attempts: { increment: 1 },
                lockedAt: now,
                nextRunAt: now,
            },
        });
        if (claim.count === 0) continue;

        try {
            await processNotification(notification);
            await prisma.teamsWebhookJob.delete({ where: { id: row.id } });
        } catch (error) {
            const attempts = row.attempts + 1;
            const exhausted = attempts >= QUEUE_MAX_ATTEMPTS;
            await prisma.teamsWebhookJob.update({
                where: { id: row.id },
                data: {
                    status: exhausted ? 'FAILED' : 'PENDING',
                    nextRunAt: exhausted ? new Date() : buildRetryDate(attempts),
                    lockedAt: null,
                    lastError: error instanceof Error ? error.message : String(error),
                },
            }).catch(() => undefined);
        }

        processed += 1;
    }

    return processed;
}

async function drainQueue(): Promise<void> {
    if (queueDrainInFlight) {
        queueDrainRequested = true;
        return;
    }

    queueDrainInFlight = true;
    try {
        while (true) {
            const processed = await drainQueueBatch();
            if (processed === 0) break;
        }
    } finally {
        queueDrainInFlight = false;
        if (queueDrainRequested) {
            queueDrainRequested = false;
            scheduleQueueDrain();
        }
    }
}

// GET /api/integrations/teams/webhook
export async function GET(request: Request) {
    const validationToken = readValidationToken(request);

    if (!validationToken) {
        return NextResponse.json({ error: 'validationToken ausente' }, { status: 400 });
    }

    return new Response(validationToken, {
        status: 200,
        headers: {
            'content-type': 'text/plain',
        },
    });
}

// POST /api/integrations/teams/webhook
export async function POST(request: Request) {
    const validationToken = readValidationToken(request);
    if (validationToken) {
        return new Response(validationToken, {
            status: 200,
            headers: {
                'content-type': 'text/plain',
            },
        });
    }

    try {
        const body = await request.json() as { value?: TeamsGraphNotification[] };
        const notifications = Array.isArray(body?.value) ? body.value : null;
        if (!notifications) {
            return NextResponse.json({ error: 'Payload invalido' }, { status: 400 });
        }
        if (notifications.length > MAX_NOTIFICATIONS_PER_REQUEST) {
            return NextResponse.json({ error: 'Muitas notificacoes no payload' }, { status: 413 });
        }

        if (processingMode === 'sync') {
            await processNotifications(notifications);
        } else {
            await enqueueNotifications(notifications);
            scheduleQueueDrain();
        }

        return NextResponse.json({ accepted: true, queued: notifications.length }, { status: 202 });
    } catch (error) {
        console.error('Error processing Teams webhook:', error);
        return NextResponse.json({ error: 'Erro ao processar webhook do Teams' }, { status: 500 });
    }
}
