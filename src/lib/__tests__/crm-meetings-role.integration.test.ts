import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
    GET as getMeetingsRoute,
    POST as postMeetingsRoute,
    __setAuthHandlerForTests as setMeetingsAuth,
    __resetAuthHandlerForTests as resetMeetingsAuth,
} from '@/app/api/meetings/route';
import {
    GET as getMeetingByIdRoute,
    PATCH as patchMeetingByIdRoute,
    DELETE as deleteMeetingByIdRoute,
    __setAuthHandlerForTests as setMeetingByIdAuth,
    __resetAuthHandlerForTests as resetMeetingByIdAuth,
} from '@/app/api/meetings/[id]/route';
import {
    ROLE_USER_IDS,
    mockMethod,
    type RestoreFn,
    sessionForRole,
    withAuthSession,
    withRouteIdParam,
} from '@/lib/__tests__/crm-role-test-utils';
import { graphService } from '@/lib/services/microsoft-graph.service';

test('GET /api/meetings should return 401 when unauthenticated', async () => {
    const restoreAuth = withAuthSession(setMeetingsAuth, resetMeetingsAuth, null);
    try {
        const response = await getMeetingsRoute(new Request('http://localhost:3000/api/meetings'));
        assert.equal(response.status, 401);
    } finally {
        restoreAuth();
    }
});

test('GET /api/meetings should enforce own scope for CONSULTANT and keep lead payload safe', async () => {
    const restoreAuth = withAuthSession(setMeetingsAuth, resetMeetingsAuth, sessionForRole('CONSULTANT'));
    const restores: RestoreFn[] = [];
    let capturedWhere: Prisma.MeetingWhereInput | undefined;
    let capturedLeadSelect: Record<string, unknown> | undefined;

    restores.push(
        mockMethod(
            prisma.meeting,
            'findMany',
            (async (args: Prisma.MeetingFindManyArgs) => {
                capturedWhere = args.where as Prisma.MeetingWhereInput;
                const fromInclude = (args.include as { lead?: { select?: Record<string, unknown> } } | undefined)?.lead?.select;
                const fromSelect = (args.select as { lead?: { select?: Record<string, unknown> } } | undefined)?.lead?.select;
                capturedLeadSelect = fromInclude || fromSelect;
                return [] as unknown as Awaited<ReturnType<typeof prisma.meeting.findMany>>;
            }) as unknown as typeof prisma.meeting.findMany
        )
    );

    try {
        const response = await getMeetingsRoute(
            new Request('http://localhost:3000/api/meetings?userId=another-user')
        );
        assert.equal(response.status, 200);
        assert.ok(capturedWhere);

        assert.equal((capturedWhere as { userId?: string }).userId, ROLE_USER_IDS.CONSULTANT);
        assert.deepEqual((capturedWhere as { lead?: { is?: Prisma.LeadWhereInput } }).lead?.is, {
            assignedUserId: ROLE_USER_IDS.CONSULTANT,
        });
        assert.equal(capturedLeadSelect?.qualificationData, undefined);
        assert.equal(capturedLeadSelect?.roiData, undefined);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('POST /api/meetings should return 403 for DIRECTOR', async () => {
    const restoreAuth = withAuthSession(setMeetingsAuth, resetMeetingsAuth, sessionForRole('DIRECTOR'));
    try {
        const response = await postMeetingsRoute(
            new Request('http://localhost:3000/api/meetings', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    leadId: 'lead-1',
                    userId: ROLE_USER_IDS.CONSULTANT,
                    title: 'ReuniÃ£o',
                    startTime: '2026-03-10T13:00:00.000Z',
                    endTime: '2026-03-10T14:00:00.000Z',
                }),
            })
        );
        assert.equal(response.status, 403);
    } finally {
        restoreAuth();
    }
});

