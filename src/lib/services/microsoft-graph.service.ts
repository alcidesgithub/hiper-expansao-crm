import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { Event, OnlineMeeting } from '@microsoft/microsoft-graph-types';
import 'isomorphic-fetch';
import { cancelTeamsMeeting, createTeamsMeeting, isTeamsConfigured } from '@/lib/teams';

export class MicrosoftGraphService {
    private _client: Client | null = null;

    private getClient(): Client {
        if (this._client) return this._client;

        const tenantId = process.env.MS_TEAMS_TENANT_ID || process.env.MICROSOFT_TENANT_ID;
        const clientId = process.env.MS_TEAMS_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MS_TEAMS_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET;
        const scope = process.env.MS_TEAMS_GRAPH_SCOPE || process.env.MICROSOFT_GRAPH_SCOPE || 'https://graph.microsoft.com/.default';

        if (!tenantId || !clientId || !clientSecret) {
            throw new Error('Microsoft Graph credentials missing');
        }

        const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        const authProvider = new TokenCredentialAuthenticationProvider(credential, {
            scopes: [scope],
        });

        this._client = Client.initWithMiddleware({ authProvider });
        return this._client;
    }

    public isConfigured(): boolean {
        return isTeamsConfigured();
    }

    async createOnlineMeeting(params: {
        subject: string;
        startDateTime: Date;
        endDateTime: Date;
        organizerEmail: string;
    }): Promise<OnlineMeeting> {
        try {
            const client = this.getClient();
            const meetingBody = {
                startDateTime: params.startDateTime.toISOString(),
                endDateTime: params.endDateTime.toISOString(),
                subject: params.subject,
            };

            return await client
                .api(`/users/${encodeURIComponent(params.organizerEmail)}/onlineMeetings`)
                .post(meetingBody);
        } catch (error) {
            console.error('Error creating online meeting:', error);
            throw new Error(`Failed to create Teams meeting: ${error}`);
        }
    }

    async createCalendarEvent(params: {
        consultantEmail: string;
        subject: string;
        startDateTime: Date;
        endDateTime: Date;
        leadName: string;
        leadEmail: string;
        leadPhone?: string;
        description?: string;
    }): Promise<Event> {
        try {
            const created = await createTeamsMeeting({
                organizerEmail: params.consultantEmail,
                leadEmail: params.leadEmail,
                leadName: params.leadName,
                subject: params.subject,
                description: this.buildMeetingDescription(params),
                startTime: params.startDateTime,
                endTime: params.endDateTime,
            });

            return {
                id: created.externalEventId,
                onlineMeeting: {
                    joinUrl: created.meetingLink,
                },
                webLink: created.meetingLink,
            } as Event;
        } catch (error) {
            console.error('Error creating calendar event:', error);
            throw new Error(`Failed to create calendar event: ${error}`);
        }
    }

    async cancelOnlineMeeting(
        consultantEmail: string,
        meetingId: string
    ): Promise<void> {
        try {
            const client = this.getClient();
            await client
                .api(`/users/${encodeURIComponent(consultantEmail)}/onlineMeetings/${encodeURIComponent(meetingId)}`)
                .delete();
        } catch (error) {
            console.error('Error cancelling meeting:', error);
            throw new Error(`Failed to cancel meeting: ${error}`);
        }
    }

    async cancelCalendarEvent(
        consultantEmail: string,
        eventId: string
    ): Promise<void> {
        try {
            await cancelTeamsMeeting({
                organizerEmail: consultantEmail,
                externalEventId: eventId,
            });
        } catch (error) {
            console.error('Error cancelling event:', error);
            throw new Error(`Failed to cancel event: ${error}`);
        }
    }

    private buildMeetingDescription(params: {
        leadName: string;
        leadEmail: string;
        leadPhone?: string;
        description?: string;
    }): string {
        const lines = [
            'Reuniao de Apresentacao Hiperfarma',
            '',
            `Nome: ${params.leadName}`,
            `Email: ${params.leadEmail}`,
        ];

        if (params.leadPhone) {
            lines.push(`Telefone: ${params.leadPhone}`);
        }
        if (params.description) {
            lines.push('');
            lines.push(`Observacoes: ${params.description}`);
        }

        return lines.join('\n');
    }
}

export const graphService = new MicrosoftGraphService();
