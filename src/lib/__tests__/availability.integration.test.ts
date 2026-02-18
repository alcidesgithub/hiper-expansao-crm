import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/lib/prisma';
import { getPublicAvailabilitySlotsForDate, validateConsultorAvailabilityWindow } from '@/lib/availability';
import { GET as getAvailabilitySlotsRoute } from '@/app/api/availability/slots/route';
import {
    GET as getScheduleRoute,
    POST as postScheduleRoute,
    __setTeamsHandlersForTests as setScheduleTeamsHandlers,
    __resetTeamsHandlersForTests as resetScheduleTeamsHandlers,
} from '@/app/api/schedule/route';

type RestoreFn = () => void;

function mockMethod<T extends object, K extends keyof T>(obj: T, key: K, value: T[K]): RestoreFn {
    const original = obj[key];
    (obj as T)[key] = value;
    return () => {
        (obj as T)[key] = original;
    };
}

function setupDefaultAvailabilityMocks() {
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(prisma.user, 'findMany', (async () => (
            [{ id: 'consultor-1', name: 'Consultor 1' }]
        )) as typeof prisma.user.findMany)
    );
    restores.push(
        mockMethod(prisma.availabilitySlot, 'findMany', (async () => []) as typeof prisma.availabilitySlot.findMany)
    );
    restores.push(
        mockMethod(prisma.availabilitySlot, 'count', (async () => 0) as typeof prisma.availabilitySlot.count)
    );
    restores.push(
        mockMethod(prisma.availabilityBlock, 'findMany', (async () => []) as typeof prisma.availabilityBlock.findMany)
    );
    restores.push(
        mockMethod(prisma.meeting, 'findMany', (async () => []) as typeof prisma.meeting.findMany)
    );

    return () => {
        for (const restore of restores.reverse()) restore();
    };
}

function toYmdHm(date: Date): { date: string; time: string } {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return {
        date: `${year}-${month}-${day}`,
        time: `${hour}:${minute}`,
    };
}

function nextBusinessDayAt(hour: number, minute: number): { date: string; time: string } {
    const candidate = new Date();
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(hour, minute, 0, 0);

    while (candidate.getDay() === 0 || candidate.getDay() === 6) {
        candidate.setDate(candidate.getDate() + 1);
    }

    return toYmdHm(candidate);
}

function buildScheduleRequest(body: Record<string, unknown>, ip = '10.0.0.50') {
    return new Request('http://localhost:3000/api/schedule', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-real-ip': ip,
        },
        body: JSON.stringify(body),
    });
}

function setupScheduleBaseMocks(token: string): RestoreFn {
    const restores: RestoreFn[] = [];
    setScheduleTeamsHandlers({
        isTeamsConfigured: () => true,
        createTeamsMeeting: async () => ({
            provider: 'teams',
            meetingLink: 'https://teams.example/schedule-1',
            externalEventId: 'event-schedule-1',
        }),
        cancelTeamsMeeting: async () => undefined,
    });

    restores.push(
        mockMethod(prisma.lead, 'findUnique', (async () => ({
            id: 'lead-1',
            name: 'Lead Teste',
            email: 'lead@example.com',
            phone: '41999999999',
            company: 'Farmacia Teste',
            grade: 'A',
            score: 90,
            qualificationData: {
                funnelToken: token,
                step5CompletedAt: '2026-01-01T00:00:00.000Z',
            },
        })) as unknown as typeof prisma.lead.findUnique)
    );

    restores.push(
        mockMethod(prisma.user, 'findUnique', (async () => ({
            id: 'consultor-1',
            name: 'Consultor Teste',
            email: 'consultor@example.com',
            role: 'CONSULTANT',
            status: 'ACTIVE',
        })) as unknown as typeof prisma.user.findUnique)
    );

    restores.push(
        mockMethod(prisma.availabilitySlot, 'findMany', (async () => []) as typeof prisma.availabilitySlot.findMany)
    );
    restores.push(
        mockMethod(prisma.availabilitySlot, 'count', (async () => 0) as typeof prisma.availabilitySlot.count)
    );
    restores.push(
        mockMethod(prisma.availabilityBlock, 'findFirst', (async () => null) as typeof prisma.availabilityBlock.findFirst)
    );

    return () => {
        resetScheduleTeamsHandlers();
        for (const restore of restores.reverse()) restore();
    };
}

test('getPublicAvailabilitySlotsForDate should expose default 09:00-16:00 slots when no custom config exists', async () => {
    const restore = setupDefaultAvailabilityMocks();
    try {
        const { date } = nextBusinessDayAt(9, 0);
        const result = await getPublicAvailabilitySlotsForDate(date, { minAdvanceHours: 0 });
        assert.equal(result.ok, true);
        if (!result.ok) return;

        assert.equal(result.slots.length, 8);
        assert.equal(result.availableCount, 8);
        assert.equal(result.slots[0]?.time, '09:00');
        assert.equal(result.slots[7]?.time, '16:00');
        assert.equal(result.slots[0]?.available, true);
        assert.equal(result.slots[0]?.consultorId, 'consultor-1');
    } finally {
        restore();
    }
});

