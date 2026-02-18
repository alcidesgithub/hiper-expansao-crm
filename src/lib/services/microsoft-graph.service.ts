import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { Event, OnlineMeeting } from '@microsoft/microsoft-graph-types';
import 'isomorphic-fetch';

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
        const tenantId = process.env.MS_TEAMS_TENANT_ID || process.env.MICROSOFT_TENANT_ID;
        const clientId = process.env.MS_TEAMS_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MS_TEAMS_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET;
        return Boolean(tenantId && clientId && clientSecret);
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
            const client = this.getClient();
            const event = {
                subject: params.subject,
                start: {
                    dateTime: params.startDateTime.toISOString(),
                    timeZone: 'America/Sao_Paulo',
                },
                end: {
                    dateTime: params.endDateTime.toISOString(),
                    timeZone: 'America/Sao_Paulo',
                },
                body: {
                    contentType: 'HTML' as const,
                    content: this.buildEventBody(params),
                },
                attendees: [
                    {
                        emailAddress: {
                            address: params.leadEmail,
                            name: params.leadName,
                        },
                        type: 'required' as const,
                    },
                ],
                isOnlineMeeting: true,
                onlineMeetingProvider: 'teamsForBusiness' as const,
                allowNewTimeProposals: true,
            };

            return await client
                .api(`/users/${encodeURIComponent(params.consultantEmail)}/calendar/events`)
                .post(event);
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
            const client = this.getClient();
            await client
                .api(`/users/${encodeURIComponent(consultantEmail)}/calendar/events/${encodeURIComponent(eventId)}`)
                .delete();
        } catch (error) {
            console.error('Error cancelling event:', error);
            throw new Error(`Failed to cancel event: ${error}`);
        }
    }

    private buildEventBody(params: {
        leadName: string;
        leadEmail: string;
        leadPhone?: string;
        description?: string;
    }): string {
        const leadDescription = params.description
            ? `<p><strong>Observacoes:</strong> ${params.description}</p>`
            : '';

        return `
      <div style="font-family: Arial, sans-serif;">
        <h2>Reuniao de Apresentacao Hiperfarma</h2>
        
        <h3>Informacoes do Lead:</h3>
        <ul>
          <li><strong>Nome:</strong> ${params.leadName}</li>
          <li><strong>Email:</strong> ${params.leadEmail}</li>
          ${params.leadPhone ? `<li><strong>Telefone:</strong> ${params.leadPhone}</li>` : ''}
        </ul>

        ${leadDescription}

        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          O convite do Outlook/Teams contera automaticamente o botao para entrada na reuniao.
        </p>
      </div>
    `;
    }
}

export const graphService = new MicrosoftGraphService();
