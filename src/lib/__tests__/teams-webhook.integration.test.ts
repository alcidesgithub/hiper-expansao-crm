import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/lib/prisma';
import {
    GET as getTeamsWebhookRoute,
    POST as postTeamsWebhookRoute,
    __resetTeamsWebhookHandlersForTests,
    __setTeamsWebhookHandlersForTests,
} from '@/app/api/integrations/teams/webhook/route';

type RestoreFn = () => void;

function mockMethod<T extends object, K extends keyof T>(obj: T, key: K, value: T[K]): RestoreFn {
    const original = obj[key];
    (obj as T)[key] = value;
    return () => {
        (obj as T)[key] = original;
    };
}

test('GET /api/integrations/teams/webhook should return validation token as text', async () => {
    const response = await getTeamsWebhookRoute(
        new Request('http://localhost:3000/api/integrations/teams/webhook?validationToken=abc123')
    );

    assert.equal(response.status, 200);
    const body = await response.text();
    assert.equal(body, 'abc123');
});

test('POST /api/integrations/teams/webhook should return 400 for invalid payload', async () => {
    const response = await postTeamsWebhookRoute(
        new Request('http://localhost:3000/api/integrations/teams/webhook', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({}),
        })
    );

    assert.equal(response.status, 400);
});

test('POST /api/integrations/teams/webhook should ignore notification with invalid clientState', async () => {
    __setTeamsWebhookHandlersForTests({
        getClientState: () => 'expected-state',
    });

    const restores: RestoreFn[] = [];
    restores.push(
        mockMethod(
            prisma.meeting,
            'findUnique',
            (async () => {
                throw new Error('should not query meeting for invalid clientState');
            }) as unknown as typeof prisma.meeting.findUnique
        )
    );

    try {
        const response = await postTeamsWebhookRoute(
            new Request('http://localhost:3000/api/integrations/teams/webhook', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    value: [{
                        changeType: 'updated',
                        clientState: 'invalid-state',
                        resource: '/users/consultor@empresa.com/events/event-1',
                    }],
                }),
            })
        );

        assert.equal(response.status, 202);
        const payload = await response.json() as { processed?: number };
        assert.equal(payload.processed, 0);
    } finally {
        for (const restore of restores.reverse()) restore();
        __resetTeamsWebhookHandlersForTests();
    }
});

test('POST /api/integrations/teams/webhook should cancel meeting on deleted event', async () => {
    __setTeamsWebhookHandlersForTests({
        getClientState: () => 'expected-state',
    });

    const restores: RestoreFn[] = [];
    let meetingUpdated = false;
    let activityCreated = false;
    let auditCreated = false;

    restores.push(
        mockMethod(
            prisma.meeting,
            'findUnique',
            (async () => ({
                id: 'meeting-1',
                leadId: 'lead-1',
                userId: 'consultor-1',
                status: 'SCHEDULED',
                startTime: new Date('2026-03-10T13:00:00.000Z'),
                endTime: new Date('2026-03-10T14:00:00.000Z'),
                meetingLink: 'https://teams.microsoft.com/old',
                provider: 'teams',
                user: { email: 'consultor@empresa.com' },
            })) as unknown as typeof prisma.meeting.findUnique
        )
    );

    restores.push(
        mockMethod(
            prisma,
            '$transaction',
            (async (callback: unknown) => {
                const tx = {
                    meeting: {
                        update: async () => {
                            meetingUpdated = true;
                            return { id: 'meeting-1' };
                        },
                    },
                    activity: {
                        create: async () => {
                            activityCreated = true;
                            return { id: 'activity-1' };
                        },
                    },
                };
                if (typeof callback === 'function') {
                    return (callback as (arg: unknown) => unknown)(tx);
                }
                throw new Error('unexpected transaction call');
            }) as typeof prisma.$transaction
        )
    );

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
        const response = await postTeamsWebhookRoute(
            new Request('http://localhost:3000/api/integrations/teams/webhook', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    value: [{
                        changeType: 'deleted',
                        clientState: 'expected-state',
                        resource: '/users/consultor@empresa.com/events/event-1',
                    }],
                }),
            })
        );

        assert.equal(response.status, 202);
        const payload = await response.json() as { processed?: number };
        assert.equal(payload.processed, 1);
        assert.equal(meetingUpdated, true);
        assert.equal(activityCreated, true);
        assert.equal(auditCreated, true);
    } finally {
        for (const restore of restores.reverse()) restore();
        __resetTeamsWebhookHandlersForTests();
    }
});

