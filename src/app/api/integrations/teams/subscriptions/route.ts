import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import {
    getStoredTeamsSubscriptions,
    getTeamsSubscriptionConfig,
    syncTeamsEventSubscriptions,
    type StoredTeamsSubscription,
    type TeamsSubscriptionSyncResult,
} from '@/lib/teams-sync';

interface SessionUser {
    id?: string;
    role?: UserRole;
}

function getSessionUser(session: unknown): SessionUser | null {
    if (!session || typeof session !== 'object') return null;
    return (session as { user?: SessionUser }).user || null;
}

type AuthHandler = typeof auth;
let authHandler: AuthHandler = auth;
type GetStoredSubscriptionsHandler = () => Promise<StoredTeamsSubscription[]>;
type GetSubscriptionConfigHandler = typeof getTeamsSubscriptionConfig;
type SyncSubscriptionsHandler = () => Promise<TeamsSubscriptionSyncResult>;

let getStoredSubscriptionsHandler: GetStoredSubscriptionsHandler = getStoredTeamsSubscriptions;
let getSubscriptionConfigHandler: GetSubscriptionConfigHandler = getTeamsSubscriptionConfig;
let syncSubscriptionsHandler: SyncSubscriptionsHandler = syncTeamsEventSubscriptions;

export function __setAuthHandlerForTests(handler: AuthHandler): void {
    authHandler = handler;
}

export function __resetAuthHandlerForTests(): void {
    authHandler = auth;
}

export function __setTeamsSubscriptionHandlersForTests(handlers: {
    getStoredSubscriptions?: GetStoredSubscriptionsHandler;
    getSubscriptionConfig?: GetSubscriptionConfigHandler;
    syncSubscriptions?: SyncSubscriptionsHandler;
}): void {
    if (handlers.getStoredSubscriptions) getStoredSubscriptionsHandler = handlers.getStoredSubscriptions;
    if (handlers.getSubscriptionConfig) getSubscriptionConfigHandler = handlers.getSubscriptionConfig;
    if (handlers.syncSubscriptions) syncSubscriptionsHandler = handlers.syncSubscriptions;
}

export function __resetTeamsSubscriptionHandlersForTests(): void {
    getStoredSubscriptionsHandler = getStoredTeamsSubscriptions;
    getSubscriptionConfigHandler = getTeamsSubscriptionConfig;
    syncSubscriptionsHandler = syncTeamsEventSubscriptions;
}

function canManageIntegrations(role?: UserRole): boolean {
    return can(role, 'integrations:manage');
}

// GET /api/integrations/teams/subscriptions
export async function GET() {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    if (!canManageIntegrations(user.role)) {
        return NextResponse.json({ error: 'Sem permissao' }, { status: 403 });
    }

    try {
        const [config, subscriptions] = await Promise.all([
            getSubscriptionConfigHandler(),
            getStoredSubscriptionsHandler(),
        ]);

        return NextResponse.json({
            config,
            subscriptions,
        });
    } catch (error) {
        console.error('Error reading Teams subscriptions:', error);
        return NextResponse.json({ error: 'Erro ao consultar subscriptions do Teams' }, { status: 500 });
    }
}

// POST /api/integrations/teams/subscriptions
export async function POST() {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    if (!canManageIntegrations(user.role)) {
        return NextResponse.json({ error: 'Sem permissao' }, { status: 403 });
    }

    const config = getSubscriptionConfigHandler();
    if (!config.configured) {
        return NextResponse.json({
            error: 'Teams subscriptions nao configuradas',
            config,
        }, { status: 503 });
    }

    try {
        const result = await syncSubscriptionsHandler();

        await logAudit({
            userId: user.id,
            action: 'SYNC',
            entity: 'TeamsSubscription',
            entityId: 'all',
            changes: {
                created: result.created,
                renewed: result.renewed,
                removed: result.removed,
                failed: result.failed,
                totalActiveOrganizers: result.totalActiveOrganizers,
            },
        });

        return NextResponse.json({
            success: true,
            config,
            result,
        });
    } catch (error) {
        console.error('Error syncing Teams subscriptions:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Erro ao sincronizar subscriptions do Teams',
            config,
        }, { status: 500 });
    }
}
