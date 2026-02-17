'use client';

import dynamic from 'next/dynamic';

const KanbanBoard = dynamic(() => import('./KanbanBoard'), {
    ssr: false,
    loading: () => <div>Carregando pipeline...</div>,
});

export default KanbanBoard;
