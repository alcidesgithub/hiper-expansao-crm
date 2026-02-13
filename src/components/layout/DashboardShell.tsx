'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardShellProps {
    children: React.ReactNode;
    userRole?: string | null;
    user?: any;
    initialNotifications?: any[];
}

export function DashboardShell({ children, userRole, user, initialNotifications }: DashboardShellProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} userRole={userRole} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header
                    onMenuClick={() => setIsSidebarOpen(true)}
                    user={user}
                    initialNotifications={initialNotifications}
                />
                <main className="flex-1 overflow-auto p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