test('getPublicAvailabilitySlotsForDate should mark slots unavailable with block/meeting conflicts', async () => {
    const restores: RestoreFn[] = [];
    restores.push(
        mockMethod(prisma.user, 'findMany', (async () => (
            [{ id: 'consultor-1', name: 'Consultor 1' }]
        )) as typeof prisma.user.findMany)
    );
    restores.push(
        mockMethod(prisma.availabilitySlot, 'count', (async () => 1) as typeof prisma.availabilitySlot.count)
    );
    restores.push(
        mockMethod(prisma.availabilitySlot, 'findMany', (async () => (
            [{ userId: 'consultor-1', startTime: '10:00', endTime: '12:00' }]
        )) as typeof prisma.availabilitySlot.findMany)
    );
    restores.push(
        mockMethod(prisma.availabilityBlock, 'findMany', (async () => (
            [{ userId: 'consultor-1', startDate: new Date(2026, 1, 16, 10, 0, 0, 0), endDate: new Date(2026, 1, 16, 11, 0, 0, 0) }]
        )) as typeof prisma.availabilityBlock.findMany)
    );
    restores.push(
        mockMethod(prisma.meeting, 'findMany', (async () => (
            [{ userId: 'consultor-1', startTime: new Date(2026, 1, 16, 11, 0, 0, 0), endTime: new Date(2026, 1, 16, 12, 0, 0, 0) }]
        )) as typeof prisma.meeting.findMany)
    );

    try {
        const result = await getPublicAvailabilitySlotsForDate('2026-02-16', { minAdvanceHours: 0 });
        assert.equal(result.ok, true);
        if (!result.ok) return;
        assert.deepEqual(result.slots.map((slot) => slot.time), ['10:00', '11:00']);
        assert.deepEqual(result.slots.map((slot) => slot.available), [false, false]);
        assert.equal(result.availableCount, 0);
    } finally {
        for (const restore of restores.reverse()) restore();
    }
});

test('validateConsultorAvailabilityWindow should reject outside configured slot', async () => {
    const restores: RestoreFn[] = [];
    restores.push(
        mockMethod(prisma.availabilitySlot, 'findMany', (async () => (
            [{ startTime: '09:00', endTime: '10:00' }]
        )) as typeof prisma.availabilitySlot.findMany)
    );
    restores.push(
        mockMethod(prisma.availabilitySlot, 'count', (async () => 1) as typeof prisma.availabilitySlot.count)
    );
    restores.push(
        mockMethod(prisma.availabilityBlock, 'findFirst', (async () => null) as typeof prisma.availabilityBlock.findFirst)
    );

    try {
        const result = await validateConsultorAvailabilityWindow({
            consultorId: 'consultor-1',
            startTime: new Date(2026, 1, 16, 10, 0, 0, 0),
            endTime: new Date(2026, 1, 16, 11, 0, 0, 0),
        });
        assert.equal(result.ok, false);
        if (!result.ok) {
            assert.match(result.reason, /disponibilidade/i);
        }
    } finally {
        for (const restore of restores.reverse()) restore();
    }
});

test('validateConsultorAvailabilityWindow should reject blocked window', async () => {
    const restores: RestoreFn[] = [];
    restores.push(
        mockMethod(prisma.availabilitySlot, 'findMany', (async () => (
            [{ startTime: '09:00', endTime: '12:00' }]
        )) as typeof prisma.availabilitySlot.findMany)
    );
    restores.push(
        mockMethod(prisma.availabilitySlot, 'count', (async () => 1) as typeof prisma.availabilitySlot.count)
    );
    restores.push(
        mockMethod(prisma.availabilityBlock, 'findFirst', (async () => ({ id: 'block-1' })) as typeof prisma.availabilityBlock.findFirst)
    );

    try {
        const result = await validateConsultorAvailabilityWindow({
            consultorId: 'consultor-1',
            startTime: new Date(2026, 1, 16, 10, 0, 0, 0),
            endTime: new Date(2026, 1, 16, 11, 0, 0, 0),
        });
        assert.equal(result.ok, false);
        if (!result.ok) {
            assert.match(result.reason, /bloqueado/i);
        }
    } finally {
        for (const restore of restores.reverse()) restore();
    }
});

test('GET /api/availability/slots should return 400 for invalid date', async () => {
    const request = new Request('http://localhost:3000/api/availability/slots?date=invalid', {
        headers: { 'x-real-ip': '10.0.0.1' },
    });
    const response = await getAvailabilitySlotsRoute(request);
    assert.equal(response.status, 400);
});

