'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function searchLeads(query: string) {
    const session = await auth();
    if (!session?.user) return [];

    if (!query || query.length < 2) return [];

    try {
        const leads = await prisma.lead.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { company: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                company: true,
                phone: true,
                grade: true,
            },
            take: 5,
        });
        return leads;
    } catch (error) {
        console.error('Error searching leads:', error);
        return [];
    }
}

export async function getNotifications() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: session.user.id,
                read: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 10,
        });
        return notifications;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

export async function markNotificationAsRead(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false };

    try {
        await prisma.notification.update({
            where: {
                id,
                userId: session.user.id,
            },
            data: {
                read: true,
            },
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return { success: false };
    }
}

export async function markAllNotificationsAsRead() {
    const session = await auth();
    if (!session?.user?.id) return { success: false };

    try {
        await prisma.notification.updateMany({
            where: {
                userId: session.user.id,
                read: false,
            },
            data: {
                read: true,
            },
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return { success: false };
    }
}

export async function getCurrentUser() {
    const session = await auth();
    return session?.user;
}

export async function signOutAction() {
    const { signOut } = await import('@/auth');
    await signOut();
}
