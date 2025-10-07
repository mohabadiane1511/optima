"use client";

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Search, Bell, User } from 'lucide-react';

export function TenantTopbar() {
    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
        } finally {
            // Remplacer l'URL pour éviter le retour arrière vers une page protégée
            window.location.replace('/auth/login');
        }
    };
    return (
        <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">O</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Optima ERP</h1>
                        <p className="text-sm text-gray-500">Espace Entreprise</p>
                    </div>
                </div>

                <div className="hidden md:flex flex-1 max-w-md mx-8">
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
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                    <User className="h-4 w-4" />
                                </div>
                                <span className="hidden md:block text-sm font-medium">Mon Compte</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem>Profil</DropdownMenuItem>
                            <DropdownMenuItem>Paramètres</DropdownMenuItem>
                            <DropdownMenuItem onClick={handleLogout} className="text-red-600">Se déconnecter</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}


