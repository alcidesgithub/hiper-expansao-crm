import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/lib/prisma';
import {
    GET as getNotesRoute,
    POST as postNotesRoute,
    PATCH as patchNotesRoute,
    DELETE as deleteNotesRoute,
    __setAuthHandlerForTests as setNotesAuth,
    __resetAuthHandlerForTests as resetNotesAuth,
} from '@/app/api/leads/[id]/notes/route';
import {
    GET as getTasksRoute,
    POST as postTasksRoute,
    PATCH as patchTasksRoute,
    DELETE as deleteTasksRoute,
    __setAuthHandlerForTests as setTasksAuth,
    __resetAuthHandlerForTests as resetTasksAuth,
} from '@/app/api/leads/[id]/tasks/route';
import {
    GET as getActivitiesRoute,
    __setAuthHandlerForTests as setActivitiesAuth,
    __resetAuthHandlerForTests as resetActivitiesAuth,
} from '@/app/api/leads/[id]/activities/route';
import {
    mockMethod,
    ROLE_USER_IDS,
    type RestoreFn,
    sessionForRole,
    withAuthSession,
    withRouteIdParam,
} from '@/lib/__tests__/crm-role-test-utils';

test('GET /api/leads/[id]/notes should return 401 when unauthenticated', async () => {
    const restoreAuth = withAuthSession(setNotesAuth, resetNotesAuth, null);
    try {
        const response = await getNotesRoute(
            new Request('http://localhost:3000/api/leads/lead-1/notes'),
            withRouteIdParam('lead-1')
        );
        assert.equal(response.status, 401);
    } finally {
        restoreAuth();
    }
});

test('POST /api/leads/[id]/notes should return 403 for DIRECTOR', async () => {
    const restoreAuth = withAuthSession(setNotesAuth, resetNotesAuth, sessionForRole('DIRECTOR'));
    try {
        const response = await postNotesRoute(
            new Request('http://localhost:3000/api/leads/lead-1/notes', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ content: 'Teste' }),
            }),
            withRouteIdParam('lead-1')
        );
        assert.equal(response.status, 403);
    } finally {
        restoreAuth();
    }
});

test('GET /api/leads/[id]/notes should return 404 when lead is outside scope', async () => {
    const restoreAuth = withAuthSession(setNotesAuth, resetNotesAuth, sessionForRole('CONSULTANT'));
    const restores: RestoreFn[] = [];
    restores.push(
        mockMethod(prisma.lead, 'findFirst', (async () => null) as unknown as typeof prisma.lead.findFirst)
    );
    try {
        const response = await getNotesRoute(
            new Request('http://localhost:3000/api/leads/lead-out/notes'),
            withRouteIdParam('lead-out')
        );
        assert.equal(response.status, 404);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('notes CRUD should succeed for CONSULTANT within lead scope', async () => {
    const restoreAuth = withAuthSession(
        setNotesAuth,
        resetNotesAuth,
        sessionForRole('CONSULTANT', ROLE_USER_IDS.CONSULTANT)
    );
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(
            prisma.lead,
            'findFirst',
            (async () => ({ id: 'lead-1' })) as unknown as typeof prisma.lead.findFirst
        )
    );
    restores.push(
        mockMethod(
            prisma.note,
            'findMany',
            (async () => [
                { id: 'note-1', leadId: 'lead-1', content: 'Nota', user: { id: 'consultant-1', name: 'Consultor' } },
            ]) as unknown as typeof prisma.note.findMany
        )
    );
    restores.push(
        mockMethod(
            prisma.note,
            'create',
            (async () => ({ id: 'note-1', content: 'Nota criada', user: { id: 'consultant-1', name: 'Consultor' } })) as unknown as typeof prisma.note.create
        )
    );
    restores.push(
        mockMethod(
            prisma.note,
            'findFirst',
            (async () => ({ id: 'note-1' })) as unknown as typeof prisma.note.findFirst
        )
    );
    restores.push(
        mockMethod(
            prisma.note,
            'update',
            (async () => ({ id: 'note-1', content: 'Nota atualizada', user: { id: 'consultant-1', name: 'Consultor' } })) as unknown as typeof prisma.note.update
        )
    );
    restores.push(
        mockMethod(
            prisma.note,
            'delete',
            (async () => ({ id: 'note-1' })) as unknown as typeof prisma.note.delete
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
        const getResponse = await getNotesRoute(
            new Request('http://localhost:3000/api/leads/lead-1/notes'),
            withRouteIdParam('lead-1')
        );
        assert.equal(getResponse.status, 200);

        const postResponse = await postNotesRoute(
            new Request('http://localhost:3000/api/leads/lead-1/notes', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ content: 'Nota criada', isPinned: false }),
            }),
            withRouteIdParam('lead-1')
        );
        assert.equal(postResponse.status, 201);

        const patchResponse = await patchNotesRoute(
            new Request('http://localhost:3000/api/leads/lead-1/notes?noteId=note-1', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ content: 'Nota atualizada' }),
            }),
            withRouteIdParam('lead-1')
        );
        assert.equal(patchResponse.status, 200);

        const deleteResponse = await deleteNotesRoute(
            new Request('http://localhost:3000/api/leads/lead-1/notes?noteId=note-1', {
                method: 'DELETE',
            }),
            withRouteIdParam('lead-1')
        );
        assert.equal(deleteResponse.status, 200);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('POST /api/leads/[id]/tasks should return 403 for DIRECTOR', async () => {
    const restoreAuth = withAuthSession(setTasksAuth, resetTasksAuth, sessionForRole('DIRECTOR'));
    try {
        const response = await postTasksRoute(
            new Request('http://localhost:3000/api/leads/lead-1/tasks', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ title: 'Tarefa 1' }),
            }),
            withRouteIdParam('lead-1')
        );
        assert.equal(response.status, 403);
    } finally {
        restoreAuth();
    }
});

