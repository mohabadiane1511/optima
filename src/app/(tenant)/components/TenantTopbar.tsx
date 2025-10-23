"use client";

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Search, Bell, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

export function TenantTopbar() {
    const [profile, setProfile] = useState<{ firstName: string; lastName: string; email: string } | null>(null);
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [pRes, rRes] = await Promise.all([
                    fetch('/api/tenant/me/profile', { cache: 'no-store' }),
                    fetch('/api/tenant/me', { cache: 'no-store' }),
                ]);
                if (pRes.ok) {
                    const p = await pRes.json();
                    setProfile({ firstName: p.firstName || '', lastName: p.lastName || '', email: p.email || '' });
                }
                if (rRes.ok) {
                    const r = await rRes.json();
                    setRole(r?.role || null);
                }
            } catch { }
        })();
    }, []);

    const initials = useMemo(() => {
        const f = profile?.firstName?.trim?.() || '';
        const l = profile?.lastName?.trim?.() || '';
        const i1 = f ? f[0].toUpperCase() : '';
        const i2 = l ? l[0].toUpperCase() : '';
        return (i1 + i2) || 'U';
    }, [profile]);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
        } finally {
            // Remplacer l'URL pour éviter le retour arrière vers une page protégée
            window.location.replace('/auth/login');
        }
    };
    return (
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    {/* Burger mobile */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72">
                            <SheetHeader className="px-4 pt-4 pb-2 text-left">
                                <SheetTitle>Navigation</SheetTitle>
                            </SheetHeader>
                            <nav className="px-2 py-2 space-y-1">
                                <Link href="/dashboard" className="block px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Dashboard</Link>
                                <Link href="/products" className="block px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Produits & Stocks</Link>
                                <Link href="/sales/invoices" className="block px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Ventes / Factures</Link>
                                <div className="mt-2 px-3 text-xs text-gray-500">Achats</div>
                                <div className="ml-1 space-y-1">
                                    <Link href="/purchases/rfq" className="block px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Demandes de prix</Link>
                                    <Link href="/purchases/orders" className="block px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Commandes</Link>
                                    <Link href="/purchases/receipts" className="block px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Réceptions</Link>
                                    <Link href="/purchases/invoices" className="block px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Factures fournisseurs</Link>
                                </div>
                                {role === 'admin' && (
                                    <>
                                        <div className="mt-2 px-3 text-xs text-gray-500">Administration</div>
                                        <Link href="/members" className="block px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Utilisateurs</Link>
                                        <Link href="/settings" className="block px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Paramètres</Link>
                                        <Link href="/journal" className="block px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Journal</Link>
                                    </>
                                )}
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">O</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Optima ERP</h1>
                        <p className="text-sm text-gray-500">Espace Entreprise</p>
                    </div>
                </div>

                <div className="hidden md:flex flex-1 max-w-md mx-4 md:mx-8">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input placeholder="Rechercher produits, clients..." className="pl-10" />
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" className="relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">0</span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-700">
                                    {initials}
                                </div>
                                <span className="hidden md:block text-sm font-medium truncate max-w-[160px]">
                                    {profile?.firstName ? `${profile.firstName} ${profile?.lastName || ''}`.trim() : 'Mon Compte'}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            <div className="px-3 py-2 text-sm">
                                <div className="font-medium text-gray-900">
                                    {profile?.firstName || profile?.lastName ? `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() : 'Utilisateur'}
                                </div>
                                <div className="text-gray-500 truncate">{profile?.email || ''}</div>
                            </div>
                            <DropdownMenuItem asChild>
                                <Link href="/settings">Profil</Link>
                            </DropdownMenuItem>
                            {role === 'admin' && (
                                <DropdownMenuItem asChild>
                                    <Link href="/settings">Paramètres</Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={handleLogout} className="text-red-600">Se déconnecter</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}


