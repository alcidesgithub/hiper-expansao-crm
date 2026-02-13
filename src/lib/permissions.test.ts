import { describe, it } from 'node:test';
import assert from 'node:assert';
import { can, canAny, canAll } from './permissions';

describe('Permissions Logic', () => {
    describe('can', () => {
        it('should return false if user is null or undefined', () => {
            assert.strictEqual(can(null, 'leads:read:all'), false);
            assert.strictEqual(can(undefined, 'leads:read:all'), false);
        });

        it('should return true if user has the permission in permissions array', () => {
            const user = {
                role: 'MANAGER',
                permissions: ['leads:read:all', 'leads:write:own'],
            };
            assert.strictEqual(can(user, 'leads:read:all'), true);
            assert.strictEqual(can(user, 'leads:write:own'), true);
        });

        it('should return false if user does not have the permission', () => {
            const user = {
                role: 'MANAGER',
                permissions: ['leads:read:all'],
            };
            assert.strictEqual(can(user, 'leads:write:own'), false);
        });

        it('should return false if user has no permissions array', () => {
            const user = {
                role: 'MANAGER',
            };
            assert.strictEqual(can(user, 'leads:read:all'), false);
        });
    });

    describe('canAny', () => {
        it('should return true if user has at least one of the permissions', () => {
            const user = {
                permissions: ['leads:read:all'],
            };
            assert.strictEqual(canAny(user, ['leads:read:all', 'leads:write:own']), true);
        });

        it('should return false if user has none of the permissions', () => {
            const user = {
                permissions: ['leads:read:all'],
            };
            assert.strictEqual(canAny(user, ['leads:write:own', 'leads:delete']), false);
        });
    });

    describe('canAll', () => {
        it('should return true if user has all of the permissions', () => {
            const user = {
                permissions: ['leads:read:all', 'leads:write:own'],
            };
            assert.strictEqual(canAll(user, ['leads:read:all', 'leads:write:own']), true);
        });

        it('should return false if user is missing one permission', () => {
            const user = {
                permissions: ['leads:read:all'],
            };
            assert.strictEqual(canAll(user, ['leads:read:all', 'leads:write:own']), false);
        });
    });
});
