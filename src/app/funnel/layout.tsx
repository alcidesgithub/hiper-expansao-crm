import React from 'react';
import { FunnelHeader } from './FunnelHeader';

export default function FunnelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <FunnelHeader />

            <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
                <div className="w-full max-w-2xl">
                    {children}
                </div>
            </main>

            <footer className="py-6 text-center text-xs text-gray-400">
                &copy; {new Date().getFullYear()} Hiperfarma. Todos os direitos reservados.
            </footer>
        </div >
    );
}
