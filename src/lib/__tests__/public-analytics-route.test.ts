import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/lib/prisma';
import { POST as postPublicAnalytics } from '@/app/api/public/analytics/route';
import { mockMethod, type RestoreFn } from '@/lib/__tests__/crm-role-test-utils';

test('POST /api/public/analytics should persist a valid acquisition event', async () => {
    const restores: RestoreFn[] = [];
    let created = false;
    const previousFlag = process.env.ACQ_TRACKING_V1;
    process.env.ACQ_TRACKING_V1 = '1';

    restores.push(
        mockMethod(
            prisma.auditLog,
            'create',
            (async () => {
                created = true;
                return { id: 'audit-event-1' } as unknown as Awaited<ReturnType<typeof prisma.auditLog.create>>;
            }) as unknown as typeof prisma.auditLog.create
        )
    );

    try {
        const response = await postPublicAnalytics(
            new Request('http://localhost:3000/api/public/analytics', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    eventName: 'LP_VIEW',
                    sessionId: 'session-abc12345',
                    page: '/',
                    utmSource: 'google',
                    utmCampaign: 'teste',
                    timestamp: new Date('2026-02-19T12:00:00.000Z').toISOString(),
                }),
            })
        );

        assert.equal(response.status, 200);
        assert.equal(created, true);
    } finally {
        for (const restore of restores.reverse()) restore();
        if (previousFlag === undefined) {
            delete process.env.ACQ_TRACKING_V1;
        } else {
            process.env.ACQ_TRACKING_V1 = previousFlag;
        }
    }
});

test('POST /api/public/analytics should reject invalid payload', async () => {
    const response = await postPublicAnalytics(
        new Request('http://localhost:3000/api/public/analytics', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                eventName: 'INVALID_EVENT',
                sessionId: 'short',
                page: '',
            }),
        })
    );

    assert.equal(response.status, 400);
});
