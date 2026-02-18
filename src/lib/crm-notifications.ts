import { UserRole } from '@prisma/client';
import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

export interface CrmNotificationPayload {
    title: string;
    message: string;
    link?: string;
    type?: 'info' | 'success' | 'warning' | 'error' | string;
    emailSubject?: string;
    sendEmail?: boolean;
}

interface NotificationUser {
    id: string;
    email: string;
    name: string;
}

function escapeHtml(value: unknown): string {
    const text = value == null ? '' : String(value);
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function resolveAppUrl(): string | null {
    const value = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
    if (!value) return null;
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.toString().replace(/\/$/, '');
    } catch {
        return null;
    }
}

function normalizeLink(link?: string): string | null {
    if (!link) return null;
    const trimmed = link.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (!trimmed.startsWith('/')) return null;
    const appUrl = resolveAppUrl();
    if (!appUrl) return null;
    return `${appUrl}${trimmed}`;
}

function renderEmailHtml(userName: string, payload: CrmNotificationPayload): string {
    const link = normalizeLink(payload.link);
    return `
<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
  <p>Olá ${escapeHtml(userName)},</p>
  <h2 style="margin:0 0 12px 0;color:#114F99">${escapeHtml(payload.title)}</h2>
  <p style="margin:0 0 16px 0">${escapeHtml(payload.message)}</p>
  ${link ? `<p style="margin:0 0 16px 0"><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#DF362D;color:#fff;text-decoration:none;font-weight:600">Abrir no CRM</a></p>` : ''}
  <p style="margin:0;color:#64748b;font-size:12px">Expansão Hiperfarma CRM</p>
</div>
`.trim();
}

export async function createInAppNotifications(userIds: string[], payload: CrmNotificationPayload): Promise<void> {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (!uniqueUserIds.length) return;

    await prisma.notification.createMany({
        data: uniqueUserIds.map((userId) => ({
            userId,
            title: payload.title,
            message: payload.message,
            link: payload.link || null,
            type: payload.type || 'info',
        })),
    });
}

async function sendEmails(users: NotificationUser[], payload: CrmNotificationPayload): Promise<void> {
    if (!payload.sendEmail) return;
    await Promise.all(
        users.map((user) =>
            sendEmail({
                to: user.email,
                subject: payload.emailSubject || payload.title,
                html: renderEmailHtml(user.name || 'Time', payload),
            })
        )
    );
}

export async function notifyUsers(users: NotificationUser[], payload: CrmNotificationPayload): Promise<void> {
    if (!users.length) return;
    await createInAppNotifications(users.map((user) => user.id), payload);
    await sendEmails(users, { ...payload, sendEmail: payload.sendEmail ?? true });
}

export async function notifyActiveManagers(payload: CrmNotificationPayload): Promise<void> {
    const managers = await prisma.user.findMany({
        where: {
            status: 'ACTIVE',
            role: 'MANAGER',
            email: { contains: '@' },
        },
        select: { id: true, email: true, name: true },
    });

    await notifyUsers(managers, payload);
}

export async function notifyAssignableUser(
    userId: string | null | undefined,
    payload: CrmNotificationPayload
): Promise<void> {
    if (!userId) return;
    const user = await prisma.user.findFirst({
        where: {
            id: userId,
            status: 'ACTIVE',
            role: { in: ['CONSULTANT', 'MANAGER'] as UserRole[] },
            email: { contains: '@' },
        },
        select: { id: true, email: true, name: true },
    });

    if (!user) return;
    await notifyUsers([user], payload);
}
