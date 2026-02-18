import test from 'node:test';
import assert from 'node:assert/strict';
import {
    cancelTeamsMeeting,
    createTeamsEventSubscription,
    createTeamsMeeting,
    getTeamsEvent,
    isTeamsConfigured,
    renewTeamsEventSubscription,
} from '@/lib/teams';

type RestoreFn = () => void;

function setEnv(
    values: Partial<Record<
        | 'MS_TEAMS_CLIENT_ID'
        | 'MS_TEAMS_CLIENT_SECRET'
        | 'MS_TEAMS_TENANT_ID'
        | 'MS_TEAMS_GRAPH_SCOPE'
        | 'MICROSOFT_CLIENT_ID'
        | 'MICROSOFT_CLIENT_SECRET'
        | 'MICROSOFT_TENANT_ID'
        | 'MICROSOFT_GRAPH_SCOPE',
        string | undefined
    >>
): RestoreFn {
    const previous: Record<string, string | undefined> = {
        MS_TEAMS_CLIENT_ID: process.env.MS_TEAMS_CLIENT_ID,
        MS_TEAMS_CLIENT_SECRET: process.env.MS_TEAMS_CLIENT_SECRET,
        MS_TEAMS_TENANT_ID: process.env.MS_TEAMS_TENANT_ID,
        MS_TEAMS_GRAPH_SCOPE: process.env.MS_TEAMS_GRAPH_SCOPE,
        MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
        MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
        MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID,
        MICROSOFT_GRAPH_SCOPE: process.env.MICROSOFT_GRAPH_SCOPE,
    };

    for (const [key, value] of Object.entries(values)) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }

    return () => {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    };
}

function mockFetch(handler: (input: string, init?: RequestInit) => Promise<Response>): RestoreFn {
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString();
        return handler(url, init);
    }) as typeof fetch;
    return () => {
        globalThis.fetch = original;
    };
}

test('isTeamsConfigured should be false when env vars are missing', { concurrency: false }, () => {
    const restoreEnv = setEnv({
        MS_TEAMS_CLIENT_ID: undefined,
        MS_TEAMS_CLIENT_SECRET: undefined,
        MS_TEAMS_TENANT_ID: undefined,
        MS_TEAMS_GRAPH_SCOPE: undefined,
        MICROSOFT_CLIENT_ID: undefined,
        MICROSOFT_CLIENT_SECRET: undefined,
        MICROSOFT_TENANT_ID: undefined,
        MICROSOFT_GRAPH_SCOPE: undefined,
    });

    try {
        assert.equal(isTeamsConfigured(), false);
    } finally {
        restoreEnv();
    }
});

test('isTeamsConfigured should accept MICROSOFT_* aliases', { concurrency: false }, () => {
    const restoreEnv = setEnv({
        MS_TEAMS_CLIENT_ID: undefined,
        MS_TEAMS_CLIENT_SECRET: undefined,
        MS_TEAMS_TENANT_ID: undefined,
        MICROSOFT_CLIENT_ID: 'legacy-client-id',
        MICROSOFT_CLIENT_SECRET: 'legacy-client-secret',
        MICROSOFT_TENANT_ID: 'legacy-tenant-id',
    });

    try {
        assert.equal(isTeamsConfigured(), true);
    } finally {
        restoreEnv();
    }
});

test('createTeamsMeeting should create event and return link/id', { concurrency: false }, async () => {
    const restoreEnv = setEnv({
        MS_TEAMS_CLIENT_ID: 'client-id',
        MS_TEAMS_CLIENT_SECRET: 'client-secret',
        MS_TEAMS_TENANT_ID: 'tenant-id',
        MS_TEAMS_GRAPH_SCOPE: 'https://graph.microsoft.com/.default',
    });

    const calls: string[] = [];
    const restoreFetch = mockFetch(async (url, init) => {
        calls.push(url);

        if (url.includes('/oauth2/v2.0/token')) {
            assert.equal(init?.method, 'POST');
            return new Response(JSON.stringify({ access_token: 'token-123' }), { status: 200 });
        }

        if (url.includes('/v1.0/users/consultor%40empresa.com/events')) {
            assert.equal(init?.method, 'POST');
            return new Response(JSON.stringify({
                id: 'event-123',
                onlineMeeting: { joinUrl: 'https://teams.microsoft.com/l/meetup-join/event-123' },
            }), { status: 201 });
        }

        return new Response('not-found', { status: 404 });
    });

    try {
        const result = await createTeamsMeeting({
            organizerEmail: 'consultor@empresa.com',
            leadEmail: 'lead@cliente.com',
            leadName: 'Lead Teste',
            subject: 'Reuniao de Expansao',
            description: 'Descricao',
            startTime: new Date('2026-03-10T13:00:00.000Z'),
            endTime: new Date('2026-03-10T14:00:00.000Z'),
        });

        assert.equal(result.provider, 'teams');
        assert.equal(result.externalEventId, 'event-123');
        assert.equal(result.meetingLink, 'https://teams.microsoft.com/l/meetup-join/event-123');
        assert.equal(calls.length, 2);
    } finally {
        restoreFetch();
        restoreEnv();
    }
});

test('createTeamsMeeting should throw when Teams env is missing', { concurrency: false }, async () => {
    const restoreEnv = setEnv({
        MS_TEAMS_CLIENT_ID: undefined,
        MS_TEAMS_CLIENT_SECRET: undefined,
        MS_TEAMS_TENANT_ID: undefined,
    });

    try {
        await assert.rejects(
            createTeamsMeeting({
                organizerEmail: 'consultor@empresa.com',
                leadEmail: 'lead@cliente.com',
                leadName: 'Lead Teste',
                subject: 'Reuniao',
                startTime: new Date('2026-03-10T13:00:00.000Z'),
                endTime: new Date('2026-03-10T14:00:00.000Z'),
            }),
            /Integracao com Teams nao configurada/
        );
    } finally {
        restoreEnv();
    }
});

