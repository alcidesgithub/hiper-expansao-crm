import test from 'node:test';
import assert from 'node:assert/strict';
import { isMeetingOverlapError } from '@/lib/meeting-conflict';

test('isMeetingOverlapError should detect exclusion constraint conflicts', () => {
    const error = new Error('conflicting key value violates exclusion constraint "meeting_no_overlap_active"');
    assert.equal(isMeetingOverlapError(error), true);
});

test('isMeetingOverlapError should ignore unrelated errors', () => {
    const error = new Error('database connection timeout');
    assert.equal(isMeetingOverlapError(error), false);
});