test('POST /api/integrations/teams/webhook should reschedule meeting when times changed', async () => {
    __setTeamsWebhookHandlersForTests({
        getClientState: () => 'expected-state',
        getTeamsEvent: async () => ({
            externalEventId: 'event-2',
            isCancelled: false,
            startTime: new Date('2026-03-11T15:00:00.000Z'),
            endTime: new Date('2026-03-11T16:00:00.000Z'),
            meetingLink: 'https://teams.microsoft.com/new-link',
            lastModifiedAt: new Date('2026-03-10T10:00:00.000Z'),
        }),
    });

    const restores: RestoreFn[] = [];
    let updatedStatus: unknown;
    let updatedStartTime: unknown;
    let updatedEndTime: unknown;
    let updatedMeetingLink: unknown;
    let activityCreated = false;
    let auditCreated = false;

    restores.push(
        mockMethod(
            prisma.meeting,
            'findUnique',
            (async () => ({
                id: 'meeting-2',
                leadId: 'lead-2',
                userId: 'consultor-1',
                status: 'SCHEDULED',
                startTime: new Date('2026-03-10T13:00:00.000Z'),
                endTime: new Date('2026-03-10T14:00:00.000Z'),
                meetingLink: 'https://teams.microsoft.com/old-link',
                provider: 'teams',
                user: { email: 'consultor@empresa.com' },
            })) as unknown as typeof prisma.meeting.findUnique
        )
    );

    restores.push(
        mockMethod(
            prisma.meeting,
            'update',
            (async (args: { data?: Record<string, unknown> }) => {
                updatedStatus = args.data?.status;
                updatedStartTime = args.data?.startTime;
                updatedEndTime = args.data?.endTime;
                updatedMeetingLink = args.data?.meetingLink;
                return { id: 'meeting-2' };
            }) as unknown as typeof prisma.meeting.update
        )
    );

    restores.push(
        mockMethod(
            prisma.activity,
            'create',
            (async () => {
                activityCreated = true;
                return { id: 'activity-2' };
            }) as unknown as typeof prisma.activity.create
        )
    );

    restores.push(
        mockMethod(
            prisma.auditLog,
            'create',
            (async () => {
                auditCreated = true;
                return { id: 'audit-2' };
            }) as unknown as typeof prisma.auditLog.create
        )
    );

    try {
        const response = await postTeamsWebhookRoute(
            new Request('http://localhost:3000/api/integrations/teams/webhook', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    value: [{
                        changeType: 'updated',
                        clientState: 'expected-state',
                        resource: '/users/consultor@empresa.com/events/event-2',
                    }],
                }),
            })
        );

        assert.equal(response.status, 202);
        const payload = await response.json() as { processed?: number };
        assert.equal(payload.processed, 1);
        assert.equal(updatedStatus, 'RESCHEDULED');
        assert.ok(updatedStartTime instanceof Date);
        assert.ok(updatedEndTime instanceof Date);
        assert.equal(updatedMeetingLink, 'https://teams.microsoft.com/new-link');
        assert.equal(activityCreated, true);
        assert.equal(auditCreated, true);
    } finally {
        for (const restore of restores.reverse()) restore();
        __resetTeamsWebhookHandlersForTests();
    }
});

