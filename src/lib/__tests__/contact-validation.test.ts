import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLeadContactPayload } from '@/lib/contact-validation';

function validMx(): Array<{ exchange: string; priority: number }> {
    return [{ exchange: 'mx.example.com', priority: 10 }];
}

test('validateLeadContactPayload should reject blocked email domain', async () => {
    const result = await validateLeadContactPayload(
        {
            fullName: 'Maria Silva',
            email: 'maria@mailinator.com',
            phone: '(41) 99999-9999',
        },
        {
            resolveMxFn: async () => validMx(),
        }
    );

    assert.equal(result.ok, false);
    assert.match(result.error || '', /email corporativo/i);
});

test('validateLeadContactPayload should reject invalid ddd', async () => {
    const result = await validateLeadContactPayload(
        {
            fullName: 'Maria Silva',
            email: 'maria@empresa.com',
            phone: '(00) 99999-9999',
        },
        {
            resolveMxFn: async () => validMx(),
        }
    );

    assert.equal(result.ok, false);
    assert.match(result.error || '', /DDD invalido/i);
});

test('validateLeadContactPayload should reject domain without MX', async () => {
    const result = await validateLeadContactPayload(
        {
            fullName: 'Maria Silva',
            email: 'maria@dominio-sem-mx.com',
            phone: '(41) 99999-9999',
        },
        {
            resolveMxFn: async () => [],
        }
    );

    assert.equal(result.ok, false);
    assert.match(result.error || '', /registro MX/i);
});

test('validateLeadContactPayload should accept valid data and normalize fields', async () => {
    const result = await validateLeadContactPayload(
        {
            fullName: '  Maria   Silva  ',
            email: 'Maria.Silva@Empresa.COM',
            phone: '(41) 99999-9999',
        },
        {
            resolveMxFn: async () => validMx(),
        }
    );

    assert.equal(result.ok, true);
    assert.equal(result.normalized.fullName, 'Maria Silva');
    assert.equal(result.normalized.email, 'maria.silva@empresa.com');
    assert.equal(result.normalized.phone, '41999999999');
});
