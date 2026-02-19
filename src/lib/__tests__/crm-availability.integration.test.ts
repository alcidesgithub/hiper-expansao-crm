import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/lib/prisma';
import {
    GET as getCrmAvailabilityRoute,
    PUT as putCrmAvailabilityRoute,
    __setAuthHandlerForTests,
    __resetAuthHandlerForTests,
} from '@/app/api/crm/availability/route';

type RestoreFn = () => void;

function mockMethod<T extends object, K extends keyof T>(obj: T, key: K, value: T[K]): RestoreFn {
    const original = obj[key];
    (obj as T)[key] = value;
    return () => {
        (obj as T)[key] = original;
    };
}

function withAuthSession(session: unknown): RestoreFn {
    __setAuthHandlerForTests((async () => session) as unknown as typeof import('@/auth').auth);
    return () => __resetAuthHandlerForTests();
}

test('GET /api/crm/availability should return 401 when unauthenticated', async () => {
    const restoreAuth = withAuthSession(null);
    try {
        const request = new Request('http://localhost:3000/api/crm/availability');
        const response = await getCrmAvailabilityRoute(request);
        assert.equal(response.status, 401);
    } finally {
        restoreAuth();
    }
});

test('GET /api/crm/availability should return 403 when role has no availability permission', async () => {
    const restoreAuth = withAuthSession({ user: { id: 'director-1', role: 'DIRECTOR' } });
    try {
        const request = new Request('http://localhost:3000/api/crm/availability');
        const response = await getCrmAvailabilityRoute(request);
        assert.equal(response.status, 403);
    } finally {
        restoreAuth();
    }
});

