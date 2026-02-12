import { DashboardShell } from "@/components/layout/DashboardShell";
import { auth } from '@/auth';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const userRole = (session?.user as { role?: string } | undefined)?.role ?? null;

    return <DashboardShell userRole={userRole}>{children}</DashboardShell>;
}
