"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, Users, Settings, Receipt, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

// Liens visibles par tous (ordre 1..3)
const baseNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Produits & Stocks', href: '/products', icon: Package },
    { name: 'Ventes / Factures', href: '/sales/invoices', icon: Receipt },
];

export function TenantSidebar() {
    const pathname = usePathname();
    const [role, setRole] = useState<string | null>(null);
    const [allowedModules, setAllowedModules] = useState<string[]>([]);
    const [openPurchases, setOpenPurchases] = useState<boolean>(false);
    const [loaded, setLoaded] = useState<boolean>(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/tenant/me', { cache: 'no-store' });
                const data = await res.json();
                setRole(data.role || null);
                setAllowedModules(Array.isArray(data.allowedModules) ? data.allowedModules : []);
            } catch { setRole(null); }
            finally { setLoaded(true); }
        })();
    }, []);

    // N'afficher Utilisateurs/Paramètres/Journal que pour les admins
    const nav = role === 'admin'
        ? [
            ...baseNav,
            { name: 'Utilisateurs', href: '/members', icon: Users },
            { name: 'Paramètres', href: '/settings', icon: Settings },
            { name: 'Journal', href: '/journal', icon: FileText },
        ]
        : baseNav;

    // Ouvrir le groupe Achats si un sous-lien est actif
    useEffect(() => {
        if (pathname?.startsWith('/purchases/')) setOpenPurchases(true);
    }, [pathname]);

    // Eviter les erreurs d'hydratation: rendre après chargement client
    if (!loaded) {
        return (
            <aside className="w-64 bg-white border-r border-gray-200 h-full hidden md:flex flex-col" />
        );
    }

    // Contrôles d'affichage par modules
    const mods = new Set((allowedModules || []).map((m: any) => String(m).toLowerCase()));
    const showProducts = mods.has('produits_stocks');
    const showSales = mods.has('ventes');
    const showPurchases = mods.has('achats');
    return (
        <aside className="w-64 bg-white border-r border-gray-200 h-full hidden md:flex flex-col">
            <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                {/* 1) Les trois premiers: Dashboard, Produits, Ventes */}
                {nav
                    .slice(0, 3)
                    .filter((item) => {
                        if (item.href === '/products') return showProducts;
                        if (item.href === '/sales/invoices') return showSales;
                        return true; // Dashboard
                    })
                    .map((item) => {
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

                {/* 2) Groupe Achats (4ème position) */}
                {showPurchases && (
                    <div>
                        <button
                            type="button"
                            onClick={() => setOpenPurchases((v) => !v)}
                            className={cn(
                                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                pathname?.startsWith('/purchases/') ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            )}
                        >
                            <span className="flex items-center space-x-3">
                                <Receipt className={cn('h-5 w-5', pathname?.startsWith('/purchases/') ? 'text-blue-700' : 'text-gray-400')} />
                                <span>Achats</span>
                            </span>
                            {openPurchases ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        {openPurchases && (
                            <div className="mt-1 ml-6 space-y-1">
                                {[
                                    { name: 'Demandes de prix', href: '/purchases/rfq' },
                                    { name: "Commandes d'achat", href: '/purchases/orders' },
                                    { name: 'Réceptions', href: '/purchases/receipts' },
                                    { name: 'Factures fournisseurs', href: '/purchases/invoices' },
                                ].map((sub) => {
                                    const isActive = pathname === sub.href;
                                    return (
                                        <Link
                                            key={sub.name}
                                            href={sub.href}
                                            className={cn(
                                                'block px-3 py-2 rounded-lg text-sm transition-colors',
                                                isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                            )}
                                        >
                                            {sub.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* 3) Le reste des entrées */}
                {nav.slice(3).map((item) => {
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


