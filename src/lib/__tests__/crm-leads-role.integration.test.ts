import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
    GET as getLeadsRoute,
    POST as postLeadsRoute,
    __setAuthHandlerForTests as setLeadsAuth,
    __resetAuthHandlerForTests as resetLeadsAuth,
} from '@/app/api/leads/route';
import {
    GET as getLeadByIdRoute,
    PATCH as patchLeadByIdRoute,
    DELETE as deleteLeadByIdRoute,
    __setAuthHandlerForTests as setLeadByIdAuth,
    __resetAuthHandlerForTests as resetLeadByIdAuth,
} from '@/app/api/leads/[id]/route';
import {
    ROLE_USER_IDS,
    buildLeadFixture,
    mockMethod,
    type RestoreFn,
    sessionForRole,
    withAuthSession,
    withRouteIdParam,
} from '@/lib/__tests__/crm-role-test-utils';

test('GET /api/leads should return 401 when unauthenticated', async () => {
    const restoreAuth = withAuthSession(setLeadsAuth, resetLeadsAuth, null);
    try {
        const response = await getLeadsRoute(new Request('http://localhost:3000/api/leads'));
        assert.equal(response.status, 401);
    } finally {
        restoreAuth();
    }
});

test('GET /api/leads should apply role scope matrix on where clause', async () => {
    const scenarios = [
        { role: 'ADMIN', userId: ROLE_USER_IDS.ADMIN, scope: 'all' },
        { role: 'DIRECTOR', userId: ROLE_USER_IDS.DIRECTOR, scope: 'all' },
        { role: 'MANAGER', userId: ROLE_USER_IDS.MANAGER, scope: 'team' },
        { role: 'CONSULTANT', userId: ROLE_USER_IDS.CONSULTANT, scope: 'own' },
    ] as const;

    for (const scenario of scenarios) {
        const restoreAuth = withAuthSession(
            setLeadsAuth,
            resetLeadsAuth,
            sessionForRole(scenario.role, scenario.userId)
        );
        const restores: RestoreFn[] = [];
        let capturedWhere: Prisma.LeadWhereInput | undefined;

        restores.push(
            mockMethod(
                prisma.lead,
                'findMany',
                (async (args: Prisma.LeadFindManyArgs) => {
                    capturedWhere = args.where as Prisma.LeadWhereInput;
                    return [buildLeadFixture({ assignedUserId: scenario.userId })] as unknown as Awaited<
                        ReturnType<typeof prisma.lead.findMany>
                    >;
                }) as unknown as typeof prisma.lead.findMany
            )
        );
        restores.push(
            mockMethod(prisma.lead, 'count', (async () => 1) as unknown as typeof prisma.lead.count)
        );
        restores.push(
            mockMethod(
                prisma.teamMember,
                'findMany',
                (async () => [{ userId: scenario.userId }, { userId: 'team-user-1' }]) as unknown as typeof prisma.teamMember.findMany
            )
        );

        try {
            const response = await getLeadsRoute(new Request('http://localhost:3000/api/leads?page=1&limit=10'));
            assert.equal(response.status, 200);
            assert.ok(capturedWhere);

            if (scenario.scope === 'all') {
                assert.equal((capturedWhere as Record<string, unknown>).AND, undefined);
            }

            if (scenario.scope === 'own') {
                const andClause = (capturedWhere as { AND?: Array<Record<string, unknown>> }).AND;
                assert.equal(Array.isArray(andClause), true);
                const scopeClause = andClause?.find((entry) => 'assignedUserId' in entry);
                assert.deepEqual(scopeClause, { assignedUserId: scenario.userId });
            }

            if (scenario.scope === 'team') {
                const andClause = (capturedWhere as { AND?: Array<Record<string, unknown>> }).AND;
                assert.equal(Array.isArray(andClause), true);
                const scopeClause = andClause?.find((entry) => 'assignedUserId' in entry) as
                    | { assignedUserId?: { in?: string[] } }
                    | undefined;
                assert.equal(Array.isArray(scopeClause?.assignedUserId?.in), true);
                assert.equal(scopeClause?.assignedUserId?.in?.includes('team-user-1'), true);
                assert.equal(scopeClause?.assignedUserId?.in?.includes(scenario.userId), true);
            }
        } finally {
            for (const restore of restores.reverse()) restore();
            restoreAuth();
        }
    }
});

test('POST /api/leads should return 403 for DIRECTOR (no write permission)', async () => {
    const restoreAuth = withAuthSession(setLeadsAuth, resetLeadsAuth, sessionForRole('DIRECTOR'));
    try {
        const response = await postLeadsRoute(new Request('http://localhost:3000/api/leads', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                name: 'Lead Novo',
                email: 'novo@empresa.com',
                source: 'WEBSITE',
                userId: 'consultant-1',
            }),
        }));
        assert.equal(response.status, 403);
    } finally {
        restoreAuth();
    }
});

