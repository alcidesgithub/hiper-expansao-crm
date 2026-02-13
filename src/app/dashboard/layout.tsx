import { DashboardShell } from "@/components/layout/DashboardShell";
import { getCurrentUser, getNotifications } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "HiperFarma CRM - Expansão",
    description: "Sistema de gestão de expansão e relacionamento.",
};

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();
    const notifications = await getNotifications();
    const userRole = (user as { role?: string } | undefined)?.role ?? null;

    return (
        <DashboardShell
            userRole={userRole}
            user={user}
            initialNotifications={notifications}
        >
            {children}
        </DashboardShell>
    );
}