test('GET /api/schedule should return slots for valid date', async () => {
    const restore = setupDefaultAvailabilityMocks();
    try {
        const { date } = nextBusinessDayAt(9, 0);
        const request = new Request(`http://localhost:3000/api/schedule?date=${date}`, {
            headers: { 'x-real-ip': '10.0.0.2' },
        });
        const response = await getScheduleRoute(request);
        assert.equal(response.status, 200);

        const payload = await response.json() as { slots?: unknown[]; availableCount?: number };
        assert.ok(Array.isArray(payload.slots));
        assert.equal(payload.availableCount, 8);
    } finally {
        restore();
    }
});

test('POST /api/schedule should reject with minimum advance time rule', async () => {
    const nowPlusOneHour = new Date(Date.now() + 60 * 60 * 1000);
    const { date, time } = toYmdHm(nowPlusOneHour);
    const request = buildScheduleRequest({
        leadId: 'lead-1',
        token: '1234567890123456',
        consultorId: 'consultor-1',
        date,
        time,
        notes: '',
    }, '10.0.0.60');

    const response = await postScheduleRoute(request);
    assert.equal(response.status, 400);
});

test('POST /api/schedule should create internal meeting when Teams is not configured', async () => {
    const token = '1234567890123456';
    const restoreBase = setupScheduleBaseMocks(token);
    setScheduleTeamsHandlers({
        isTeamsConfigured: () => false,
        createTeamsMeeting: async () => {
            throw new Error('should not call createTeamsMeeting when Teams is disabled');
        },
    });

    const restores: RestoreFn[] = [];
    const { date, time } = nextBusinessDayAt(10, 0);
    let capturedProvider: unknown;
    let capturedTeamsJoinUrl: unknown;
    let capturedTeamsEventId: unknown;

    restores.push(
        mockMethod(prisma, '$transaction', (async (callback: unknown) => {
            const tx = {
                $executeRaw: async () => undefined,
                meeting: {
                    findFirst: async () => null,
                    create: async (args: { data?: Record<string, unknown> }) => {
                        capturedProvider = args.data?.provider;
                        capturedTeamsJoinUrl = args.data?.teamsJoinUrl;
                        capturedTeamsEventId = args.data?.teamsEventId;
                        return {
                            id: 'meeting-internal-1',
                            teamsJoinUrl: null,
                        };
                    },
                },
            };
            if (typeof callback === 'function') {
                return (callback as (arg: unknown) => unknown)(tx);
            }
            throw new Error('unexpected transaction call');
        }) as typeof prisma.$transaction)
    );

    restores.push(
        mockMethod(prisma.lead, 'update', (async () => ({ id: 'lead-1' })) as unknown as typeof prisma.lead.update)
    );
    restores.push(
        mockMethod(prisma.activity, 'create', (async () => ({ id: 'activity-1' })) as unknown as typeof prisma.activity.create)
    );
    restores.push(
        mockMethod(prisma.auditLog, 'create', (async () => ({ id: 'audit-1' })) as unknown as typeof prisma.auditLog.create)
    );

    try {
        const request = buildScheduleRequest({
            leadId: 'lead-1',
            token,
            consultorId: 'consultor-1',
            date,
            time,
            notes: 'sem teams',
        }, '10.0.0.65');

        const response = await postScheduleRoute(request);
        assert.equal(response.status, 201);
        assert.equal(capturedProvider, 'local');
        assert.equal(capturedTeamsJoinUrl, null);
        assert.equal(capturedTeamsEventId, null);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreBase();
    }
});

test('POST /api/schedule should return 409 when lead already has scheduled meeting', async () => {
    const token = '1234567890123456';
    const restoreBase = setupScheduleBaseMocks(token);
    const restores: RestoreFn[] = [];
    const { date, time } = nextBusinessDayAt(10, 0);

    restores.push(
        mockMethod(prisma, '$transaction', (async (callback: unknown) => {
            const tx = {
                $executeRaw: async () => undefined,
                meeting: {
                    findFirst: async (args: { where?: { leadId?: string } }) => {
                        if (args?.where?.leadId) return { id: 'existing-meeting' };
                        return null;
                    },
                    create: async () => {
                        throw new Error('should not create');
                    },
                },
            };
            if (typeof callback === 'function') {
                return (callback as (arg: unknown) => unknown)(tx);
            }
            throw new Error('unexpected transaction call');
        }) as typeof prisma.$transaction)
    );

    try {
        const request = buildScheduleRequest({
            leadId: 'lead-1',
            token,
            consultorId: 'consultor-1',
            date,
            time,
            notes: '',
        }, '10.0.0.61');

        const response = await postScheduleRoute(request);
        assert.equal(response.status, 409);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreBase();
    }
});