test('POST /api/meetings should return 404 when lead is outside scope', async () => {
    const restoreAuth = withAuthSession(setMeetingsAuth, resetMeetingsAuth, sessionForRole('CONSULTANT'));
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(
            prisma.lead,
            'findFirst',
            (async () => null) as unknown as typeof prisma.lead.findFirst
        )
    );

    try {
        const response = await postMeetingsRoute(
            new Request('http://localhost:3000/api/meetings', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    leadId: 'lead-out',
                    userId: ROLE_USER_IDS.CONSULTANT,
                    title: 'ReuniÃ£o',
                    startTime: '2026-03-10T13:00:00.000Z',
                    endTime: '2026-03-10T14:00:00.000Z',
                }),
            })
        );
        assert.equal(response.status, 404);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('POST /api/meetings should create meeting for in-scope lead with safe lead select', async () => {
    const restoreAuth = withAuthSession(setMeetingsAuth, resetMeetingsAuth, sessionForRole('CONSULTANT'));
    const restores: RestoreFn[] = [];
    let capturedLeadSelect: Record<string, unknown> | undefined;

    restores.push(
        mockMethod(
            graphService,
            'isConfigured',
            (() => true) as unknown as typeof graphService.isConfigured
        )
    );
    restores.push(
        mockMethod(
            graphService,
            'createCalendarEvent',
            (async () => ({
                id: 'event-1',
                onlineMeeting: {
                    joinUrl: 'https://teams.example/meeting-1',
                },
            })) as unknown as typeof graphService.createCalendarEvent
        )
    );

    restores.push(
        mockMethod(
            prisma.lead,
            'findFirst',
            (async () => ({ id: 'lead-1', name: 'Lead 1', email: 'lead@empresa.com' })) as unknown as typeof prisma.lead.findFirst
        )
    );
    restores.push(
        mockMethod(
            prisma.user,
            'findUnique',
            (async () => ({ id: ROLE_USER_IDS.CONSULTANT, email: 'consultor@empresa.com', name: 'Consultor' })) as unknown as typeof prisma.user.findUnique
        )
    );
    restores.push(
        mockMethod(
            prisma.meeting,
            'findMany',
            (async () => []) as unknown as typeof prisma.meeting.findMany
        )
    );
    restores.push(
        mockMethod(
            prisma.meeting,
            'create',
            (async () => {
                return {
                    id: 'meeting-1',
                    leadId: 'lead-1',
                    userId: ROLE_USER_IDS.CONSULTANT,
                    title: 'ReuniÃ£o',
                    status: 'SCHEDULED',
                    lead: { id: 'lead-1', name: 'Lead 1' },
                    user: { id: ROLE_USER_IDS.CONSULTANT, name: 'Consultor' },
                } as unknown as Awaited<ReturnType<typeof prisma.meeting.create>>;
            }) as unknown as typeof prisma.meeting.create
        )
    );
    restores.push(
        mockMethod(
            prisma.meeting,
            'findUnique',
            (async (args: Prisma.MeetingFindUniqueArgs) => {
                capturedLeadSelect = ((args.select as { lead?: { select?: Record<string, unknown> } } | undefined)?.lead?.select);
                return {
                    id: 'meeting-1',
                    title: 'ReuniÃƒÂ£o',
                    startTime: new Date('2026-03-10T13:00:00.000Z'),
                    endTime: new Date('2026-03-10T14:00:00.000Z'),
                    leadId: 'lead-1',
                    description: null,
                    meetingType: 'DIAGNOSTICO',
                    provider: 'local',
                    teamsJoinUrl: null,
                    status: 'SCHEDULED',
                    selfScheduled: false,
                    location: null,
                    attendees: null,
                    createdAt: new Date('2026-03-10T12:00:00.000Z'),
                    updatedAt: new Date('2026-03-10T12:00:00.000Z'),
                    completedAt: null,
                    cancelledAt: null,
                    lead: { id: 'lead-1', name: 'Lead 1', company: 'Empresa', grade: 'A' },
                    user: { id: ROLE_USER_IDS.CONSULTANT, name: 'Consultor' },
                } as unknown as Awaited<ReturnType<typeof prisma.meeting.findUnique>>;
            }) as unknown as typeof prisma.meeting.findUnique
        )
    );
    restores.push(
        mockMethod(
            prisma.lead,
            'findUnique',
            (async () => ({
                pipelineStageId: 'stage-1',
                pipelineStage: { pipelineId: 'pipe-1', order: 1 },
            })) as unknown as typeof prisma.lead.findUnique
        )
    );
    restores.push(
        mockMethod(
            prisma.pipelineStage,
            'findFirst',
            (async () => ({ id: 'stage-2' })) as unknown as typeof prisma.pipelineStage.findFirst
        )
    );
    restores.push(
        mockMethod(
            prisma.lead,
            'update',
            (async () => ({ id: 'lead-1' })) as unknown as typeof prisma.lead.update
        )
    );
    restores.push(
        mockMethod(
            prisma.activity,
            'create',
            (async () => ({ id: 'activity-1' })) as unknown as typeof prisma.activity.create
        )
    );

    try {
        const response = await postMeetingsRoute(
            new Request('http://localhost:3000/api/meetings', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    leadId: 'lead-1',
                    userId: ROLE_USER_IDS.CONSULTANT,
                    title: 'ReuniÃ£o',
                    startTime: '2026-03-10T13:00:00.000Z',
                    endTime: '2026-03-10T14:00:00.000Z',
                }),
            })
        );
        assert.equal(response.status, 201);
        assert.equal(capturedLeadSelect?.qualificationData, undefined);
        assert.equal(capturedLeadSelect?.roiData, undefined);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('GET /api/meetings/[id] should return 404 when meeting is outside lead scope', async () => {
    const restoreAuth = withAuthSession(setMeetingByIdAuth, resetMeetingByIdAuth, sessionForRole('CONSULTANT'));
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(
            prisma.meeting,
            'findFirst',
            (async () => null) as unknown as typeof prisma.meeting.findFirst
        )
    );

    try {
        const response = await getMeetingByIdRoute(
            new Request('http://localhost:3000/api/meetings/meeting-out'),
            withRouteIdParam('meeting-out')
        );
        assert.equal(response.status, 404);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('GET /api/meetings/[id] should avoid deep sensitive lead fields for CONSULTANT', async () => {
    const restoreAuth = withAuthSession(setMeetingByIdAuth, resetMeetingByIdAuth, sessionForRole('CONSULTANT'));
    const restores: RestoreFn[] = [];
    let capturedLeadSelect: Record<string, unknown> | undefined;

    restores.push(
        mockMethod(
            prisma.meeting,
            'findFirst',
            (async (args: Prisma.MeetingFindFirstArgs) => {
                capturedLeadSelect = ((args.include as { lead?: { select?: Record<string, unknown> } }).lead?.select);
                return {
                    id: 'meeting-1',
                    userId: ROLE_USER_IDS.CONSULTANT,
                    leadId: 'lead-1',
                    provider: null,
                    teamsEventId: null,
                    lead: { id: 'lead-1', name: 'Lead 1' },
                    user: { id: ROLE_USER_IDS.CONSULTANT, name: 'Consultor', email: 'consultor@empresa.com' },
                } as unknown as Awaited<ReturnType<typeof prisma.meeting.findFirst>>;
            }) as unknown as typeof prisma.meeting.findFirst
        )
    );

    try {
        const response = await getMeetingByIdRoute(
            new Request('http://localhost:3000/api/meetings/meeting-1'),
            withRouteIdParam('meeting-1')
        );
        assert.equal(response.status, 200);
        assert.equal(capturedLeadSelect?.qualificationData, undefined);
        assert.equal(capturedLeadSelect?.roiData, undefined);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('PATCH /api/meetings/[id] should return 403 for DIRECTOR', async () => {
    const restoreAuth = withAuthSession(setMeetingByIdAuth, resetMeetingByIdAuth, sessionForRole('DIRECTOR'));
    try {
        const response = await patchMeetingByIdRoute(
            new Request('http://localhost:3000/api/meetings/meeting-1', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ status: 'COMPLETED' }),
            }),
            withRouteIdParam('meeting-1')
        );
        assert.equal(response.status, 403);
    } finally {
        restoreAuth();
    }
});

test('PATCH /api/meetings/[id] should return 403 when CONSULTANT is not the meeting owner', async () => {
    const restoreAuth = withAuthSession(setMeetingByIdAuth, resetMeetingByIdAuth, sessionForRole('CONSULTANT'));
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(
            prisma.meeting,
            'findFirst',
            (async () => ({
                id: 'meeting-1',
                userId: 'another-user',
                leadId: 'lead-1',
                provider: null,
                teamsEventId: null,
                lead: { id: 'lead-1', name: 'Lead 1' },
                user: { id: 'another-user', name: 'Outro', email: 'outro@empresa.com' },
            })) as unknown as typeof prisma.meeting.findFirst
        )
    );

    try {
        const response = await patchMeetingByIdRoute(
            new Request('http://localhost:3000/api/meetings/meeting-1', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ status: 'SCHEDULED' }),
            }),
            withRouteIdParam('meeting-1')
        );
        assert.equal(response.status, 403);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('DELETE /api/meetings/[id] should cancel meeting for MANAGER in scope', async () => {
    const restoreAuth = withAuthSession(setMeetingByIdAuth, resetMeetingByIdAuth, sessionForRole('MANAGER'));
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(
            prisma.teamMember,
            'findMany',
            (async () => [{ userId: ROLE_USER_IDS.MANAGER }, { userId: 'team-user-1' }]) as unknown as typeof prisma.teamMember.findMany
        )
    );
    restores.push(
        mockMethod(
            prisma.meeting,
            'findFirst',
            (async () => ({
                id: 'meeting-1',
                userId: 'team-user-1',
                leadId: 'lead-1',
                provider: null,
                teamsEventId: null,
                lead: { id: 'lead-1', name: 'Lead 1' },
                user: { id: 'team-user-1', name: 'Time', email: 'time@empresa.com' },
            })) as unknown as typeof prisma.meeting.findFirst
        )
    );
    restores.push(
        mockMethod(
            prisma.meeting,
            'update',
            (async () => ({ id: 'meeting-1', status: 'CANCELLED' })) as unknown as typeof prisma.meeting.update
        )
    );

    try {
        const response = await deleteMeetingByIdRoute(
            new Request('http://localhost:3000/api/meetings/meeting-1', { method: 'DELETE' }),
            withRouteIdParam('meeting-1')
        );
        assert.equal(response.status, 200);
        const payload = await response.json() as { success?: boolean };
        assert.equal(payload.success, true);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});
