import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { logAudit } from '@/lib/audit';
import { syncTeamsEventSubscriptions, type TeamsSubscriptionSyncResult } from '@/lib/teams-sync';

type SyncSubscriptionsHandler = () => Promise<TeamsSubscriptionSyncResult>;
let syncSubscriptionsHandler: SyncSubscriptionsHandler = syncTeamsEventSubscriptions;

export function __setSyncSubscriptionsHandlerForTests(handler: SyncSubscriptionsHandler): void {
    syncSubscriptionsHandler = handler;
}

export function __resetSyncSubscriptionsHandlerForTests(): void {
    syncSubscriptionsHandler = syncTeamsEventSubscriptions;
}

function readBearerToken(request: Request): string | null {
    const authorization = request.headers.get('authorization');
    if (!authorization) return null;
    const [scheme, token] = authorization.split(' ');
    if (!scheme || !token) return null;
    if (scheme.toLowerCase() !== 'bearer') return null;
    return token.trim();
}

function isAuthorizedCronRequest(request: Request): boolean {
    const expectedToken = process.env.TEAMS_SYNC_CRON_TOKEN?.trim();
    if (!expectedToken) return false;
    const providedToken = readBearerToken(request);
    if (!providedToken) return false;

    const expectedBuffer = Buffer.from(expectedToken);
    const providedBuffer = Buffer.from(providedToken);
    if (expectedBuffer.length !== providedBuffer.length) return false;

    return timingSafeEqual(expectedBuffer, providedBuffer);
}

// POST /api/integrations/teams/subscriptions/sync
export async function POST(request: Request) {
    if (!process.env.TEAMS_SYNC_CRON_TOKEN?.trim()) {
        return NextResponse.json(
            { error: 'TEAMS_SYNC_CRON_TOKEN nao configurado' },
            { status: 503 }
        );
    }

    if (!isAuthorizedCronRequest(request)) {
        return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    try {
        const result = await syncSubscriptionsHandler();

        await logAudit({
            action: 'CRON_SYNC',
            entity: 'TeamsSubscription',
            entityId: 'all',
            changes: {
                source: 'cron',
                created: result.created,
                renewed: result.renewed,
                removed: result.removed,
                failed: result.failed,
                totalActiveOrganizers: result.totalActiveOrganizers,
            },
        });

        return NextResponse.json({
            success: true,
            result,
        });
    } catch (error) {
        console.error('Error in Teams subscriptions cron sync:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Erro ao sincronizar subscriptions do Teams',
        }, { status: 500 });
    }
}