test('cancelTeamsMeeting should ignore missing config and not call fetch', { concurrency: false }, async () => {
    const restoreEnv = setEnv({
        MS_TEAMS_CLIENT_ID: undefined,
        MS_TEAMS_CLIENT_SECRET: undefined,
        MS_TEAMS_TENANT_ID: undefined,
    });

    let called = 0;
    const restoreFetch = mockFetch(async () => {
        called += 1;
        return new Response('{}', { status: 200 });
    });

    try {
        await cancelTeamsMeeting({
            organizerEmail: 'consultor@empresa.com',
            externalEventId: 'event-123',
        });
        assert.equal(called, 0);
    } finally {
        restoreFetch();
        restoreEnv();
    }
});

test('cancelTeamsMeeting should accept 404 from Graph', { concurrency: false }, async () => {
    const restoreEnv = setEnv({
        MS_TEAMS_CLIENT_ID: 'client-id',
        MS_TEAMS_CLIENT_SECRET: 'client-secret',
        MS_TEAMS_TENANT_ID: 'tenant-id',
    });

    let requestCount = 0;
    const restoreFetch = mockFetch(async (url) => {
        requestCount += 1;
        if (url.includes('/oauth2/v2.0/token')) {
            return new Response(JSON.stringify({ access_token: 'token-123' }), { status: 200 });
        }
        return new Response('not-found', { status: 404 });
    });

    try {
        await cancelTeamsMeeting({
            organizerEmail: 'consultor@empresa.com',
            externalEventId: 'event-404',
        });
        assert.equal(requestCount, 2);
    } finally {
        restoreFetch();
        restoreEnv();
    }
});

test('getTeamsEvent should return event payload and parse UTC dates', { concurrency: false }, async () => {
    const restoreEnv = setEnv({
        MS_TEAMS_CLIENT_ID: 'client-id',
        MS_TEAMS_CLIENT_SECRET: 'client-secret',
        MS_TEAMS_TENANT_ID: 'tenant-id',
    });

    const restoreFetch = mockFetch(async (url) => {
        if (url.includes('/oauth2/v2.0/token')) {
            return new Response(JSON.stringify({ access_token: 'token-123' }), { status: 200 });
        }
        return new Response(JSON.stringify({
            id: 'event-1',
            isCancelled: false,
            webLink: 'https://teams.microsoft.com/l/meetup-join/event-1',
            start: { dateTime: '2026-03-10T13:00:00.0000000', timeZone: 'UTC' },
            end: { dateTime: '2026-03-10T14:00:00.0000000', timeZone: 'UTC' },
            lastModifiedDateTime: '2026-03-09T12:00:00.000Z',
        }), { status: 200 });
    });

    try {
        const event = await getTeamsEvent({
            organizerEmail: 'consultor@empresa.com',
            externalEventId: 'event-1',
        });

        assert.ok(event);
        assert.equal(event?.externalEventId, 'event-1');
        assert.equal(event?.meetingLink, 'https://teams.microsoft.com/l/meetup-join/event-1');
        assert.equal(event?.startTime?.toISOString(), '2026-03-10T13:00:00.000Z');
        assert.equal(event?.endTime?.toISOString(), '2026-03-10T14:00:00.000Z');
    } finally {
        restoreFetch();
        restoreEnv();
    }
});

test('createTeamsEventSubscription and renewTeamsEventSubscription should work', { concurrency: false }, async () => {
    const restoreEnv = setEnv({
        MS_TEAMS_CLIENT_ID: 'client-id',
        MS_TEAMS_CLIENT_SECRET: 'client-secret',
        MS_TEAMS_TENANT_ID: 'tenant-id',
    });

    const calls: Array<{ url: string; method: string | undefined }> = [];
    const restoreFetch = mockFetch(async (url, init) => {
        calls.push({ url, method: init?.method });

        if (url.includes('/oauth2/v2.0/token')) {
            return new Response(JSON.stringify({ access_token: 'token-123' }), { status: 200 });
        }
        if (url.endsWith('/v1.0/subscriptions') && init?.method === 'POST') {
            return new Response(JSON.stringify({
                id: 'sub-1',
                resource: '/users/consultor@empresa.com/events',
                expirationDateTime: '2026-03-12T13:00:00.000Z',
            }), { status: 201 });
        }
        if (url.endsWith('/v1.0/subscriptions/sub-1') && init?.method === 'PATCH') {
            return new Response(JSON.stringify({
                id: 'sub-1',
                resource: '/users/consultor@empresa.com/events',
                expirationDateTime: '2026-03-13T13:00:00.000Z',
            }), { status: 200 });
        }
        return new Response('not-found', { status: 404 });
    });

    try {
        const created = await createTeamsEventSubscription({
            organizerEmail: 'consultor@empresa.com',
            notificationUrl: 'https://crm.exemplo.com/api/integrations/teams/webhook',
            clientState: 'state-123',
            expirationDateTime: '2026-03-12T13:00:00.000Z',
        });
        const renewed = await renewTeamsEventSubscription({
            subscriptionId: created.id,
            expirationDateTime: '2026-03-13T13:00:00.000Z',
        });

        assert.equal(created.id, 'sub-1');
        assert.equal(renewed?.expirationDateTime, '2026-03-13T13:00:00.000Z');
        assert.equal(calls.filter((call) => call.url.includes('/oauth2/v2.0/token')).length, 2);
    } finally {
        restoreFetch();
        restoreEnv();
    }
});
