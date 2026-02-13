import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
    createTeamsEventSubscription,
    deleteTeamsSubscription,
    isTeamsConfigured,
    renewTeamsEventSubscription,
} from '@/lib/teams';

const SETTINGS_KEY = 'integrations.teams.subscriptions.v1';
const SUBSCRIPTION_TTL_MINUTES = 4000;
const SUBSCRIPTION_RENEW_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface StoredTeamsSubscription {
    id: string;
    organizerEmail: string;
    resource: string;
    expirationDateTime: string;
    updatedAt: string;
}

interface TeamsSubscriptionSettings {
    subscriptions: StoredTeamsSubscription[];
    lastSyncAt: string;
}

export interface TeamsSubscriptionSyncResult {
    created: number;
    renewed: number;
    removed: number;
    kept: number;
    failed: number;
    totalActiveOrganizers: number;
    subscriptions: StoredTeamsSubscription[];
    errors: string[];
}

function isObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseStoredSubscription(value: unknown): StoredTeamsSubscription | null {
    if (!isObject(value)) return null;

    const id = typeof value.id === 'string' ? value.id.trim() : '';
    const organizerEmail = typeof value.organizerEmail === 'string' ? value.organizerEmail.trim().toLowerCase() : '';
    const resource = typeof value.resource === 'string' ? value.resource.trim() : '';
    const expirationDateTime = typeof value.expirationDateTime === 'string' ? value.expirationDateTime.trim() : '';
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt.trim() : '';

    if (!id || !organizerEmail || !resource || !expirationDateTime || !updatedAt) return null;
    if (!organizerEmail.includes('@')) return null;

    return {
        id,
        organizerEmail,
        resource,
        expirationDateTime,
        updatedAt,
    };
}

function normalizeStoredSettings(value: unknown): TeamsSubscriptionSettings {
    if (!isObject(value)) {
        return { subscriptions: [], lastSyncAt: new Date(0).toISOString() };
    }

    const listRaw = Array.isArray(value.subscriptions) ? value.subscriptions : [];
    const subscriptions = listRaw
        .map((entry) => parseStoredSubscription(entry))
        .filter((entry): entry is StoredTeamsSubscription => entry !== null);

    const lastSyncAt = typeof value.lastSyncAt === 'string' && value.lastSyncAt
        ? value.lastSyncAt
        : new Date(0).toISOString();

    return { subscriptions, lastSyncAt };
}

function buildWebhookUrl(): string | null {
    const explicit = process.env.MS_TEAMS_WEBHOOK_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, '');

    const base = process.env.NEXTAUTH_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!base) return null;

    return `${base.replace(/\/$/, '')}/api/integrations/teams/webhook`;
}

export function getTeamsWebhookClientState(): string | null {
    const explicit = process.env.MS_TEAMS_WEBHOOK_CLIENT_STATE?.trim();
    if (explicit) return explicit;

    const fallback = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!fallback) return null;

    return fallback;
}

export function getTeamsSubscriptionConfig() {
    const webhookUrl = buildWebhookUrl();
    const clientState = getTeamsWebhookClientState();
    const configured = isTeamsConfigured() && Boolean(webhookUrl) && Boolean(clientState);

    return {
        configured,
        webhookUrl,
        hasClientState: Boolean(clientState),
    };
}

function buildSubscriptionExpirationDateTime(): string {
    return new Date(Date.now() + SUBSCRIPTION_TTL_MINUTES * 60 * 1000).toISOString();
}

function isExpiringSoon(expirationDateTime: string): boolean {
    const parsed = new Date(expirationDateTime);
    if (Number.isNaN(parsed.getTime())) return true;
    return parsed.getTime() - Date.now() <= SUBSCRIPTION_RENEW_WINDOW_MS;
}

async function loadStoredSettings(): Promise<TeamsSubscriptionSettings> {
    const row = await prisma.systemSettings.findUnique({
        where: { key: SETTINGS_KEY },
        select: { value: true },
    });

    return normalizeStoredSettings(row?.value);
}

