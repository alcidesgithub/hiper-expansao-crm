import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/lib/prisma';
import {
    POST as postUploadRoute,
    __setAuthHandlerForTests as setUploadAuth,
    __resetAuthHandlerForTests as resetUploadAuth,
    __setUploadFsHandlersForTests,
    __resetUploadFsHandlersForTests,
} from '@/app/api/upload/route';
import {
    mockMethod,
    type RestoreFn,
    sessionForRole,
    withAuthSession,
} from '@/lib/__tests__/crm-role-test-utils';

function buildUploadRequest(leadId: string, fileOptions?: { name?: string; type?: string; content?: string }): Request {
    const formData = new FormData();
    const file = new File(
        [fileOptions?.content || 'fake-pdf-content'],
        fileOptions?.name || 'arquivo.pdf',
        { type: fileOptions?.type || 'application/pdf' }
    );
    formData.set('leadId', leadId);
    formData.set('file', file);

    return new Request('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
    });
}

test('POST /api/upload should return 401 when unauthenticated', async () => {
    const restoreAuth = withAuthSession(setUploadAuth, resetUploadAuth, null);
    try {
        const response = await postUploadRoute(buildUploadRequest('lead-1'));
        assert.equal(response.status, 401);
    } finally {
        restoreAuth();
    }
});

test('POST /api/upload should return 403 for DIRECTOR', async () => {
    const restoreAuth = withAuthSession(setUploadAuth, resetUploadAuth, sessionForRole('DIRECTOR'));
    try {
        const response = await postUploadRoute(buildUploadRequest('lead-1'));
        assert.equal(response.status, 403);
    } finally {
        restoreAuth();
    }
});

test('POST /api/upload should return 404 when lead is outside role scope', async () => {
    const restoreAuth = withAuthSession(setUploadAuth, resetUploadAuth, sessionForRole('SDR'));
    const restores: RestoreFn[] = [];

    restores.push(
        mockMethod(
            prisma.lead,
            'findFirst',
            (async () => null) as unknown as typeof prisma.lead.findFirst
        )
    );

    try {
        const response = await postUploadRoute(buildUploadRequest('lead-out'));
        assert.equal(response.status, 404);
    } finally {
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});

test('POST /api/upload should create document for in-scope lead', async () => {
    const restoreAuth = withAuthSession(setUploadAuth, resetUploadAuth, sessionForRole('CONSULTANT'));
    const restores: RestoreFn[] = [];
    let mkdirCalled = false;
    let writeCalled = false;

    __setUploadFsHandlersForTests({
        mkdir: (async () => {
            mkdirCalled = true;
            return undefined;
        }) as unknown as typeof import('fs/promises').mkdir,
        writeFile: (async () => {
            writeCalled = true;
            return undefined;
        }) as unknown as typeof import('fs/promises').writeFile,
    });

    restores.push(
        mockMethod(
            prisma.lead,
            'findFirst',
            (async () => ({ id: 'lead-1' })) as unknown as typeof prisma.lead.findFirst
        )
    );
    restores.push(
        mockMethod(
            prisma.document,
            'create',
            (async () => ({
                id: 'doc-1',
                name: 'arquivo.pdf',
                type: 'application/pdf',
                size: 16,
                createdAt: new Date('2026-02-12T12:00:00.000Z'),
            })) as unknown as typeof prisma.document.create
        )
    );

    try {
        const response = await postUploadRoute(buildUploadRequest('lead-1'));
        assert.equal(response.status, 201);
        assert.equal(mkdirCalled, true);
        assert.equal(writeCalled, true);

        const payload = await response.json() as { id?: string; fileType?: string };
        assert.equal(payload.id, 'doc-1');
        assert.equal(payload.fileType, 'application/pdf');
    } finally {
        __resetUploadFsHandlersForTests();
        for (const restore of restores.reverse()) restore();
        restoreAuth();
    }
});
