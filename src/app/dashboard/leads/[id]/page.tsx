
import React from 'react';
import { notFound } from 'next/navigation';
import { getLeadById } from '@/app/dashboard/actions';
import LeadDetailClient from './LeadDetailClient';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: PageProps) {
    const { id } = await params;
    const lead = await getLeadById(id);

    if (!lead) {
        notFound();
    }

    // Serializable data optimization if needed, but for now passing directly
    // JSON.parse(JSON.stringify(lead)) might be needed if Date objects cause issues in some Next.js versions with Client Components
    // But usually in Server -> Client it handles Dates fine in recent versions or warns. 
    // We will pass it as is.

    return <LeadDetailClient lead={lead} />;
}
