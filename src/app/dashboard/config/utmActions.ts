'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';


export interface UtmLinkFormData {
    name: string;
    url: string;
    utmSource: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
}

function buildFullUrl(data: UtmLinkFormData): string {
    const url = new URL(data.url);
    url.searchParams.set('utm_source', data.utmSource);
    if (data.utmMedium) url.searchParams.set('utm_medium', data.utmMedium);
    if (data.utmCampaign) url.searchParams.set('utm_campaign', data.utmCampaign);
    if (data.utmTerm) url.searchParams.set('utm_term', data.utmTerm);
    if (data.utmContent) url.searchParams.set('utm_content', data.utmContent);
    return url.toString();
}

export async function createUtmLink(data: UtmLinkFormData) {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    // Only admins can create UTM Links based on user request.
    if (session.user.role !== 'ADMIN') throw new Error('Forbidden: Only Admins can manage UTM links.');

    const fullUrl = buildFullUrl(data);

    try {
        const link = await prisma.utmLink.create({
            data: {
                name: data.name,
                url: data.url,
                utmSource: data.utmSource,
                utmMedium: data.utmMedium,
                utmCampaign: data.utmCampaign,
                utmTerm: data.utmTerm,
                utmContent: data.utmContent,
                fullUrl,
                createdBy: session.user.id,
            },
        });

        revalidatePath('/dashboard/config');
        return { success: true, link };
    } catch (error) {
        console.error('Error creating UTM link:', error);
        return { success: false, error: 'Failed to create UTM link' };
    }
}

export async function getUtmLinks() {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    if (session.user.role !== 'ADMIN') throw new Error('Forbidden: Only Admins can manage UTM links.');

    try {
        const links = await prisma.utmLink.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { name: true }
                }
            }
        });
        return links;
    } catch (error) {
        console.error('Error fetching UTM links:', error);
        return [];
    }
}

export async function deleteUtmLink(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    if (session.user.role !== 'ADMIN') throw new Error('Forbidden: Only Admins can manage UTM links.');

    try {
        await prisma.utmLink.delete({
            where: { id },
        });
        revalidatePath('/dashboard/config');
        return { success: true };
    } catch (error) {
        console.error('Error deleting UTM link:', error);
        return { success: false, error: 'Failed to delete UTM link' };
    }
}