test('GET /api/leads/[id]/tasks should return 404 when lead is outside scope', async () => {
    const restoreAuth = withAuthSession(setTasksAuth, resetTasksAuth, sessionForRole('CONSULTANT'));
    const restores: RestoreFn[] = [];
    restores.push(
        mockMethod(prisma.lead, 'findFirst', (async () => null) as unknown as typeof prisma.lead.findFirst)
    );
    try {
        const response = await getTasksRoute(
            new Request('http://localhost:3000/api/leads/lead-out/tasks'),
            withRouteIdParam('lead-out')
        );
        assert.equal(response.status, 404);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('tasks CRUD should succeed for CONSULTANT within lead scope', async () => {
    const restoreAuth = withAuthSession(
        setTasksAuth,
        resetTasksAuth,
        sessionForRole('CONSULTANT', ROLE_USER_IDS.CONSULTANT)
    );
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(
            prisma.lead,
            'findFirst',
            (async () => ({ id: 'lead-1' })) as unknown as typeof prisma.lead.findFirst
        )
    );
    restores.push(
        mockMethod(
            prisma.task,
            'findMany',
            (async () => [
                { id: 'task-1', leadId: 'lead-1', title: 'Tarefa', status: 'PENDING', user: { id: 'consultant-1', name: 'Consultor' } },
            ]) as unknown as typeof prisma.task.findMany
        )
    );
    restores.push(
        mockMethod(
            prisma.task,
            'create',
            (async () => ({ id: 'task-1', title: 'Nova tarefa', status: 'PENDING', user: { id: 'consultant-1', name: 'Consultor' } })) as unknown as typeof prisma.task.create
        )
    );
    restores.push(
        mockMethod(
            prisma.task,
            'findFirst',
            (async () => ({ id: 'task-1', title: 'Nova tarefa', status: 'PENDING' })) as unknown as typeof prisma.task.findFirst
        )
    );
    restores.push(
        mockMethod(
            prisma.task,
            'update',
            (async () => ({ id: 'task-1', title: 'Nova tarefa', status: 'COMPLETED', user: { id: 'consultant-1', name: 'Consultor' } })) as unknown as typeof prisma.task.update
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
        const getResponse = await getTasksRoute(
            new Request('http://localhost:3000/api/leads/lead-1/tasks'),
            withRouteIdParam('lead-1')
        );
        assert.equal(getResponse.status, 200);

        const postResponse = await postTasksRoute(
            new Request('http://localhost:3000/api/leads/lead-1/tasks', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ title: 'Nova tarefa', priority: 'HIGH' }),
            }),
            withRouteIdParam('lead-1')
        );
        assert.equal(postResponse.status, 201);

        const patchResponse = await patchTasksRoute(
            new Request('http://localhost:3000/api/leads/lead-1/tasks?taskId=task-1', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ status: 'COMPLETED' }),
            }),
            withRouteIdParam('lead-1')
        );
        assert.equal(patchResponse.status, 200);

        const deleteResponse = await deleteTasksRoute(
            new Request('http://localhost:3000/api/leads/lead-1/tasks?taskId=task-1', {
                method: 'DELETE',
            }),
            withRouteIdParam('lead-1')
        );
        assert.equal(deleteResponse.status, 200);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('GET /api/leads/[id]/activities should return 404 when lead is outside scope', async () => {
    const restoreAuth = withAuthSession(setActivitiesAuth, resetActivitiesAuth, sessionForRole('CONSULTANT'));
    const restores: RestoreFn[] = [];
    restores.push(
        mockMethod(prisma.lead, 'findFirst', (async () => null) as unknown as typeof prisma.lead.findFirst)
    );

    try {
        const response = await getActivitiesRoute(
            new Request('http://localhost:3000/api/leads/lead-out/activities'),
            withRouteIdParam('lead-out')
        );
        assert.equal(response.status, 404);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('GET /api/leads/[id]/activities should succeed for in-scope lead', async () => {
    const restoreAuth = withAuthSession(setActivitiesAuth, resetActivitiesAuth, sessionForRole('MANAGER'));
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(
            prisma.lead,
            'findFirst',
            (async () => ({ id: 'lead-1' })) as unknown as typeof prisma.lead.findFirst
        )
    );
    restores.push(
        mockMethod(
            prisma.activity,
            'findMany',
            (async () => [
                { id: 'activity-1', leadId: 'lead-1', title: 'Atividade', user: { id: 'manager-1', name: 'Manager' } },
            ]) as unknown as typeof prisma.activity.findMany
        )
    );

    try {
        const response = await getActivitiesRoute(
            new Request('http://localhost:3000/api/leads/lead-1/activities?limit=20'),
            withRouteIdParam('lead-1')
        );
        assert.equal(response.status, 200);

        const payload = await response.json() as unknown[];
        assert.equal(payload.length, 1);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});
