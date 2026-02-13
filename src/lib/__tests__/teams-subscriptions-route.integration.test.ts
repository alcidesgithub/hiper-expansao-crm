import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/lib/prisma';
import {
    GET as getTeamsSubscriptionsRoute,
    POST as postTeamsSubscriptionsRoute,
    __resetAuthHandlerForTests as resetAuthHandler,
    __resetTeamsSubscriptionHandlersForTests as resetTeamsSubscriptionHandlers,
    __setAuthHandlerForTests as setAuthHandler,
    __setTeamsSubscriptionHandlersForTests as setTeamsSubscriptionHandlers,
} from '@/app/api/integrations/teams/subscriptions/route';
import {
    mockMethod,
    sessionForRole,
    type RestoreFn,
    withAuthSession,
} from '@/lib/__tests__/crm-role-test-utils';

test('GET /api/integrations/teams/subscriptions should return 401 when unauthenticated', async () => {
    const restoreAuth = withAuthSession(setAuthHandler, resetAuthHandler, null);

    try {
        const response = await getTeamsSubscriptionsRoute();
        assert.equal(response.status, 401);
    } finally {
        restoreAuth();
    }
});

test('GET /api/integrations/teams/subscriptions should return 403 for non-admin role', async () => {
    const restoreAuth = withAuthSession(setAuthHandler, resetAuthHandler, sessionForRole('MANAGER'));

    try {
        const response = await getTeamsSubscriptionsRoute();
        assert.equal(response.status, 403);
    } finally {
        restoreAuth();
    }
});

test('GET /api/integrations/teams/subscriptions should return config and subscriptions for admin', async () => {
    const restoreAuth = withAuthSession(setAuthHandler, resetAuthHandler, sessionForRole('ADMIN'));
    setTeamsSubscriptionHandlers({
        getSubscriptionConfig: () => ({
            configured: true,
            webhookUrl: 'https://crm.exemplo.com/api/integrations/teams/webhook',
            hasClientState: true,
        }),
        getStoredSubscriptions: async () => ([
            {
                id: 'sub-1',
                organizerEmail: 'consultor@empresa.com',
                resource: '/users/consultor@empresa.com/events',
                expirationDateTime: '2026-03-12T13:00:00.000Z',
                updatedAt: '2026-03-10T13:00:00.000Z',
            },
        ]),
    });

    try {
        const response = await getTeamsSubscriptionsRoute();
        assert.equal(response.status, 200);

        const payload = await response.json() as {
            config?: { configured?: boolean };
            subscriptions?: Array<{ id?: string }>;
        };
        assert.equal(payload.config?.configured, true);
        assert.equal(payload.subscriptions?.[0]?.id, 'sub-1');
    } finally {
        resetTeamsSubscriptionHandlers();
        restoreAuth();
    }
});

test('POST /api/integrations/teams/subscriptions should return 503 when config is incomplete', async () => {
    const restoreAuth = withAuthSession(setAuthHandler, resetAuthHandler, sessionForRole('ADMIN'));
    setTeamsSubscriptionHandlers({
        getSubscriptionConfig: () => ({
            configured: false,
            webhookUrl: null,
            hasClientState: false,
        }),
    });

    try {
        const response = await postTeamsSubscriptionsRoute();
        assert.equal(response.status, 503);
    } finally {
        resetTeamsSubscriptionHandlers();
        restoreAuth();
    }
});

test('POST /api/integrations/teams/subscriptions should sync and audit for admin', async () => {
    const restoreAuth = withAuthSession(setAuthHandler, resetAuthHandler, sessionForRole('ADMIN'));
    const restores: RestoreFn[] = [];
    let auditCreated = false;

    setTeamsSubscriptionHandlers({
        getSubscriptionConfig: () => ({
            configured: true,
            webhookUrl: 'https://crm.exemplo.com/api/integrations/teams/webhook',
            hasClientState: true,
        }),
        syncSubscriptions: async () => ({
            created: 1,
            renewed: 0,
            removed: 0,
            kept: 0,
            failed: 0,
            totalActiveOrganizers: 1,
            subscriptions: [{
                id: 'sub-1',
                organizerEmail: 'consultor@empresa.com',
                resource: '/users/consultor@empresa.com/events',
                expirationDateTime: '2026-03-12T13:00:00.000Z',
                updatedAt: '2026-03-10T13:00:00.000Z',
            }],
            errors: [],
        }),
    });

    restores.push(
        mockMethod(
            prisma.auditLog,
            'create',
            (async () => {
                auditCreated = true;
                return { id: 'audit-1' };
            }) as unknown as typeof prisma.auditLog.create
        )
    );

    try {
        const response = await postTeamsSubscriptionsRoute();
        assert.equal(response.status, 200);
        const payload = await response.json() as { success?: boolean; result?: { created?: number } };
        assert.equal(payload.success, true);
        assert.equal(payload.result?.created, 1);
        assert.equal(auditCreated, true);
    } finally {
        for (const restore of restores.reverse()) restore();
        resetTeamsSubscriptionHandlers();
        restoreAuth();
    }
});

