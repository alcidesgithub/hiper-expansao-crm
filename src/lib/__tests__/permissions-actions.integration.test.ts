import test from 'node:test';
import assert from 'node:assert/strict';
import type { Permission } from '@/lib/permissions';
import {
    updateRolePermissions,
    __setPermissionActionsHandlersForTests,
    __resetPermissionActionsHandlersForTests,
} from '@/app/dashboard/admin/settings/permissions/actions';

function withHandlers(handlers: Parameters<typeof __setPermissionActionsHandlersForTests>[0]): () => void {
    __setPermissionActionsHandlersForTests(handlers);
    return () => __resetPermissionActionsHandlersForTests();
}

test('updateRolePermissions should reject when session is missing', async () => {
    const restore = withHandlers({
        authHandler: (async () => null) as unknown as Parameters<typeof __setPermissionActionsHandlersForTests>[0]['authHandler'],
    });

    try {
        await assert.rejects(
            updateRolePermissions('MANAGER', ['leads:read:all']),
            /autorizado/i
        );
    } finally {
        restore();
    }
});

test('updateRolePermissions should reject when user has no system:configure permission', async () => {
    const restore = withHandlers({
        authHandler: (async () => ({
            user: {
                id: 'manager-1',
                role: 'MANAGER',
                permissions: ['dashboard:operational'],
            },
        })) as unknown as Parameters<typeof __setPermissionActionsHandlersForTests>[0]['authHandler'],
    });

    try {
        await assert.rejects(
            updateRolePermissions('MANAGER', ['leads:read:all']),
            /autorizado/i
        );
    } finally {
        restore();
    }
});

test('updateRolePermissions should prevent ADMIN from losing system:configure', async () => {
    let called = false;
    const restore = withHandlers({
        authHandler: (async () => ({
            user: {
                id: 'admin-1',
                role: 'ADMIN',
                permissions: ['system:configure'],
            },
        })) as unknown as Parameters<typeof __setPermissionActionsHandlersForTests>[0]['authHandler'],
        updateSingleRolePermissionsHandler: (async () => {
            called = true;
        }) as unknown as Parameters<typeof __setPermissionActionsHandlersForTests>[0]['updateSingleRolePermissionsHandler'],
    });

    try {
        const result = await updateRolePermissions('ADMIN', ['leads:read:all']);
        assert.equal(result.success, false);
        assert.match(result.error || '', /system:configure/i);
        assert.equal(called, false);
    } finally {
        restore();
    }
});

test('updateRolePermissions should return validation error for invalid role', async () => {
    let called = false;
    const restore = withHandlers({
        authHandler: (async () => ({
            user: {
                id: 'admin-1',
                role: 'ADMIN',
                permissions: ['system:configure'],
            },
        })) as unknown as Parameters<typeof __setPermissionActionsHandlersForTests>[0]['authHandler'],
        updateSingleRolePermissionsHandler: (async () => {
            called = true;
        }) as unknown as Parameters<typeof __setPermissionActionsHandlersForTests>[0]['updateSingleRolePermissionsHandler'],
    });

    try {
        const result = await updateRolePermissions('INVALID_ROLE', ['leads:read:all']);
        assert.equal(result.success, false);
        assert.match(result.error || '', /inv/i);
        assert.equal(called, false);
    } finally {
        restore();
    }
});

test('updateRolePermissions should normalize permissions and persist changes', async () => {
    let capturedRole: string | undefined;
    let capturedPermissions: Permission[] = [];
    let revalidatedPath: string | undefined;

    const restore = withHandlers({
        authHandler: (async () => ({
            user: {
                id: 'admin-1',
                role: 'ADMIN',
                permissions: ['system:configure'],
            },
        })) as unknown as Parameters<typeof __setPermissionActionsHandlersForTests>[0]['authHandler'],
        updateSingleRolePermissionsHandler: (async (role: 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'CONSULTANT', permissions: Permission[]) => {
            capturedRole = role;
            capturedPermissions = permissions;
        }) as unknown as Parameters<typeof __setPermissionActionsHandlersForTests>[0]['updateSingleRolePermissionsHandler'],
        revalidatePathHandler: ((path: string) => {
            revalidatedPath = path;
        }) as unknown as Parameters<typeof __setPermissionActionsHandlersForTests>[0]['revalidatePathHandler'],
    });

    try {
        const rawPermissions = [
            'leads:read:all',
            'invalid:permission',
            'dashboard:operational',
        ] as unknown as Permission[];

        const result = await updateRolePermissions('MANAGER', rawPermissions);

        assert.equal(result.success, true);
        assert.deepEqual(result.updatedPermissions, ['leads:read:all', 'dashboard:operational']);
        assert.equal(capturedRole, 'MANAGER');
        assert.deepEqual(capturedPermissions, ['leads:read:all', 'dashboard:operational']);
        assert.equal(revalidatedPath, '/dashboard/admin/settings/permissions');
    } finally {
        restore();
    }
});

test('updateRolePermissions should return generic error when persistence fails', async () => {
    const restore = withHandlers({
        authHandler: (async () => ({
            user: {
                id: 'admin-1',
                role: 'ADMIN',
                permissions: ['system:configure'],
            },
        })) as unknown as Parameters<typeof __setPermissionActionsHandlersForTests>[0]['authHandler'],
        updateSingleRolePermissionsHandler: (async () => {
            throw new Error('db failure');
        }) as unknown as Parameters<typeof __setPermissionActionsHandlersForTests>[0]['updateSingleRolePermissionsHandler'],
    });

    try {
        const result = await updateRolePermissions('MANAGER', ['leads:read:all']);
        assert.equal(result.success, false);
        assert.equal(result.error, 'Erro ao atualizar permissões');
    } finally {
        restore();
    }
});
