'use client';

import {
    ATTRIBUTION_QUERY_KEYS,
    type AcquisitionEventPayload,
    type AttributionSnapshot,
    normalizeNullableText,
    normalizeSessionId,
} from '@/lib/acquisition';

const ATTRIBUTION_STORAGE_KEY = 'funnel:acq:attribution:v1';
const LP_VIEW_SENT_KEY = 'funnel:acq:lp_view_sent:v1';
const IS_ACQ_TRACKING_ENABLED = (() => {
    const value = process.env.NEXT_PUBLIC_ACQ_TRACKING_V1;
    if (!value) return true;
    return value !== 'false' && value !== '0';
})();

function randomSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `acq-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
    return new Date().toISOString();
}

function readAttribution(): AttributionSnapshot | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        const candidate = parsed as Partial<AttributionSnapshot>;
        const sessionId = normalizeSessionId(candidate.sessionId);
        if (!sessionId) return null;

        return {
            sessionId,
            landingVariant: normalizeNullableText(candidate.landingVariant, 50),
            utmSource: normalizeNullableText(candidate.utmSource, 100),
            utmMedium: normalizeNullableText(candidate.utmMedium, 100),
            utmCampaign: normalizeNullableText(candidate.utmCampaign, 150),
            utmTerm: normalizeNullableText(candidate.utmTerm, 150),
            utmContent: normalizeNullableText(candidate.utmContent, 150),
            gclid: normalizeNullableText(candidate.gclid, 150),
            fbclid: normalizeNullableText(candidate.fbclid, 150),
            firstTouchAt: normalizeNullableText(candidate.firstTouchAt, 50) || nowIso(),
            lastTouchAt: normalizeNullableText(candidate.lastTouchAt, 50) || nowIso(),
        };
    } catch {
        return null;
    }
}

function writeAttribution(snapshot: AttributionSnapshot): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
        // Ignore private mode/quota issues.
    }
}

function getQueryParam(searchParams: URLSearchParams, key: string): string | undefined {
    return normalizeNullableText(searchParams.get(key), 200);
}

function resolveSessionId(explicitSessionId?: string): string {
    const normalized = normalizeSessionId(explicitSessionId);
    if (normalized) return normalized;
    const existing = readAttribution();
    if (existing?.sessionId) return existing.sessionId;
    return randomSessionId();
}

export function getAttributionSnapshot(): AttributionSnapshot | null {
    return readAttribution();
}

export function captureAttributionFromCurrentUrl(defaultVariant = 'control'): AttributionSnapshot {
    const searchParams = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    const existing = readAttribution();
    const now = nowIso();

    const snapshot: AttributionSnapshot = {
        sessionId: resolveSessionId(existing?.sessionId),
        firstTouchAt: existing?.firstTouchAt || now,
        lastTouchAt: now,
        landingVariant: getQueryParam(searchParams, 'variant') || existing?.landingVariant || defaultVariant,
        utmSource: getQueryParam(searchParams, 'utm_source') || existing?.utmSource,
        utmMedium: getQueryParam(searchParams, 'utm_medium') || existing?.utmMedium,
        utmCampaign: getQueryParam(searchParams, 'utm_campaign') || existing?.utmCampaign,
        utmTerm: getQueryParam(searchParams, 'utm_term') || existing?.utmTerm,
        utmContent: getQueryParam(searchParams, 'utm_content') || existing?.utmContent,
        gclid: getQueryParam(searchParams, 'gclid') || existing?.gclid,
        fbclid: getQueryParam(searchParams, 'fbclid') || existing?.fbclid,
    };

    writeAttribution(snapshot);
    return snapshot;
}

export function buildAssociarHref(defaultVariant = 'control'): string {
    const snapshot = captureAttributionFromCurrentUrl(defaultVariant);
    const query = new URLSearchParams();

    if (snapshot.utmSource) query.set('utm_source', snapshot.utmSource);
    if (snapshot.utmMedium) query.set('utm_medium', snapshot.utmMedium);
    if (snapshot.utmCampaign) query.set('utm_campaign', snapshot.utmCampaign);
    if (snapshot.utmTerm) query.set('utm_term', snapshot.utmTerm);
    if (snapshot.utmContent) query.set('utm_content', snapshot.utmContent);
    if (snapshot.gclid) query.set('gclid', snapshot.gclid);
    if (snapshot.fbclid) query.set('fbclid', snapshot.fbclid);
    if (snapshot.landingVariant) query.set('variant', snapshot.landingVariant);
    query.set('session_id', snapshot.sessionId);

    return `/associar?${query.toString()}`;
}

export function shouldTrackLpView(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        if (window.sessionStorage.getItem(LP_VIEW_SENT_KEY) === 'true') return false;
        window.sessionStorage.setItem(LP_VIEW_SENT_KEY, 'true');
        return true;
    } catch {
        return true;
    }
}

export async function trackAcquisitionEvent(
    payload: Omit<AcquisitionEventPayload, 'sessionId'> & { sessionId?: string }
): Promise<void> {
    if (!IS_ACQ_TRACKING_ENABLED) return;

    const snapshot = captureAttributionFromCurrentUrl(payload.variant || 'control');
    const sessionId = normalizeSessionId(payload.sessionId) || snapshot.sessionId;

    const body: AcquisitionEventPayload = {
        eventName: payload.eventName,
        sessionId,
        page: payload.page,
        ctaId: payload.ctaId,
        variant: payload.variant || snapshot.landingVariant,
        utmSource: payload.utmSource || snapshot.utmSource,
        utmMedium: payload.utmMedium || snapshot.utmMedium,
        utmCampaign: payload.utmCampaign || snapshot.utmCampaign,
        utmTerm: payload.utmTerm || snapshot.utmTerm,
        utmContent: payload.utmContent || snapshot.utmContent,
        timestamp: payload.timestamp || nowIso(),
        metadata: payload.metadata,
    };

    try {
        await fetch('/api/public/analytics', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
            keepalive: true,
        });
    } catch {
        // best effort
    }
}

export function getGateSessionIdFromAttribution(): string {
    const snapshot = readAttribution();
    return snapshot?.sessionId || resolveSessionId();
}

export function getAttributionForLeadSubmission(defaultVariant = 'control') {
    const snapshot = captureAttributionFromCurrentUrl(defaultVariant);
    return {
        sessionId: snapshot.sessionId,
        landingVariant: snapshot.landingVariant,
        utmSource: snapshot.utmSource,
        utmMedium: snapshot.utmMedium,
        utmCampaign: snapshot.utmCampaign,
        utmTerm: snapshot.utmTerm,
        utmContent: snapshot.utmContent,
    };
}

export function getPassthroughQueryFromCurrentUrl(defaultVariant = 'control'): string {
    const snapshot = captureAttributionFromCurrentUrl(defaultVariant);
    const params = new URLSearchParams();
    const valuesByKey: Record<(typeof ATTRIBUTION_QUERY_KEYS)[number], string | undefined> = {
        utm_source: snapshot.utmSource,
        utm_medium: snapshot.utmMedium,
        utm_campaign: snapshot.utmCampaign,
        utm_term: snapshot.utmTerm,
        utm_content: snapshot.utmContent,
        gclid: snapshot.gclid,
        fbclid: snapshot.fbclid,
        variant: snapshot.landingVariant,
    };

    for (const key of ATTRIBUTION_QUERY_KEYS) {
        const value = valuesByKey[key];
        if (value) params.set(key, value);
    }

    params.set('session_id', snapshot.sessionId);
    return params.toString();
}
