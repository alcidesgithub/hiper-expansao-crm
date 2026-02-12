import React from 'react';
import Image from 'next/image';

export default function FunnelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white border-b border-gray-200 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <Image src="/logo.svg" alt="HiperFarma" width={120} height={32} className="h-8 w-auto" priority />
                    <span className="font-bold text-xl text-primary hidden md:inline">Expansão</span>
                </div>
                <div className="text-xs md:text-sm text-gray-500 font-medium">
                    Processo de qualificação digital
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
                <div className="w-full max-w-2xl">
                    {children}
                </div>
            </main>

            <footer className="py-6 text-center text-xs text-gray-400">
                &copy; 2026 HiperFarma. Todos os direitos reservados.
            </footer>
        </div>
    );
}
