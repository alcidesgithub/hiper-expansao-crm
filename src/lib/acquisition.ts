export const ACQUISITION_EVENT_NAMES = [
    'LP_VIEW',
    'LP_CTA_CLICK',
    'GATE_CONTINUE',
    'STEP1_SUBMIT_SUCCESS',
    'STEP1_SUBMIT_ERROR',
    'STEP_N_COMPLETE',
    'CALENDAR_BOOK_SUCCESS',
] as const;

export type AcquisitionEventName = (typeof ACQUISITION_EVENT_NAMES)[number];

export interface AcquisitionEventPayload {
    eventName: AcquisitionEventName;
    sessionId: string;
    page: string;
    ctaId?: string;
    variant?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    timestamp?: string;
    metadata?: Record<string, unknown>;
}

export const ATTRIBUTION_QUERY_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid',
    'variant',
] as const;

export interface AttributionSnapshot {
    sessionId: string;
    landingVariant?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    gclid?: string;
    fbclid?: string;
    firstTouchAt: string;
    lastTouchAt: string;
}

type NullableText = string | null | undefined;

export function normalizeNullableText(value: NullableText, maxLen = 200): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, maxLen);
}

export function normalizeSessionId(value: NullableText): string | undefined {
    const normalized = normalizeNullableText(value, 120);
    if (!normalized) return undefined;
    if (normalized.length < 8) return undefined;
    return normalized;
}

export function toLeadUtmFields(snapshot?: AttributionSnapshot) {
    if (!snapshot) {
        return {
            utmSource: undefined,
            utmMedium: undefined,
            utmCampaign: undefined,
            utmTerm: undefined,
            utmContent: undefined,
        };
    }

    return {
        utmSource: normalizeNullableText(snapshot.utmSource, 100),
        utmMedium: normalizeNullableText(snapshot.utmMedium, 100),
        utmCampaign: normalizeNullableText(snapshot.utmCampaign, 150),
        utmTerm: normalizeNullableText(snapshot.utmTerm, 150),
        utmContent: normalizeNullableText(snapshot.utmContent, 150),
    };
}
