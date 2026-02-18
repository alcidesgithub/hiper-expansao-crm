interface TeamsConfig {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    scope: string;
}

interface CachedGraphToken {
    cacheKey: string;
    token: string;
    expiresAt: number;
}

interface GraphDateTime {
    dateTime?: string;
    timeZone?: string;
}

interface GraphEventPayload {
    id?: string;
    isCancelled?: boolean;
    webLink?: string;
    onlineMeeting?: { joinUrl?: string };
    start?: GraphDateTime;
    end?: GraphDateTime;
    lastModifiedDateTime?: string;
}

export interface CreateTeamsMeetingParams {
    organizerEmail: string;
    leadEmail: string;
    leadName: string;
    subject: string;
    description?: string | null;
    startTime: Date;
    endTime: Date;
}

export interface TeamsMeetingPayload {
    externalEventId: string;
    meetingLink: string;
    provider: 'teams';
}

export interface TeamsEventPayload {
    externalEventId: string;
    isCancelled: boolean;
    startTime: Date | null;
    endTime: Date | null;
    meetingLink: string | null;
    lastModifiedAt: Date | null;
}

export interface CreateTeamsSubscriptionParams {
    organizerEmail: string;
    notificationUrl: string;
    clientState: string;
    expirationDateTime: string;
    lifecycleNotificationUrl?: string;
}

export interface TeamsSubscriptionPayload {
    id: string;
    resource: string;
    expirationDateTime: string;
    clientState?: string;
}

let cachedGraphToken: CachedGraphToken | null = null;

function buildConfigCacheKey(config: TeamsConfig): string {
    return `${config.tenantId}|${config.clientId}|${config.scope}|${config.clientSecret}`;
}

function getCachedToken(config: TeamsConfig): string | null {
    if (!cachedGraphToken) return null;
    if (cachedGraphToken.cacheKey !== buildConfigCacheKey(config)) return null;
    if (cachedGraphToken.expiresAt <= Date.now() + 60_000) return null;
    return cachedGraphToken.token;
}

function cacheToken(config: TeamsConfig, token: string, expiresInSeconds?: number): void {
    if (!expiresInSeconds || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 120) return;
    cachedGraphToken = {
        cacheKey: buildConfigCacheKey(config),
        token,
        expiresAt: Date.now() + expiresInSeconds * 1000,
    };
}

function getTeamsConfig(): TeamsConfig | null {
    const tenantId = process.env.MS_TEAMS_TENANT_ID || process.env.MICROSOFT_TENANT_ID;
    const clientId = process.env.MS_TEAMS_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MS_TEAMS_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET;
    const scope = process.env.MS_TEAMS_GRAPH_SCOPE || process.env.MICROSOFT_GRAPH_SCOPE || 'https://graph.microsoft.com/.default';

    if (!tenantId || !clientId || !clientSecret) return null;
    return { tenantId, clientId, clientSecret, scope };
}

export function isTeamsConfigured(): boolean {
    return getTeamsConfig() !== null;
}

async function getGraphToken(config: TeamsConfig): Promise<string> {
    const cached = getCachedToken(config);
    if (cached) return cached;

    const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: config.scope,
        grant_type: 'client_credentials',
    });

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Falha ao autenticar no Graph: ${response.status} ${detail}`);
    }

    const payload = await response.json() as { access_token?: string; expires_in?: number | string };
    if (!payload.access_token) {
        throw new Error('Graph nao retornou access token');
    }

    const expiresIn =
        typeof payload.expires_in === 'number'
            ? payload.expires_in
            : Number.parseInt(String(payload.expires_in ?? ''), 10);
    cacheToken(config, payload.access_token, Number.isFinite(expiresIn) ? expiresIn : undefined);

    return payload.access_token;
}

async function fetchGraph(
    path: string,
    init: RequestInit = {}
): Promise<Response> {
    const config = getTeamsConfig();
    if (!config) {
        throw new Error('Integracao com Teams nao configurada');
    }

    const token = await getGraphToken(config);
    const headers = new Headers(init.headers || {});
    headers.set('authorization', `Bearer ${token}`);

    return fetch(`https://graph.microsoft.com/v1.0${path}`, {
        ...init,
        headers,
    });
}

function toUtcDate(value?: GraphDateTime): Date | null {
    if (!value?.dateTime) return null;

    const raw = value.dateTime.trim();
    if (!raw) return null;

    const hasOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw);
    const normalized = hasOffset ? raw : `${raw}Z`;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;

    return parsed;
}

function parseGraphEvent(payload: GraphEventPayload): TeamsEventPayload | null {
    if (!payload.id) return null;
    const meetingLink = payload.onlineMeeting?.joinUrl || payload.webLink || null;

    let lastModifiedAt: Date | null = null;
    if (payload.lastModifiedDateTime) {
        const parsed = new Date(payload.lastModifiedDateTime);
        if (!Number.isNaN(parsed.getTime())) {
            lastModifiedAt = parsed;
        }
    }

    return {
        externalEventId: payload.id,
        isCancelled: payload.isCancelled === true,
        startTime: toUtcDate(payload.start),
        endTime: toUtcDate(payload.end),
        meetingLink,
        lastModifiedAt,
    };
}

