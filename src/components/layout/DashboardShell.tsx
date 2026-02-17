'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { HeaderNotification } from './Header';

interface DashboardShellUser {
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
}

interface DashboardShellProps {
    children: React.ReactNode;
    userRole?: string | null;
    user?: DashboardShellUser;
    initialNotifications?: HeaderNotification[];
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
