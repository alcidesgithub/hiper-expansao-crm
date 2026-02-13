import React from 'react';
import { getKanbanData } from '../actions';
import KanbanBoard from './KanbanBoard';

export const dynamic = 'force-dynamic';

export default async function KanbanPage() {
    const { stages, leads, permissions } = await getKanbanData();

    return (
        <KanbanBoard
            initialStages={stages}
            initialLeads={leads}
            permissions={permissions}
        />
    );
}