export async function createTeamsMeeting(params: CreateTeamsMeetingParams): Promise<TeamsMeetingPayload> {
    const response = await fetchGraph(`/users/${encodeURIComponent(params.organizerEmail)}/events`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            Prefer: 'outlook.timezone="UTC"',
        },
        body: JSON.stringify({
            subject: params.subject,
            body: {
                contentType: 'Text',
                content: params.description || '',
            },
            start: {
                dateTime: params.startTime.toISOString(),
                timeZone: 'UTC',
            },
            end: {
                dateTime: params.endTime.toISOString(),
                timeZone: 'UTC',
            },
            attendees: [
                {
                    emailAddress: {
                        address: params.leadEmail,
                        name: params.leadName,
                    },
                    type: 'required',
                },
            ],
            isOnlineMeeting: true,
            onlineMeetingProvider: 'teamsForBusiness',
        }),
    });

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Falha ao criar reuniao Teams: ${response.status} ${detail}`);
    }

    const payload = await response.json() as GraphEventPayload;
    if (!payload.id) {
        throw new Error('Graph retornou evento sem id');
    }

    const meetingLink = payload.onlineMeeting?.joinUrl || payload.webLink;
    if (!meetingLink) {
        throw new Error('Graph retornou evento sem link da reuniao');
    }

    return {
        externalEventId: payload.id,
        meetingLink,
        provider: 'teams',
    };
}

export async function getTeamsEvent(params: {
    organizerEmail: string;
    externalEventId: string;
}): Promise<TeamsEventPayload | null> {
    // Nota: O graphService atual não tem o parse exato do GraphEventPayload legado, 
    // mas para compatibilidade simples, podemos estender ou usar o client diretamente.
    // Como o webhook ainda usa isso, vamos manter a lógica de fetch ou delegar.

    // Para minimizar mudanças drásticas aqui e manter compatibilidade com o webhook legado:
    const response = await fetchGraph(
        `/users/${encodeURIComponent(params.organizerEmail)}/events/${encodeURIComponent(params.externalEventId)}?$select=id,isCancelled,start,end,webLink,onlineMeeting,lastModifiedDateTime`,
        {
            method: 'GET',
            headers: {
                Prefer: 'outlook.timezone="UTC"',
            },
        }
    );

    if (response.status === 404) return null;
    if (!response.ok) return null;

    const payload = await response.json() as GraphEventPayload;
    return parseGraphEvent(payload);
}

export async function cancelTeamsMeeting(params: {
    organizerEmail: string;
    externalEventId: string;
}): Promise<void> {
    const config = getTeamsConfig();
    if (!config) return;

    const response = await fetchGraph(
        `/users/${encodeURIComponent(params.organizerEmail)}/events/${encodeURIComponent(params.externalEventId)}`,
        { method: 'DELETE' }
    );

    if (response.status === 404) return;
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Falha ao cancelar reuniao Teams: ${response.status} ${detail}`);
    }
}

export async function createTeamsEventSubscription(
    params: CreateTeamsSubscriptionParams
): Promise<TeamsSubscriptionPayload> {
    const body = {
        changeType: 'created,updated,deleted',
        notificationUrl: params.notificationUrl,
        lifecycleNotificationUrl: params.lifecycleNotificationUrl || params.notificationUrl,
        resource: `/users/${params.organizerEmail}/events`,
        expirationDateTime: params.expirationDateTime,
        clientState: params.clientState,
    };

    const response = await fetchGraph('/subscriptions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Falha ao criar subscription Teams: ${response.status} ${detail}`);
    }

    const payload = await response.json() as TeamsSubscriptionPayload;
    if (!payload.id || !payload.resource || !payload.expirationDateTime) {
        throw new Error('Subscription Teams criada sem campos obrigatorios');
    }

    return payload;
}

export async function renewTeamsEventSubscription(params: {
    subscriptionId: string;
    expirationDateTime: string;
}): Promise<TeamsSubscriptionPayload | null> {
    const response = await fetchGraph(`/subscriptions/${encodeURIComponent(params.subscriptionId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expirationDateTime: params.expirationDateTime }),
    });

    if (response.status === 404) return null;
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Falha ao renovar subscription Teams: ${response.status} ${detail}`);
    }

    const payload = await response.json() as TeamsSubscriptionPayload;
    if (!payload.id || !payload.resource || !payload.expirationDateTime) {
        throw new Error('Subscription Teams renovada sem campos obrigatorios');
    }

    return payload;
}

export async function deleteTeamsSubscription(subscriptionId: string): Promise<void> {
    const config = getTeamsConfig();
    if (!config) return;

    const response = await fetchGraph(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: 'DELETE',
    });

    if (response.status === 404) return;
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Falha ao remover subscription Teams: ${response.status} ${detail}`);
    }
}
