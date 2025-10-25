"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Building2,
    Users,
    Settings,
    BarChart3,
    FileText,
    Shield
} from 'lucide-react';

const navigation = [
    {
        name: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutDashboard,
    },
    {
        name: 'Entreprises',
        href: '/admin/tenants',
        icon: Building2,
    },
    {
        name: 'Utilisateurs',
        href: '/admin/users',
        icon: Users,
    },
    {
        name: 'Plans',
        href: '/admin/plans',
        icon: Settings,
    },
    {
        name: 'Rapports',
        href: '/admin/reports',
        icon: BarChart3,
    },
    {
        name: 'Documents',
        href: '/admin/documents',
        icon: FileText,
    },
    {
        name: 'Sécurité',
        href: '/admin/security',
        icon: Shield,
    },
    {
        name: 'Paramètres',
        href: '/admin/settings',
        icon: Settings,
    },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
            <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            )}
                        >
                            <item.icon className={cn(
                                'h-5 w-5',
                                isActive ? 'text-blue-700' : 'text-gray-400'
                            )} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Section info système */}
            <div className="p-4 border-t border-gray-200 mt-auto">
                <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Système opérationnel</span>
                    </div>
                    <div>Version 1.0.0</div>
                </div>
            </div>
        </aside>
    );
}
