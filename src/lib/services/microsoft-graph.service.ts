import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { OnlineMeeting, Event } from '@microsoft/microsoft-graph-types';
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

        const credential = new ClientSecretCredential(
            tenantId,
            clientId,
            clientSecret
        );

        const authProvider = new TokenCredentialAuthenticationProvider(credential, {
            scopes: [scope],
        });

        this._client = Client.initWithMiddleware({ authProvider });
        return this._client;
    }

    /**
     * Cria reunião online do Teams
     */
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

            const meeting = await client
                .api(`/users/${encodeURIComponent(params.organizerEmail)}/onlineMeetings`)
                .post(meetingBody);

            return meeting;
        } catch (error) {
            console.error('Error creating online meeting:', error);
            throw new Error(`Failed to create Teams meeting: ${error}`);
        }
    }

    /**
     * Cria evento no calendário do consultor com link da reunião
     */
    async createCalendarEvent(params: {
        consultantEmail: string;
        subject: string;
        startDateTime: Date;
        endDateTime: Date;
        joinUrl: string;
        leadName: string;
        leadEmail: string;
        leadPhone?: string;
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
                onlineMeetingUrl: params.joinUrl,
                onlineMeetingProvider: 'teamsForBusiness' as const,
            };

            const createdEvent = await client
                .api(`/users/${encodeURIComponent(params.consultantEmail)}/calendar/events`)
                .post(event);

            return createdEvent;
        } catch (error) {
            console.error('Error creating calendar event:', error);
            throw new Error(`Failed to create calendar event: ${error}`);
        }
    }

    /**
     * Cancela reunião online
     */
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

    /**
     * Cancela evento do calendário
     */
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

    /**
     * Monta corpo do email do evento
     */
    private buildEventBody(params: {
        leadName: string;
        leadEmail: string;
        leadPhone?: string;
        joinUrl: string;
    }): string {
        return `
      <div style="font-family: Arial, sans-serif;">
        <h2>Reunião de Apresentação Hiperfarma</h2>
        
        <h3>Informações do Lead:</h3>
        <ul>
          <li><strong>Nome:</strong> ${params.leadName}</li>
          <li><strong>Email:</strong> ${params.leadEmail}</li>
          ${params.leadPhone ? `<li><strong>Telefone:</strong> ${params.leadPhone}</li>` : ''}
        </ul>

        <h3>Link da Reunião:</h3>
        <p>
          <a href="${params.joinUrl}" style="
            display: inline-block;
            background-color: #0078d4;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            text-align: center;
          ">Participar da Reunião Teams</a>
        </p>

        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Este lead foi pré-qualificado pelo sistema e possui capacidade financeira validada.
        </p>
      </div>
    `;
    }
}

// Singleton instance
export const graphService = new MicrosoftGraphService();
