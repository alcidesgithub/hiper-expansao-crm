'use client';

import dynamic from 'next/dynamic';

const AgendaBoard = dynamic(() => import('./AgendaBoard'), {
    ssr: false,
    loading: () => <div>Carregando agenda...</div>,
});

export default AgendaBoard;
