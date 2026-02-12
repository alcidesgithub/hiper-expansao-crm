import test from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '@prisma/client';
import {
    buildLeadBaseSelect,
    buildLeadSelect,
    canReadSensitiveLeadFields,
} from '@/lib/lead-select';

const ALL_ROLES: readonly UserRole[] = ['ADMIN', 'DIRECTOR', 'MANAGER', 'SDR', 'CONSULTANT'];

test('buildLeadBaseSelect should include only base lead fields', () => {
    const select = buildLeadBaseSelect();
    const keys = Object.keys(select).sort();

    assert.deepEqual(keys, [
        'assignedUserId',
        'company',
        'createdAt',
        'email',
        'id',
        'name',
        'phone',
        'pipelineStageId',
        'priority',
        'source',
        'status',
        'updatedAt',
    ]);
});

test('canReadSensitiveLeadFields should respect permission matrix', () => {
    for (const role of ALL_ROLES) {
        assert.equal(canReadSensitiveLeadFields(role), true);
    }
    assert.equal(canReadSensitiveLeadFields(null), false);
    assert.equal(canReadSensitiveLeadFields(undefined), false);
});

test('buildLeadSelect should include score/grade for permitted roles', () => {
    for (const role of ALL_ROLES) {
        const select = buildLeadSelect({ role, includeSensitive: true });
        assert.equal(select.score, true);
        assert.equal(select.grade, true);
    }
});

test('buildLeadSelect should hide qualificationData/roiData for consultant', () => {
    const select = buildLeadSelect({
        role: 'CONSULTANT',
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
        role: 'MANAGER',
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
        role: 'ADMIN',
        includeRelations: true,
    });

    assert.equal(typeof select.assignedUser, 'object');
    assert.equal(typeof select.pipelineStage, 'object');
});
