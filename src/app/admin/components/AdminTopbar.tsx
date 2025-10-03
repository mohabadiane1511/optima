"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Search,
    Bell,
    Settings,
    LogOut,
    User,
    Menu
} from 'lucide-react';

export function AdminTopbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        // Supprimer le cookie de session
        document.cookie = 'sa_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/admin/login';
    };

    return (
        <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Logo et titre */}
                <div className="flex items-center space-x-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="md:hidden"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">O</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">Optima ERP</h1>
                            <p className="text-sm text-gray-500">Super Admin</p>
                        </div>
                    </div>
                </div>

                {/* Recherche */}
                <div className="hidden md:flex flex-1 max-w-md mx-8">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Rechercher entreprises, utilisateurs..."
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-4">
                    {/* Notifications */}
                    <Button variant="ghost" size="sm" className="relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                            0
                        </span>
                    </Button>

                    {/* Profil */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                    <User className="h-4 w-4" />
                                </div>
                                <span className="hidden md:block text-sm font-medium">Super Admin</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                Paramètres
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Se déconnecter
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
