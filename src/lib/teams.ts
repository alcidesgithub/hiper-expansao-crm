interface TeamsConfig {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    scope: string;
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

function getTeamsConfig(): TeamsConfig | null {
    const tenantId = process.env.MS_TEAMS_TENANT_ID;
    const clientId = process.env.MS_TEAMS_CLIENT_ID;
    const clientSecret = process.env.MS_TEAMS_CLIENT_SECRET;
    const scope = process.env.MS_TEAMS_GRAPH_SCOPE || 'https://graph.microsoft.com/.default';

    if (!tenantId || !clientId || !clientSecret) return null;
    return { tenantId, clientId, clientSecret, scope };
}

export function isTeamsConfigured(): boolean {
    return getTeamsConfig() !== null;
}

async function getGraphToken(config: TeamsConfig): Promise<string> {
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

    const payload = await response.json() as { access_token?: string };
    if (!payload.access_token) {
        throw new Error('Graph não retornou access token');
    }

    return payload.access_token;
}

export async function createTeamsMeeting(params: CreateTeamsMeetingParams): Promise<TeamsMeetingPayload> {
    const config = getTeamsConfig();
    if (!config) {
        throw new Error('Integração com Teams não configurada');
    }

    const token = await getGraphToken(config);
    const payload = {
        subject: params.subject,
        body: {
            contentType: 'HTML',
            content: params.description || 'Reunião agendada pelo CRM Hiperfarma.',
        },
        start: {
            dateTime: params.startTime.toISOString(),
            timeZone: 'UTC',
        },
        end: {
            dateTime: params.endTime.toISOString(),
            timeZone: 'UTC',
        },
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness',
        attendees: [
            {
                emailAddress: {
                    address: params.leadEmail,
                    name: params.leadName,
                },
                type: 'required',
            },
        ],
    };

    const response = await fetch(
        `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(params.organizerEmail)}/events`,
        {
            method: 'POST',
            headers: {
                authorization: `Bearer ${token}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
        }
    );

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Falha ao criar evento Teams: ${response.status} ${detail}`);
    }

    const event = await response.json() as {
        id?: string;
        webLink?: string;
        onlineMeeting?: { joinUrl?: string };
    };

    const externalEventId = event.id;
    const meetingLink = event.onlineMeeting?.joinUrl || event.webLink;
    if (!externalEventId || !meetingLink) {
        throw new Error('Evento Teams criado sem id/link de reunião');
    }

    return {
        externalEventId,
        meetingLink,
        provider: 'teams',
    };
}

export async function cancelTeamsMeeting(params: {
    organizerEmail: string;
    externalEventId: string;
}): Promise<void> {
    const config = getTeamsConfig();
    if (!config) return;

    const token = await getGraphToken(config);
    const response = await fetch(
        `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(params.organizerEmail)}/events/${encodeURIComponent(params.externalEventId)}`,
        {
            method: 'DELETE',
            headers: {
                authorization: `Bearer ${token}`,
            },
        }
    );

    if (response.status === 404) return;
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Falha ao cancelar evento Teams: ${response.status} ${detail}`);
    }
}
