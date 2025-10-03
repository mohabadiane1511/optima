"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/shared/layout/ThemeToggle";
import { Bell } from "lucide-react";

export function Topbar() {
    return (
        <header
            className="h-14 border-b flex items-center px-4 gap-3 bg-white dark:bg-[#0f0f10]"
            style={{ borderColor: "rgba(0,0,0,.08)" }}
        >
            <div className="flex-1 max-w-xl w-full">
                <Input placeholder="Rechercher..." className="h-9" />
            </div>
            <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" className="h-9 w-9 p-0" aria-label="Notifications">
                    <Bell className="h-4 w-4" />
                </Button>
                <ThemeToggle />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-9 px-2">
                            <Avatar className="h-6 w-6 mr-2"><AvatarFallback>OB</AvatarFallback></Avatar>
                            Profil
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Profil</DropdownMenuItem>
                        <DropdownMenuItem>Paramètres</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Déconnexion</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}


