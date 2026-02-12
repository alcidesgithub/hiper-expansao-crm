'use client';

import React from 'react';
import Image from 'next/image';
import { Menu, Search, Bell, ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface HeaderProps {
    onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    const pathname = usePathname();

    const getPageTitle = () => {
        if (pathname === '/dashboard') return 'Visão Geral';
        if (pathname.startsWith('/dashboard/leads')) return 'Funil de Vendas';
        if (pathname.startsWith('/dashboard/agenda')) return 'Agenda';
        if (pathname.startsWith('/dashboard/config')) return 'Configurações';
        if (pathname.startsWith('/dashboard/relatorios')) return 'Analytics Pro';
        if (pathname.startsWith('/dashboard/usuarios')) return 'Gestão de Acesso';
        return 'Dashboard';
    };

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                    <Menu size={24} />
                </button>
                <h1 className="text-xl font-bold text-gray-800 hidden sm:block">
                    {getPageTitle()}
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden md:flex relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                </div>

                <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                </button>

                <div className="h-8 w-px bg-gray-200 mx-1" />

                <button className="flex items-center gap-2">
                    <Image
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrS3KDcRAElWPePn7USGvrhdHgJWr--E0m1Eg96fh2QjjkwTRI_woJpolEcuXjSf5p6IViMoCfmeXJBLKGi-Ql6JhEcnpU5bbX38vte0c7HWKQJhFLRTgbx42JEFdSMHRZUe-37PWtsSbcQjnEaKpHPAozd2SUY7-YGtMpI75Wgxpx-WGlRvj-UQdtPRLzC0UPu1NHn4xcxPqyYgL5y5NbeDoIWEhy0RUlAHpSaFVIoUS4zLrmV8UuVWDpldb4t_RKRAZ3lwXBKO4"
                        alt="Profile"
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full border border-gray-200"
                    />
                    <span className="hidden md:block text-sm font-medium text-gray-700">Ricardo Mendes</span>
                    <ChevronDown size={16} className="text-gray-400" />
                </button>
            </div>
        </header>
    );
}