test('POST /api/schedule should return 409 when consultor slot is busy', async () => {
    const token = '1234567890123456';
    const restoreBase = setupScheduleBaseMocks(token);
    const restores: RestoreFn[] = [];
    const { date, time } = nextBusinessDayAt(11, 0);

    restores.push(
        mockMethod(prisma, '$transaction', (async (callback: unknown) => {
            const tx = {
                $executeRaw: async () => undefined,
                meeting: {
                    findFirst: async (args: { where?: { leadId?: string; userId?: string } }) => {
                        if (args?.where?.leadId) return null;
                        if (args?.where?.userId) return { id: 'slot-conflict' };
                        return null;
                    },
                    create: async () => {
                        throw new Error('should not create');
                    },
                },
            };
            if (typeof callback === 'function') {
                return (callback as (arg: unknown) => unknown)(tx);
            }
            throw new Error('unexpected transaction call');
        }) as typeof prisma.$transaction)
    );

    try {
        const request = buildScheduleRequest({
            leadId: 'lead-1',
            token,
            consultorId: 'consultor-1',
            date,
            time,
            notes: '',
        }, '10.0.0.62');

        const response = await postScheduleRoute(request);
        assert.equal(response.status, 409);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreBase();
    }
});

test('POST /api/schedule should return 409 when consultor is blocked in availability window', async () => {
    const token = '1234567890123456';
    const restoreBase = setupScheduleBaseMocks(token);
    const restores: RestoreFn[] = [];
    const { date, time } = nextBusinessDayAt(10, 0);

    restores.push(
        mockMethod(prisma.availabilitySlot, 'count', (async () => 1) as typeof prisma.availabilitySlot.count)
    );
    restores.push(
        mockMethod(prisma.availabilitySlot, 'findMany', (async () => (
            [{ startTime: '09:00', endTime: '12:00' }]
        )) as typeof prisma.availabilitySlot.findMany)
    );
    restores.push(
        mockMethod(prisma.availabilityBlock, 'findFirst', (async () => ({ id: 'blocked' })) as typeof prisma.availabilityBlock.findFirst)
    );

    try {
        const request = buildScheduleRequest({
            leadId: 'lead-1',
            token,
            consultorId: 'consultor-1',
            date,
            time,
            notes: '',
        }, '10.0.0.63');

        const response = await postScheduleRoute(request);
        assert.equal(response.status, 409);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreBase();
    }
});

test('POST /api/schedule should return 201 and create meeting flow when slot is available', async () => {
    const token = '1234567890123456';
    const restoreBase = setupScheduleBaseMocks(token);
    const restores: RestoreFn[] = [];
    const { date, time } = nextBusinessDayAt(10, 0);

    let leadUpdated = false;
    let activityCreated = false;
    let auditCreated = false;

    restores.push(
        mockMethod(prisma, '$transaction', (async (callback: unknown) => {
            const tx = {
                $executeRaw: async () => undefined,
                meeting: {
                    findFirst: async () => null,
                    create: async () => ({
                        id: 'meeting-created-1',
                        teamsJoinUrl: null,
                    }),
                },
            };
            if (typeof callback === 'function') {
                return (callback as (arg: unknown) => unknown)(tx);
            }
            throw new Error('unexpected transaction call');
        }) as typeof prisma.$transaction)
    );

    restores.push(
        mockMethod(prisma.lead, 'update', (async () => {
            leadUpdated = true;
            return { id: 'lead-1' };
        }) as unknown as typeof prisma.lead.update)
    );

    restores.push(
        mockMethod(prisma.activity, 'create', (async () => {
            activityCreated = true;
            return { id: 'activity-1' };
        }) as unknown as typeof prisma.activity.create)
    );

    restores.push(
        mockMethod(prisma.auditLog, 'create', (async () => {
            auditCreated = true;
            return { id: 'audit-1' };
        }) as unknown as typeof prisma.auditLog.create)
    );

    try {
        const request = buildScheduleRequest({
            leadId: 'lead-1',
            token,
            consultorId: 'consultor-1',
            date,
            time,
            notes: 'observacao teste',
        }, '10.0.0.64');

        const response = await postScheduleRoute(request);
        assert.equal(response.status, 201);

        const payload = await response.json() as {
            success?: boolean;
            meeting?: { id?: string; consultorName?: string };
        };
        assert.equal(payload.success, true);
        assert.equal(payload.meeting?.id, 'meeting-created-1');
        assert.equal(payload.meeting?.consultorName, 'Consultor Teste');
        assert.equal(leadUpdated, true);
        assert.equal(activityCreated, true);
        assert.equal(auditCreated, true);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreBase();
    }
});