async function saveStoredSettings(settings: TeamsSubscriptionSettings): Promise<void> {
    const value = {
        subscriptions: settings.subscriptions,
        lastSyncAt: settings.lastSyncAt,
    } as unknown as Prisma.InputJsonValue;

    await prisma.systemSettings.upsert({
        where: { key: SETTINGS_KEY },
        update: { value },
        create: { key: SETTINGS_KEY, value },
    });
}

export async function getStoredTeamsSubscriptions(): Promise<StoredTeamsSubscription[]> {
    const settings = await loadStoredSettings();
    return settings.subscriptions;
}

export async function syncTeamsEventSubscriptions(): Promise<TeamsSubscriptionSyncResult> {
    const config = getTeamsSubscriptionConfig();
    if (!config.configured || !config.webhookUrl) {
        throw new Error('Teams subscriptions nao configuradas. Defina MS_TEAMS_WEBHOOK_URL e MS_TEAMS_WEBHOOK_CLIENT_STATE.');
    }

    const clientState = getTeamsWebhookClientState();
    if (!clientState) {
        throw new Error('Client state ausente para Teams subscriptions.');
    }

    const [stored, activeOrganizers] = await Promise.all([
        loadStoredSettings(),
        prisma.user.findMany({
            where: {
                status: 'ACTIVE',
                role: { in: ['CONSULTANT'] },
                email: { contains: '@' },
            },
            select: { email: true },
            orderBy: { email: 'asc' },
        }),
    ]);

    const activeEmails = activeOrganizers
        .map((user) => user.email.toLowerCase().trim())
        .filter((email, index, list) => list.indexOf(email) === index);
    const activeSet = new Set(activeEmails);
    const storedByEmail = new Map(stored.subscriptions.map((item) => [item.organizerEmail, item]));

    const result: TeamsSubscriptionSyncResult = {
        created: 0,
        renewed: 0,
        removed: 0,
        kept: 0,
        failed: 0,
        totalActiveOrganizers: activeEmails.length,
        subscriptions: [],
        errors: [],
    };

    for (const email of activeEmails) {
        const existing = storedByEmail.get(email);
        const nowIso = new Date().toISOString();
        const expirationDateTime = buildSubscriptionExpirationDateTime();

        try {
            if (!existing) {
                const created = await createTeamsEventSubscription({
                    organizerEmail: email,
                    notificationUrl: config.webhookUrl,
                    clientState,
                    expirationDateTime,
                });
                result.subscriptions.push({
                    id: created.id,
                    organizerEmail: email,
                    resource: created.resource,
                    expirationDateTime: created.expirationDateTime,
                    updatedAt: nowIso,
                });
                result.created += 1;
                continue;
            }

            if (!isExpiringSoon(existing.expirationDateTime)) {
                result.subscriptions.push(existing);
                result.kept += 1;
                continue;
            }

            const renewed = await renewTeamsEventSubscription({
                subscriptionId: existing.id,
                expirationDateTime,
            });

            if (renewed) {
                result.subscriptions.push({
                    id: renewed.id,
                    organizerEmail: email,
                    resource: renewed.resource,
                    expirationDateTime: renewed.expirationDateTime,
                    updatedAt: nowIso,
                });
                result.renewed += 1;
                continue;
            }

            const recreated = await createTeamsEventSubscription({
                organizerEmail: email,
                notificationUrl: config.webhookUrl,
                clientState,
                expirationDateTime,
            });

            result.subscriptions.push({
                id: recreated.id,
                organizerEmail: email,
                resource: recreated.resource,
                expirationDateTime: recreated.expirationDateTime,
                updatedAt: nowIso,
            });
            result.created += 1;
        } catch (error) {
            result.failed += 1;
            result.errors.push(`${email}: ${error instanceof Error ? error.message : 'unknown error'}`);
            if (existing) {
                result.subscriptions.push(existing);
            }
        }
    }

    const staleSubscriptions = stored.subscriptions.filter((item) => !activeSet.has(item.organizerEmail));
    for (const stale of staleSubscriptions) {
        try {
            await deleteTeamsSubscription(stale.id);
        } catch {
            // best effort cleanup
        }
        result.removed += 1;
    }

    await saveStoredSettings({
        subscriptions: result.subscriptions,
        lastSyncAt: new Date().toISOString(),
    });

    return result;
}
