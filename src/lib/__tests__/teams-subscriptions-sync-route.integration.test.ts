import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/lib/prisma';
import {
    POST as postTeamsSubscriptionsSyncRoute,
    __resetSyncSubscriptionsHandlerForTests,
    __setSyncSubscriptionsHandlerForTests,
} from '@/app/api/integrations/teams/subscriptions/sync/route';
import { mockMethod, type RestoreFn } from '@/lib/__tests__/crm-role-test-utils';

function setEnv(key: string, value: string | undefined): () => void {
    const previous = process.env[key];
    if (value === undefined) {
        delete process.env[key];
    } else {
        process.env[key] = value;
    }

    return () => {
        if (previous === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = previous;
        }
    };
}

test('POST /api/integrations/teams/subscriptions/sync should return 503 when cron token is missing', async () => {
    const restoreEnv = setEnv('TEAMS_SYNC_CRON_TOKEN', undefined);
    try {
        const response = await postTeamsSubscriptionsSyncRoute(
            new Request('http://localhost:3000/api/integrations/teams/subscriptions/sync', {
                method: 'POST',
            })
        );
        assert.equal(response.status, 503);
    } finally {
        restoreEnv();
    }
});

test('POST /api/integrations/teams/subscriptions/sync should return 401 when token is invalid', async () => {
    const restoreEnv = setEnv('TEAMS_SYNC_CRON_TOKEN', 'expected-token');
    try {
        const response = await postTeamsSubscriptionsSyncRoute(
            new Request('http://localhost:3000/api/integrations/teams/subscriptions/sync', {
                method: 'POST',
                headers: {
                    authorization: 'Bearer wrong-token',
                },
            })
        );
        assert.equal(response.status, 401);
    } finally {
        restoreEnv();
    }
});

test('POST /api/integrations/teams/subscriptions/sync should run sync and write audit when authorized', async () => {
    const restoreEnv = setEnv('TEAMS_SYNC_CRON_TOKEN', 'expected-token');
    const restores: RestoreFn[] = [];
    let auditCreated = false;

    __setSyncSubscriptionsHandlerForTests(async () => ({
        created: 1,
        renewed: 2,
        removed: 0,
        kept: 3,
        failed: 0,
        totalActiveOrganizers: 6,
        subscriptions: [],
        errors: [],
    }));

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
        const response = await postTeamsSubscriptionsSyncRoute(
            new Request('http://localhost:3000/api/integrations/teams/subscriptions/sync', {
                method: 'POST',
                headers: {
                    authorization: 'Bearer expected-token',
                },
            })
        );
        assert.equal(response.status, 200);

        const payload = await response.json() as { success?: boolean; result?: { renewed?: number } };
        assert.equal(payload.success, true);
        assert.equal(payload.result?.renewed, 2);
        assert.equal(auditCreated, true);
    } finally {
        for (const restore of restores.reverse()) restore();
        __resetSyncSubscriptionsHandlerForTests();
        restoreEnv();
    }
});

