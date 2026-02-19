import test from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '@prisma/client';
import {
    buildLeadBaseSelect,
    buildLeadSelect,
    canReadSensitiveLeadFields,
} from '@/lib/lead-select';
import { DEFAULT_ROLE_PERMISSIONS } from '@/services/permissions-service';

const ALL_ROLES: readonly UserRole[] = ['ADMIN', 'DIRECTOR', 'MANAGER', 'CONSULTANT'];

test('buildLeadBaseSelect should include only base lead fields', () => {
    const select = buildLeadBaseSelect();
    const keys = Object.keys(select).sort();

    assert.deepEqual(keys, [
        'assignedUserId',
        'company',
        'createdAt',
        'email',
        'estimatedValue',
        'expectedCloseDate',
        'id',
        'name',
        'phone',
        'pipelineStageId',
        'position',
        'priority',
        'source',
        'status',
        'updatedAt',
    ]);
});

test('canReadSensitiveLeadFields should respect permission matrix', () => {
    for (const role of ALL_ROLES) {
        const perms = DEFAULT_ROLE_PERMISSIONS[role];
        assert.equal(canReadSensitiveLeadFields({ role, permissions: perms }), true);
    }
    assert.equal(canReadSensitiveLeadFields(null), false);
    assert.equal(canReadSensitiveLeadFields(undefined), false);
});

test('buildLeadSelect should include score/grade for permitted roles', () => {
    for (const role of ALL_ROLES) {
        const select = buildLeadSelect({ user: { role, permissions: DEFAULT_ROLE_PERMISSIONS[role] }, includeSensitive: true });
        assert.equal(select.score, true);
        assert.equal(select.grade, true);
    }
});

test('buildLeadSelect should hide qualificationData/roiData for consultant', () => {
    const select = buildLeadSelect({
        user: { role: 'CONSULTANT', permissions: DEFAULT_ROLE_PERMISSIONS.CONSULTANT },
        includeSensitive: true,
        includeQualificationData: true,
        includeRoiData: true,
    });

    assert.equal(select.score, true);
    assert.equal(select.grade, true);
    assert.equal(select.qualificationData, undefined);
    assert.equal(select.roiData, undefined);
});

test('buildLeadSelect should include qualificationData/roiData for non-consultant with permission', () => {
    const select = buildLeadSelect({
        user: { role: 'MANAGER', permissions: DEFAULT_ROLE_PERMISSIONS.MANAGER },
        includeSensitive: true,
        includeQualificationData: true,
        includeRoiData: true,
    });

    assert.equal(select.score, true);
    assert.equal(select.grade, true);
    assert.equal(select.qualificationData, true);
    assert.equal(select.roiData, true);
});

test('buildLeadSelect should include requested relations', () => {
    const select = buildLeadSelect({
        user: { role: 'ADMIN', permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN },
        includeRelations: true,
    });

    assert.equal(typeof select.assignedUser, 'object');
    assert.equal(typeof select.pipelineStage, 'object');
});
