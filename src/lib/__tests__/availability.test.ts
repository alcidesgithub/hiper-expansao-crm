import test from 'node:test';
import assert from 'node:assert/strict';
import {
    parseDateParts,
    parseTimeToMinutes,
    isTimeWithinIntervals,
} from '@/lib/availability';

test('parseDateParts should parse a valid ISO date', () => {
    const parsed = parseDateParts('2026-02-12');
    assert.deepEqual(parsed, { year: 2026, month: 2, day: 12 });
});

test('parseDateParts should reject invalid dates', () => {
    assert.equal(parseDateParts('2026-02-30'), null);
    assert.equal(parseDateParts('12-02-2026'), null);
    assert.equal(parseDateParts('invalid'), null);
});

test('parseTimeToMinutes should parse HH:mm', () => {
    assert.equal(parseTimeToMinutes('00:00'), 0);
    assert.equal(parseTimeToMinutes('09:30'), 570);
    assert.equal(parseTimeToMinutes('23:59'), 1439);
});

test('parseTimeToMinutes should reject invalid values', () => {
    assert.equal(parseTimeToMinutes('24:00'), null);
    assert.equal(parseTimeToMinutes('09:60'), null);
    assert.equal(parseTimeToMinutes('9:00'), null);
});

test('isTimeWithinIntervals should validate slot fit by duration', () => {
    const intervals = [
        { startMinutes: 9 * 60, endMinutes: 12 * 60 },
        { startMinutes: 14 * 60, endMinutes: 18 * 60 },
    ];

    assert.equal(isTimeWithinIntervals(intervals, 9 * 60, 60), true);
    assert.equal(isTimeWithinIntervals(intervals, 11 * 60, 60), true);
    assert.equal(isTimeWithinIntervals(intervals, 11 * 60 + 30, 60), false);
    assert.equal(isTimeWithinIntervals(intervals, 13 * 60, 60), false);
    assert.equal(isTimeWithinIntervals(intervals, 17 * 60, 60), true);
    assert.equal(isTimeWithinIntervals(intervals, 17 * 60 + 1, 60), false);
});