test('GET /api/crm/availability should force non-admin to own user scope', async () => {
    const restoreAuth = withAuthSession({ user: { id: 'consultant-1', role: 'CONSULTANT', permissions: ['availability:manage'] } });
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(prisma.user, 'findUnique', (async () => ({ id: 'consultant-1', role: 'CONSULTANT' })) as unknown as typeof prisma.user.findUnique)
    );
    restores.push(
        mockMethod(prisma.availabilitySlot, 'findMany', (async () => ([
            {
                id: 'slot-1',
                userId: 'consultant-1',
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '12:00',
                isActive: true,
                createdAt: new Date('2026-02-12T10:00:00.000Z'),
                updatedAt: new Date('2026-02-12T10:00:00.000Z'),
            },
        ])) as unknown as typeof prisma.availabilitySlot.findMany)
    );
    restores.push(
        mockMethod(prisma.availabilityBlock, 'findMany', (async () => []) as unknown as typeof prisma.availabilityBlock.findMany)
    );

    try {
        const request = new Request('http://localhost:3000/api/crm/availability?userId=consultor-99');
        const response = await getCrmAvailabilityRoute(request);
        assert.equal(response.status, 200);

        const payload = await response.json() as {
            userId: string;
            slots: unknown[];
            consultants: unknown[];
            permissions?: { canManageOthers?: boolean };
        };
        assert.equal(payload.userId, 'consultant-1');
        assert.equal(Array.isArray(payload.slots), true);
        assert.equal(payload.consultants.length, 0);
        assert.equal(payload.permissions?.canManageOthers, false);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('PUT /api/crm/availability should return 400 for overlapping slots', async () => {
    const restoreAuth = withAuthSession({ user: { id: 'sdr-1', role: 'CONSULTANT', permissions: ['availability:manage'] } });
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(prisma.user, 'findUnique', (async () => ({ id: 'sdr-1', role: 'CONSULTANT' })) as unknown as typeof prisma.user.findUnique)
    );

    try {
        const request = new Request('http://localhost:3000/api/crm/availability', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                slots: [
                    { dayOfWeek: 1, startTime: '09:00', endTime: '11:00', isActive: true },
                    { dayOfWeek: 1, startTime: '10:00', endTime: '12:00', isActive: true },
                ],
                blocks: [],
            }),
        });
        const response = await putCrmAvailabilityRoute(request);
        assert.equal(response.status, 400);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('PUT /api/crm/availability should return 400 when admin targets invalid role', async () => {
    const restoreAuth = withAuthSession({ user: { id: 'admin-1', role: 'ADMIN', permissions: ['availability:manage', 'leads:read:all'] } });
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(prisma.user, 'findUnique', (async () => ({ id: 'director-1', role: 'DIRECTOR' })) as unknown as typeof prisma.user.findUnique)
    );

    try {
        const request = new Request('http://localhost:3000/api/crm/availability', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                userId: 'manager-1',
                slots: [],
                blocks: [],
            }),
        });
        const response = await putCrmAvailabilityRoute(request);
        assert.equal(response.status, 400);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('PUT /api/crm/availability should save and return payload for valid admin request', async () => {
    const restoreAuth = withAuthSession({ user: { id: 'admin-1', role: 'ADMIN', permissions: ['availability:manage', 'leads:read:all'] } });
    const restores: RestoreFn[] = [];
    let deletedSlots = false;
    let deletedBlocks = false;
    let createdSlots = false;
    let createdBlocks = false;

    restores.push(
        mockMethod(prisma.user, 'findUnique', (async () => ({ id: 'consultor-1', role: 'CONSULTANT' })) as unknown as typeof prisma.user.findUnique)
    );

    restores.push(
        mockMethod(prisma, '$transaction', (async (callback: unknown) => {
            const tx = {
                availabilitySlot: {
                    deleteMany: async () => {
                        deletedSlots = true;
                        return { count: 1 };
                    },
                    createMany: async () => {
                        createdSlots = true;
                        return { count: 1 };
                    },
                },
                availabilityBlock: {
                    deleteMany: async () => {
                        deletedBlocks = true;
                        return { count: 1 };
                    },
                    createMany: async () => {
                        createdBlocks = true;
                        return { count: 1 };
                    },
                },
            };
            if (typeof callback === 'function') {
                return (callback as (arg: unknown) => unknown)(tx);
            }
            throw new Error('unexpected transaction call');
        }) as unknown as typeof prisma.$transaction)
    );

    restores.push(
        mockMethod(prisma.availabilitySlot, 'findMany', (async () => ([
            {
                id: 'slot-1',
                userId: 'consultor-1',
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '12:00',
                isActive: true,
                createdAt: new Date('2026-02-12T10:00:00.000Z'),
                updatedAt: new Date('2026-02-12T10:00:00.000Z'),
            },
        ])) as unknown as typeof prisma.availabilitySlot.findMany)
    );

    restores.push(
        mockMethod(prisma.availabilityBlock, 'findMany', (async () => ([
            {
                id: 'block-1',
                userId: 'consultor-1',
                startDate: new Date('2026-02-13T14:00:00.000Z'),
                endDate: new Date('2026-02-13T16:00:00.000Z'),
                reason: 'Treinamento',
                createdAt: new Date('2026-02-12T10:00:00.000Z'),
                updatedAt: new Date('2026-02-12T10:00:00.000Z'),
            },
        ])) as unknown as typeof prisma.availabilityBlock.findMany)
    );

    restores.push(
        mockMethod(prisma.user, 'findMany', (async () => ([
            { id: 'consultor-1', name: 'Consultor 1', role: 'CONSULTANT' },
        ])) as unknown as typeof prisma.user.findMany)
    );

    try {
        const request = new Request('http://localhost:3000/api/crm/availability', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                userId: 'consultor-1',
                slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00', isActive: true }],
                blocks: [{ startDate: '2026-02-13T14:00:00.000Z', endDate: '2026-02-13T16:00:00.000Z', reason: 'Treinamento' }],
            }),
        });

        const response = await putCrmAvailabilityRoute(request);
        assert.equal(response.status, 200);

        const payload = await response.json() as {
            userId: string;
            permissions?: { canManageOthers?: boolean };
            slots: unknown[];
            blocks: unknown[];
            consultants: unknown[];
        };
        assert.equal(payload.userId, 'consultor-1');
        assert.equal(payload.permissions?.canManageOthers, true);
        assert.equal(payload.slots.length, 1);
        assert.equal(payload.blocks.length, 1);
        assert.equal(payload.consultants.length, 1);
        assert.equal(deletedSlots, true);
        assert.equal(deletedBlocks, true);
        assert.equal(createdSlots, true);
        assert.equal(createdBlocks, true);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});
