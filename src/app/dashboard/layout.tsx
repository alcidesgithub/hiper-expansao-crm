import { DashboardShell } from "@/components/layout/DashboardShell";
import { getDashboardLayoutData } from "./actions";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/AuthProvider";

export const metadata: Metadata = {
    title: "HiperFarma CRM - Expansão",
    description: "Sistema de gestão de expansão e relacionamento.",
};

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, notifications } = await getDashboardLayoutData();
    const userRole = (user as { role?: string } | undefined)?.role ?? null;

    return (
        <AuthProvider>
            <DashboardShell
                userRole={userRole}
                user={user}
                initialNotifications={notifications}
            >
                {children}
            </DashboardShell>
        </AuthProvider>
    );
}
