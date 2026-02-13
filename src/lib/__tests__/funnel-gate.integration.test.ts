import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/lib/prisma';
import {
    GET as getFunnelGateRoute,
    POST as postFunnelGateRoute,
    __setAuthHandlerForTests,
    __resetAuthHandlerForTests,
} from '@/app/api/funnel/gate/route';
import { mockMethod, type RestoreFn, withAuthSession } from '@/lib/__tests__/crm-role-test-utils';

test('POST /api/funnel/gate should return 400 for invalid choice', async () => {
    const response = await postFunnelGateRoute(
        new Request('http://localhost:3000/api/funnel/gate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ choice: 'INVALID' }),
        })
    );
    assert.equal(response.status, 400);
});

test('POST /api/funnel/gate should persist gate selection', async () => {
    const restores: RestoreFn[] = [];
    let created = false;

    restores.push(
        mockMethod(
            prisma.auditLog,
            'create',
            (async () => {
                created = true;
                return { id: 'audit-1' } as unknown as Awaited<ReturnType<typeof prisma.auditLog.create>>;
            }) as unknown as typeof prisma.auditLog.create
        )
    );

    try {
        const response = await postFunnelGateRoute(
            new Request('http://localhost:3000/api/funnel/gate', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    choice: 'INFLUENCIADOR',
                    sessionId: 'session-abc-123',
                }),
            })
        );
        assert.equal(response.status, 200);
        assert.equal(created, true);
    } finally {
        for (const restore of restores.reverse()) restore();
    }
});

test('GET /api/funnel/gate should return 401 when unauthenticated', async () => {
    const restoreAuth = withAuthSession(__setAuthHandlerForTests, __resetAuthHandlerForTests, null);
    try {
        const response = await getFunnelGateRoute(
            new Request('http://localhost:3000/api/funnel/gate?days=30')
        );
        assert.equal(response.status, 401);
    } finally {
        restoreAuth();
    }
});

test('GET /api/funnel/gate should return aggregated analytics for authorized role', async () => {
    const restoreAuth = withAuthSession(
        __setAuthHandlerForTests,
        __resetAuthHandlerForTests,
        { user: { id: 'director-1', role: 'DIRECTOR', permissions: ['dashboard:executive'] } }
    );
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(
            prisma.auditLog,
            'findMany',
            (async () => ([
                {
                    createdAt: new Date('2026-02-10T12:00:00.000Z'),
                    changes: { choice: 'DECISOR' },
                },
                {
                    createdAt: new Date('2026-02-10T12:10:00.000Z'),
                    changes: { choice: 'INFLUENCIADOR' },
                },
                {
                    createdAt: new Date('2026-02-11T12:00:00.000Z'),
                    changes: { choice: 'PESQUISADOR' },
                },
            ])) as unknown as typeof prisma.auditLog.findMany
        )
    );

    try {
        const response = await getFunnelGateRoute(
            new Request('http://localhost:3000/api/funnel/gate?days=7')
        );
        assert.equal(response.status, 200);

        const payload = await response.json() as {
            totals?: {
                total?: number;
                decisor?: number;
                influenciador?: number;
                pesquisador?: number;
            };
            byDay?: Array<{ date: string; total: number }>;
        };

        assert.equal(payload.totals?.total, 3);
        assert.equal(payload.totals?.decisor, 1);
        assert.equal(payload.totals?.influenciador, 1);
        assert.equal(payload.totals?.pesquisador, 1);
        assert.equal(Array.isArray(payload.byDay), true);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});
