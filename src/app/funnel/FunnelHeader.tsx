'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';

export function FunnelHeader() {
    const pathname = usePathname();
    const isGate = pathname === '/funnel/gate';

    if (isGate) {
        return (
            <header className="bg-white border-b border-gray-200 py-6 px-6 md:px-12 flex justify-center items-center sticky top-0 z-50">
                <Logo height={40} />
            </header>
        );
    }

    return (
        <header className="bg-white border-b border-gray-200 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
            <div className="flex items-center gap-2">
                <Logo height={32} />
                <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>
                <span className="font-bold text-lg text-secondary tracking-tight hidden md:inline">Expansão</span>
            </div>
            <div className="text-xs md:text-sm text-gray-500 font-medium">
                Processo de qualificação digital
            </div>
        </header>
    );
}
