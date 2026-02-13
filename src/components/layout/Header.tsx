'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, Search, Bell, ChevronDown, LogOut, User as UserIcon, X, Check } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { searchLeads, markNotificationAsRead, signOutAction } from '@/app/dashboard/actions';

interface HeaderProps {
    onMenuClick: () => void;
    user?: any;
    initialNotifications?: any[];
}

export function Header({ onMenuClick, user, initialNotifications = [] }: HeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const [notifications, setNotifications] = useState(initialNotifications);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const searchTimeoutRef = useRef<NodeJS.Timeout>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Initial notifications sync
    useEffect(() => {
        if (initialNotifications) {
            setNotifications(initialNotifications);
        }
    }, [initialNotifications]);

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (query.length >= 2) {
            setIsSearching(true);
            setIsSearchOpen(true);
            searchTimeoutRef.current = setTimeout(async () => {
                const results = await searchLeads(query);
                setSearchResults(results);
                setIsSearching(false);
            }, 500);
        } else {
            setSearchResults([]);
            setIsSearchOpen(false);
            setIsSearching(false);
        }
    };

    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        // Optimistic update
        setNotifications(prev => prev.filter(n => n.id !== id));
        await markNotificationAsRead(id);
    };

    const handleSignOut = async () => {
        await signOutAction();
    };

    const getPageTitle = () => {
        if (pathname === '/dashboard') return 'Visão Geral';
        if (pathname.startsWith('/dashboard/leads')) return 'Funil de Vendas';
        if (pathname.startsWith('/dashboard/agenda')) return 'Agenda';
        if (pathname.startsWith('/dashboard/config')) return 'Configurações';
        if (pathname.startsWith('/dashboard/relatorios')) return 'Analytics Pro';
        if (pathname.startsWith('/dashboard/usuarios')) return 'Gestão de Acesso';
        return 'Dashboard';
    };

    const unreadCount = notifications.length;

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 relative z-20">
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

            <div className="flex items-center gap-2 md:gap-4">
                {/* Search Bar */}
                <div className="hidden md:flex relative" ref={searchContainerRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar leads..."
                        value={searchQuery}
                        onChange={handleSearch}
                        onFocus={() => searchQuery.length >= 2 && setIsSearchOpen(true)}
                        className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/20 outline-none transition-all focus:w-80"
                    />

                    {/* Search Results Dropdown */}
                    {isSearchOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-100 py-2 w-80 max-h-96 overflow-y-auto">
                            {isSearching ? (
                                <div className="p-4 text-center text-sm text-gray-500">Buscando...</div>
                            ) : searchResults.length > 0 ? (
                                <div>
                                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Resultados</div>
                                    {searchResults.map(lead => (
                                        <Link
                                            key={lead.id}
                                            href={`/dashboard/leads/${lead.id}`}
                                            className="block px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                            onClick={() => setIsSearchOpen(false)}
                                        >
                                            <div className="font-medium text-gray-900">{lead.name}</div>
                                            <div className="text-xs text-gray-500 flex justify-between mt-1">
                                                <span>{lead.company || lead.email}</span>
                                                {lead.grade && (
                                                    <span className={`
                                                        px-1.5 py-0.5 rounded text-[10px] font-bold
                                                        ${lead.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                                            lead.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                                                lead.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-gray-100 text-gray-700'}
                                                    `}>
                                                        {lead.grade}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-sm text-gray-500">Nenhum resultado encontrado.</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <div className="relative" ref={notificationsRef}>
                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
                        )}
                    </button>

                    {isNotificationsOpen && (
                        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-semibold text-sm text-gray-900">Notificações</h3>
                                {unreadCount > 0 && (
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                                        {unreadCount} novas
                                    </span>
                                )}
                            </div>

                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 relative group transition-colors"
                                        >
                                            <div className="pr-8">
                                                <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
                                                <p className="text-[10px] text-gray-400 mt-2">
                                                    {new Date(notification.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                                title="Marcar como lida"
                                            >
                                                <Check size={14} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center">
                                        <Bell className="mx-auto h-8 w-8 text-gray-200 mb-2" />
                                        <p className="text-sm text-gray-500">Nenhuma notificação nova</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-px bg-gray-200 mx-1" />

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition-colors"
                    >
                        {user?.avatar ? (
                            <Image
                                src={user.avatar}
                                alt="Profile"
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-bold text-xs">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                        )}
                        <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                            {user?.name || 'Usuário'}
                        </span>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isUserMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-1 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>

                            <div className="py-1">
                                <Link
                                    href="/dashboard/profile"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                                    onClick={() => setIsUserMenuOpen(false)}
                                >
                                    <UserIcon size={16} />
                                    Meu Perfil
                                </Link>
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                                >
                                    <LogOut size={16} />
                                    Sair do Sistema
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

