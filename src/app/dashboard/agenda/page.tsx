import React from 'react';
import { getAgendaInitialData } from '../actions';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import AgendaBoard from './AgendaBoardLoader';

export default async function AgendaPage() {
    const today = new Date();
    const startDate = startOfMonth(subMonths(today, 1));
    const endDate = endOfMonth(addMonths(today, 1));

    const { meetings, leads } = await getAgendaInitialData(startDate, endDate);

    const serializedMeetings = meetings.map(m => ({
        id: m.id,
        title: m.title,
        startTime: m.startTime.toISOString(),
        endTime: m.endTime.toISOString(),
        leadId: m.leadId,
        description: m.description,
        meetingType: m.meetingType,
        lead: m.lead,
        provider: m.provider,
        teamsJoinUrl: m.teamsJoinUrl,
        status: m.status,
    }));

    return (
        <AgendaBoard
            initialMeetings={serializedMeetings}
            leads={leads}
            initialRangeStart={startDate.toISOString()}
            initialRangeEnd={endDate.toISOString()}
        />
    );
}

