"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, Boxes, Users, Settings, Receipt } from 'lucide-react';

const nav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Produits & Stocks', href: '/products', icon: Package },
    { name: 'Ventes / Factures', href: '/sales/invoices', icon: Receipt },
    { name: 'Catégories', href: '/categories', icon: Boxes },
    { name: 'Utilisateurs', href: '/members', icon: Users },
    { name: 'Paramètres', href: '/settings', icon: Settings },
];

export function TenantSidebar() {
    const pathname = usePathname();
    return (
        <aside className="w-64 bg-white border-r border-gray-200 h-full hidden md:flex flex-col">
            <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                {nav.map((item) => {
                    const ActiveIcon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            )}
                        >
                            <ActiveIcon className={cn('h-5 w-5', isActive ? 'text-blue-700' : 'text-gray-400')} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
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


