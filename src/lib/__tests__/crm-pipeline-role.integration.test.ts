import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
    GET as getPipelineRoute,
    __setAuthHandlerForTests as setPipelineAuth,
    __resetAuthHandlerForTests as resetPipelineAuth,
} from '@/app/api/pipeline/route';
import {
    ROLE_USER_IDS,
    mockMethod,
    type RestoreFn,
    sessionForRole,
    withAuthSession,
} from '@/lib/__tests__/crm-role-test-utils';

test('GET /api/pipeline should return 401 when unauthenticated', async () => {
    const restoreAuth = withAuthSession(setPipelineAuth, resetPipelineAuth, null);
    try {
        const response = await getPipelineRoute();
        assert.equal(response.status, 401);
    } finally {
        restoreAuth();
    }
});

test('GET /api/pipeline should apply lead scope and safe lead select for each role', async () => {
    const scenarios = [
        { role: 'ADMIN', userId: ROLE_USER_IDS.ADMIN, scope: 'all' },
        { role: 'DIRECTOR', userId: ROLE_USER_IDS.DIRECTOR, scope: 'all' },
        { role: 'MANAGER', userId: ROLE_USER_IDS.MANAGER, scope: 'all' },
        { role: 'CONSULTANT', userId: ROLE_USER_IDS.CONSULTANT, scope: 'own' },
    ] as const;

    for (const scenario of scenarios) {
        const restoreAuth = withAuthSession(
            setPipelineAuth,
            resetPipelineAuth,
            sessionForRole(scenario.role, scenario.userId)
        );
        const restores: RestoreFn[] = [];
        let capturedLeadWhere: Prisma.LeadWhereInput | undefined;
        let capturedLeadSelect: Record<string, unknown> | undefined;

        restores.push(
            mockMethod(
                prisma.pipeline,
                'findFirst',
                (async () => ({ id: 'pipeline-1' })) as unknown as typeof prisma.pipeline.findFirst
            )
        );
        restores.push(
            mockMethod(
                prisma.pipelineStage,
                'findMany',
                (async (args: Prisma.PipelineStageFindManyArgs) => {
                    const includeLead = args.include as { leads?: { where?: Prisma.LeadWhereInput; select?: Record<string, unknown> } };
                    capturedLeadWhere = includeLead.leads?.where;
                    capturedLeadSelect = includeLead.leads?.select;

                    return [{
                        id: 'stage-1',
                        name: 'Novo',
                        order: 1,
                        pipelineId: 'pipeline-1',
                        leads: [],
                    }] as unknown as Awaited<ReturnType<typeof prisma.pipelineStage.findMany>>;
                }) as unknown as typeof prisma.pipelineStage.findMany
            )
        );
        restores.push(
            mockMethod(
                prisma.teamMember,
                'findMany',
                (async () => [{ userId: scenario.userId }, { userId: 'team-user-1' }]) as unknown as typeof prisma.teamMember.findMany
            )
        );

        try {
            const response = await getPipelineRoute();
            assert.equal(response.status, 200);
            assert.ok(capturedLeadWhere);
            assert.ok(capturedLeadSelect);

            if (scenario.scope === 'all') {
                assert.deepEqual(capturedLeadWhere, {});
            }

            if (scenario.scope === 'own') {
                assert.deepEqual(capturedLeadWhere, { assignedUserId: scenario.userId });
            }

            assert.equal(capturedLeadSelect?.score, true);
            assert.equal(capturedLeadSelect?.grade, true);
            assert.equal(capturedLeadSelect?.qualificationData, undefined);
            assert.equal(capturedLeadSelect?.roiData, undefined);
        } finally {
            for (const restore of restores.reverse()) restore();
            restoreAuth();
        }
    }
});