test('POST /api/leads should block MANAGER assigning lead outside team scope', async () => {
    const restoreAuth = withAuthSession(setLeadsAuth, resetLeadsAuth, sessionForRole('MANAGER'));
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(
            prisma.pipelineStage,
            'findUnique',
            (async () => ({ id: 'stage-1' })) as unknown as typeof prisma.pipelineStage.findUnique
        )
    );
    restores.push(
        mockMethod(
            prisma.user,
            'findUnique',
            (async () => ({ id: 'outside-user', status: 'ACTIVE' })) as unknown as typeof prisma.user.findUnique
        )
    );
    restores.push(
        mockMethod(
            prisma.teamMember,
            'findMany',
            (async () => [{ userId: ROLE_USER_IDS.MANAGER }, { userId: 'team-user-1' }]) as unknown as typeof prisma.teamMember.findMany
        )
    );

    try {
        const response = await postLeadsRoute(new Request('http://localhost:3000/api/leads', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                name: 'Lead Novo',
                email: 'novo@empresa.com',
                source: 'WEBSITE',
                pipelineStageId: 'stage-1',
                assignedUserId: 'outside-user',
            }),
        }));
        assert.equal(response.status, 403);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('GET /api/leads/[id] should return 404 when lead is outside role scope', async () => {
    const restoreAuth = withAuthSession(setLeadByIdAuth, resetLeadByIdAuth, sessionForRole('CONSULTANT'));
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(
            prisma.lead,
            'findFirst',
            (async () => null) as unknown as typeof prisma.lead.findFirst
        )
    );

    try {
        const response = await getLeadByIdRoute(
            new Request('http://localhost:3000/api/leads/lead-out'),
            withRouteIdParam('lead-out')
        );
        assert.equal(response.status, 404);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('GET /api/leads/[id] should not select deep sensitive fields for CONSULTANT', async () => {
    const restoreAuth = withAuthSession(setLeadByIdAuth, resetLeadByIdAuth, sessionForRole('CONSULTANT'));
    const restores: RestoreFn[] = [];
    let capturedSelect: Record<string, unknown> | undefined;

    restores.push(
        mockMethod(
            prisma.lead,
            'findFirst',
            (async (args: Prisma.LeadFindFirstArgs) => {
                capturedSelect = args.select as Record<string, unknown>;
                return {
                    ...buildLeadFixture({
                        assignedUserId: ROLE_USER_IDS.CONSULTANT,
                        qualificationData: undefined,
                        roiData: undefined,
                    }),
                    assignedUser: { id: ROLE_USER_IDS.CONSULTANT, name: 'Consultor', email: 'consultor@empresa.com' },
                    pipelineStage: { id: 'stage-1', name: 'Novo', pipelineId: 'pipe-1' },
                    activities: [],
                    notes: [],
                    meetings: [],
                    tasks: [],
                } as unknown as Awaited<ReturnType<typeof prisma.lead.findFirst>>;
            }) as unknown as typeof prisma.lead.findFirst
        )
    );
    restores.push(
        mockMethod(
            prisma.pipelineStage,
            'findMany',
            (async () => []) as unknown as typeof prisma.pipelineStage.findMany
        )
    );

    try {
        const response = await getLeadByIdRoute(
            new Request('http://localhost:3000/api/leads/lead-1'),
            withRouteIdParam('lead-1')
        );
        assert.equal(response.status, 200);
        assert.equal(capturedSelect?.qualificationData, undefined);
        assert.equal(capturedSelect?.roiData, undefined);

        const payload = await response.json() as Record<string, unknown>;
        assert.equal(payload.qualificationData, undefined);
        assert.equal(payload.roiData, undefined);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('GET /api/leads/[id] should select deep sensitive fields for MANAGER', async () => {
    const restoreAuth = withAuthSession(setLeadByIdAuth, resetLeadByIdAuth, sessionForRole('MANAGER'));
    const restores: RestoreFn[] = [];
    let capturedSelect: Record<string, unknown> | undefined;

    restores.push(
        mockMethod(
            prisma.teamMember,
            'findMany',
            (async () => [{ userId: ROLE_USER_IDS.MANAGER }, { userId: 'team-user-1' }]) as unknown as typeof prisma.teamMember.findMany
        )
    );
    restores.push(
        mockMethod(
            prisma.lead,
            'findFirst',
            (async (args: Prisma.LeadFindFirstArgs) => {
                capturedSelect = args.select as Record<string, unknown>;
                return {
                    ...buildLeadFixture({ assignedUserId: 'team-user-1' }),
                    assignedUser: { id: 'team-user-1', name: 'SDR Time', email: 'sdr@empresa.com' },
                    pipelineStage: { id: 'stage-1', name: 'Novo', pipelineId: 'pipe-1' },
                    activities: [],
                    notes: [],
                    meetings: [],
                    tasks: [],
                } as unknown as Awaited<ReturnType<typeof prisma.lead.findFirst>>;
            }) as unknown as typeof prisma.lead.findFirst
        )
    );
    restores.push(
        mockMethod(
            prisma.pipelineStage,
            'findMany',
            (async () => []) as unknown as typeof prisma.pipelineStage.findMany
        )
    );

    try {
        const response = await getLeadByIdRoute(
            new Request('http://localhost:3000/api/leads/lead-1'),
            withRouteIdParam('lead-1')
        );
        assert.equal(response.status, 200);
        assert.equal(capturedSelect?.qualificationData, true);
        assert.equal(capturedSelect?.roiData, true);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('PATCH /api/leads/[id] should return 403 for DIRECTOR', async () => {
    const restoreAuth = withAuthSession(setLeadByIdAuth, resetLeadByIdAuth, sessionForRole('DIRECTOR'));
    try {
        const response = await patchLeadByIdRoute(
            new Request('http://localhost:3000/api/leads/lead-1', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ status: 'CONTACTED' }),
            }),
            withRouteIdParam('lead-1')
        );
        assert.equal(response.status, 403);
    } finally {
        restoreAuth();
    }
});

test('PATCH /api/leads/[id] should keep deep sensitive fields hidden for CONSULTANT response select', async () => {
    const restoreAuth = withAuthSession(setLeadByIdAuth, resetLeadByIdAuth, sessionForRole('CONSULTANT'));
    const restores: RestoreFn[] = [];
    let capturedUpdateSelect: Record<string, unknown> | undefined;

    restores.push(
        mockMethod(
            prisma.lead,
            'findFirst',
            (async () => ({
                ...buildLeadFixture({ assignedUserId: ROLE_USER_IDS.CONSULTANT, status: 'NEW' }),
                pipelineStage: { id: 'stage-1', name: 'Novo', pipelineId: 'pipe-1' },
            })) as unknown as typeof prisma.lead.findFirst
        )
    );
    restores.push(
        mockMethod(
            prisma.lead,
            'update',
            (async (args: Prisma.LeadUpdateArgs) => {
                capturedUpdateSelect = args.select as Record<string, unknown>;
                return buildLeadFixture({ assignedUserId: ROLE_USER_IDS.CONSULTANT, status: 'CONTACTED' }) as unknown as Awaited<
                    ReturnType<typeof prisma.lead.update>
                >;
            }) as unknown as typeof prisma.lead.update
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
        const response = await patchLeadByIdRoute(
            new Request('http://localhost:3000/api/leads/lead-1', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ status: 'CONTACTED' }),
            }),
            withRouteIdParam('lead-1')
        );
        assert.equal(response.status, 200);
        assert.equal(capturedUpdateSelect?.qualificationData, undefined);
        assert.equal(capturedUpdateSelect?.roiData, undefined);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('DELETE /api/leads/[id] should return 403 for MANAGER', async () => {
    const restoreAuth = withAuthSession(setLeadByIdAuth, resetLeadByIdAuth, sessionForRole('MANAGER'));
    try {
        const response = await deleteLeadByIdRoute(
            new Request('http://localhost:3000/api/leads/lead-1', { method: 'DELETE' }),
            withRouteIdParam('lead-1')
        );
        assert.equal(response.status, 403);
    } finally {
        restoreAuth();
    }
});

test('DELETE /api/leads/[id] should archive lead for ADMIN when in scope', async () => {
    const restoreAuth = withAuthSession(setLeadByIdAuth, resetLeadByIdAuth, sessionForRole('ADMIN'));
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(
            prisma.lead,
            'findFirst',
            (async () => ({ id: 'lead-1', status: 'NEW' })) as unknown as typeof prisma.lead.findFirst
        )
    );
    restores.push(
        mockMethod(
            prisma.lead,
            'update',
            (async () => ({ id: 'lead-1', status: 'ARCHIVED' })) as unknown as typeof prisma.lead.update
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
        const response = await deleteLeadByIdRoute(
            new Request('http://localhost:3000/api/leads/lead-1', { method: 'DELETE' }),
            withRouteIdParam('lead-1')
        );
        assert.equal(response.status, 200);

        const payload = await response.json() as { success?: boolean };
        assert.equal(payload.success, true);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});
