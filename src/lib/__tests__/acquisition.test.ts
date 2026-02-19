import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNullableText, normalizeSessionId, toLeadUtmFields, type AttributionSnapshot } from '@/lib/acquisition';

test('normalizeSessionId should accept valid ids and reject short values', () => {
    assert.equal(normalizeSessionId('session-12345678'), 'session-12345678');
    assert.equal(normalizeSessionId('short'), undefined);
    assert.equal(normalizeSessionId('   '), undefined);
});

test('normalizeNullableText should trim and enforce max length', () => {
    assert.equal(normalizeNullableText('  campanha teste  ', 50), 'campanha teste');
    assert.equal(normalizeNullableText(''), undefined);
    assert.equal(normalizeNullableText('abcdef', 3), 'abc');
});

test('toLeadUtmFields should map and normalize attribution fields', () => {
    const snapshot: AttributionSnapshot = {
        sessionId: 'session-abcdef1234',
        utmSource: '  google ',
        utmMedium: ' cpc ',
        utmCampaign: ' camp-abc ',
        utmTerm: ' termo ',
        utmContent: ' conteudo ',
        firstTouchAt: new Date('2026-02-01T10:00:00.000Z').toISOString(),
        lastTouchAt: new Date('2026-02-01T10:00:00.000Z').toISOString(),
    };

    const result = toLeadUtmFields(snapshot);
    assert.deepEqual(result, {
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'camp-abc',
        utmTerm: 'termo',
        utmContent: 'conteudo',
    });
});
