import { resolveMx } from 'dns/promises';

const EMAIL_DOMAIN_BLOCKLIST = new Set<string>([
    'mailinator.com',
    '10minutemail.com',
    'guerrillamail.com',
    'tempmail.com',
    'yopmail.com',
    'sharklasers.com',
    'dispostable.com',
]);

const VALID_BRAZIL_DDDS = new Set<string>([
    '11', '12', '13', '14', '15', '16', '17', '18', '19',
    '21', '22', '24', '27', '28',
    '31', '32', '33', '34', '35', '37', '38',
    '41', '42', '43', '44', '45', '46',
    '47', '48', '49',
    '51', '53', '54', '55',
    '61', '62', '63', '64',
    '65', '66', '67',
    '68', '69',
    '71', '73', '74', '75', '77',
    '79',
    '81', '82', '83', '84', '85', '86', '87', '88', '89',
    '91', '92', '93', '94',
    '95', '96', '97', '98', '99',
]);

const MX_TIMEOUT_MS = 1500;

export interface ContactValidationInput {
    fullName: string;
    email: string;
    phone: string;
}

export interface ContactValidationResult {
    ok: boolean;
    error?: string;
    normalized: {
        fullName: string;
        email: string;
        phone: string;
    };
    meta: {
        emailDomain: string;
        mxChecked: boolean;
        mxFound: boolean | null;
    };
}

interface ValidationDeps {
    resolveMxFn?: (domain: string) => Promise<Array<{ exchange: string; priority: number }>>;
}

function normalizeSpaces(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
}

function normalizeEmail(value: string): string {
    return normalizeSpaces(value).toLowerCase();
}

function normalizePhone(value: string): string {
    return value.replace(/\D/g, '');
}

function isValidFullName(value: string): boolean {
    const normalized = normalizeSpaces(value);
    const words = normalized.split(' ').filter((word) => word.length >= 2);
    return words.length >= 2;
}

function isPhoneAllSameDigits(phoneDigits: string): boolean {
    return /^(\d)\1+$/.test(phoneDigits);
}

async function resolveMxWithTimeout(
    domain: string,
    resolveMxFn: (domain: string) => Promise<Array<{ exchange: string; priority: number }>>
): Promise<Array<{ exchange: string; priority: number }> | null> {
    try {
        const result = await Promise.race<Array<{ exchange: string; priority: number }> | null>([
            resolveMxFn(domain),
            new Promise<null>((resolve) => {
                setTimeout(() => resolve(null), MX_TIMEOUT_MS);
            }),
        ]);
        return result;
    } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'ESERVFAIL') {
            return [];
        }
        return null;
    }
}

export async function validateLeadContactPayload(
    input: ContactValidationInput,
    deps: ValidationDeps = {}
): Promise<ContactValidationResult> {
    const fullName = normalizeSpaces(input.fullName);
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);

    const [, domain = ''] = email.split('@');
    const lowerDomain = domain.toLowerCase();

    const baseResult: ContactValidationResult = {
        ok: false,
        normalized: {
            fullName,
            email,
            phone,
        },
        meta: {
            emailDomain: lowerDomain,
            mxChecked: false,
            mxFound: null,
        },
    };

    if (!isValidFullName(fullName)) {
        return {
            ...baseResult,
            error: 'Informe nome e sobrenome validos.',
        };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return {
            ...baseResult,
            error: 'Email invalido.',
        };
    }

    if (!lowerDomain || EMAIL_DOMAIN_BLOCKLIST.has(lowerDomain)) {
        return {
            ...baseResult,
            error: 'Use um email corporativo valido.',
        };
    }

    const resolveMxFn = deps.resolveMxFn || resolveMx;
    const mxRecords = await resolveMxWithTimeout(lowerDomain, resolveMxFn);
    const mxFound = Array.isArray(mxRecords) ? mxRecords.length > 0 : null;

    if (mxFound === false) {
        return {
            ...baseResult,
            meta: {
                ...baseResult.meta,
                mxChecked: true,
                mxFound: false,
            },
            error: 'Dominio de email sem registro MX valido.',
        };
    }

    if (phone.length !== 10 && phone.length !== 11) {
        return {
            ...baseResult,
            meta: {
                ...baseResult.meta,
                mxChecked: true,
                mxFound,
            },
            error: 'Telefone invalido. Informe DDD + numero.',
        };
    }

    if (isPhoneAllSameDigits(phone)) {
        return {
            ...baseResult,
            meta: {
                ...baseResult.meta,
                mxChecked: true,
                mxFound,
            },
            error: 'Telefone invalido.',
        };
    }

    const ddd = phone.slice(0, 2);
    if (!VALID_BRAZIL_DDDS.has(ddd)) {
        return {
            ...baseResult,
            meta: {
                ...baseResult.meta,
                mxChecked: true,
                mxFound,
            },
            error: 'DDD invalido para telefone brasileiro.',
        };
    }

    if (phone.length === 11 && phone[2] !== '9') {
        return {
            ...baseResult,
            meta: {
                ...baseResult.meta,
                mxChecked: true,
                mxFound,
            },
            error: 'Celular invalido para o DDD informado.',
        };
    }

    return {
        ok: true,
        normalized: {
            fullName,
            email,
            phone,
        },
        meta: {
            emailDomain: lowerDomain,
            mxChecked: true,
            mxFound,
        },
    };
}
