import React, { Suspense } from 'react';
import { getMeetings, getLeadsForSelect } from '../actions';
import AgendaBoard from './AgendaBoard';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

export default async function AgendaPage() {
    // Fetch initial data for the current month +/- 1 month to allow some navigation without immediate refetch
    // In a real app we might want to fetch on demand via server actions or API as the user navigates.
    // For this MVP, fetching a 3-month window around "today" is a good balance.

    const today = new Date();
    const startDate = startOfMonth(subMonths(today, 1));
    const endDate = endOfMonth(addMonths(today, 1));

    const [meetings, leads] = await Promise.all([
        getMeetings(startDate, endDate),
        getLeadsForSelect()
    ]);

    // We need to serialize the dates because Client Components generally don't like Date objects passed directly from Server Components
    // However, in Next.js 13+ with SC, it strictly serializes. 
    // Prisma returns Date objects. We might need to map them to strings or rely on Next.js serialization if it handles it (it usually warns).
    // Let's pass them as is and see if Next.js complains (it likely will). 
    // Safest bet is to plain object them or let the client component parse strings.
    // For simplicity, let's assume standard passing works or just map dates to ISO strings.
    const serializedMeetings = meetings.map(m => ({
        ...m,
        startTime: m.startTime.toISOString(),
        endTime: m.endTime.toISOString(),
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        completedAt: m.completedAt?.toISOString(),
        cancelledAt: m.cancelledAt?.toISOString()
    }));

    return (
        <Suspense fallback={<div>Carregando agenda...</div>}>
            <AgendaBoard
                initialMeetings={serializedMeetings}
                leads={leads}
            />
        </Suspense>
    );
}

