'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Calendar as CalendarIcon,
    Settings,
    BarChart3,
    FileText,
    Home,
    LogOut,
    UserCog,
    DollarSign,
    ShieldCheck,
} from 'lucide-react';
import { signOutAction } from '@/app/dashboard/actions';

type AppRole = 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'CONSULTANT';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    userRole?: string | null;
}

interface NavItem {
    href: string;
    icon: React.ReactNode;
    label: string;
    roles?: readonly AppRole[];
}

const NAV_ITEMS: readonly NavItem[] = [
    { href: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', roles: ['ADMIN', 'DIRECTOR', 'MANAGER'] },
    { href: '/dashboard/leads', icon: <Users size={20} />, label: 'Leads CRM', roles: ['ADMIN', 'DIRECTOR', 'MANAGER', 'CONSULTANT'] },
    { href: '/dashboard/agenda', icon: <CalendarIcon size={20} />, label: 'Agenda', roles: ['ADMIN', 'DIRECTOR', 'MANAGER', 'CONSULTANT'] },
    { href: '/dashboard/disponibilidade', icon: <CalendarIcon size={20} />, label: 'Disponibilidade', roles: ['ADMIN', 'CONSULTANT'] },
    { href: '/dashboard/relatorios', icon: <BarChart3 size={20} />, label: 'Relatórios', roles: ['ADMIN', 'DIRECTOR', 'MANAGER'] },
    { href: '/dashboard/usuarios', icon: <UserCog size={20} />, label: 'Gestão de Usuários', roles: ['ADMIN'] },
    { href: '/dashboard/pricing', icon: <DollarSign size={20} />, label: 'Mensalidades', roles: ['ADMIN', 'DIRECTOR', 'MANAGER'] },
    { href: '/dashboard/config', icon: <Settings size={20} />, label: 'Configurações', roles: ['ADMIN'] },
    { href: '/dashboard/admin/settings/permissions', icon: <ShieldCheck size={20} />, label: 'Permissões', roles: ['ADMIN'] },
    { href: '/dashboard/documentacao', icon: <FileText size={20} />, label: 'Documentação', roles: ['ADMIN', 'DIRECTOR', 'MANAGER', 'CONSULTANT'] },
];

function isAppRole(role: string | null | undefined): role is AppRole {
    return role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER' || role === 'CONSULTANT';
}

export function Sidebar({ isOpen, onClose, userRole }: SidebarProps) {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;
    const normalizedRole = isAppRole(userRole) ? userRole : null;
    const allowedNavItems = NAV_ITEMS.filter((item) => {
        if (!item.roles) return true;
        return normalizedRole ? item.roles.includes(normalizedRole) : false;
    });

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={`
                    fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                <div className="flex items-center h-16 px-6 border-b border-gray-100">
                    <Logo height={32} />
                </div>

                <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
                    {allowedNavItems.map((item) => (
                        <NavButton
                            key={item.href}
                            href={item.href}
                            active={isActive(item.href)}
                            icon={item.icon}
                            label={item.label}
                            onClick={onClose}
                        />
                    ))}

                    <div className="pt-8 mt-8 border-t border-gray-100">
                        <NavButton href="/" active={false} icon={<Home size={20} />} label="Voltar ao Site" onClick={onClose} />
                        <NavButton
                            href="#"
                            active={false}
                            icon={<LogOut size={20} />}
                            label="Sair"
                            onClick={async () => {
                                onClose();
                                await signOutAction();
                            }}
                        />
                    </div>
                </nav>
            </aside>
        </>
    );
}

interface NavButtonProps {
    href: string;
    active: boolean;
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
}

const NavButton = ({ href, active, icon, label, onClick }: NavButtonProps) => {
    const content = (
        <>
            {icon}
            <span>{label}</span>
        </>
    );

    const className = `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active
        ? 'bg-primary/10 text-primary font-medium'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`;

    if (href === '#') {
        return (
            <button onClick={onClick} className={className}>
                {content}
            </button>
        );
    }

    return (
        <Link href={href} onClick={onClick} className={className}>
            {content}
        </Link>
    );
};

