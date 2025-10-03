"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LayoutDashboard, Package } from "lucide-react";

const navItems: Array<{ href: string; label: string; icon: React.ReactNode }> = [
    { href: "/dashboard", label: "Tableau de bord", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/products", label: "Produits", icon: <Package className="h-4 w-4" /> },
];

export function Sidebar() {
    const pathname = usePathname();
    const Nav = () => (
        <nav className="px-3 pb-6 flex flex-col gap-1">
            {navItems.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "rounded-lg px-3 py-2 transition-colors",
                            active
                                ? "bg-black/[.06] dark:bg-white/[.08] font-medium"
                                : "hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                        )}
                    >
                        <span className="inline-flex items-center gap-2">
                            {item.icon}
                            <span>{item.label}</span>
                        </span>
                    </Link>
                );
            })}
        </nav>
    );

    return (
        <>
            <aside
                className="w-64 shrink-0 min-h-screen hidden sm:block bg-white dark:bg-[#0f0f10] border-r"
                style={{ borderColor: "rgba(0,0,0,.08)" }}
            >
                <div className="p-5 text-xl font-bold tracking-tight">Optima</div>
                <Nav />
            </aside>

            <div className="sm:hidden p-2 border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="sm">Menu</Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <div className="p-5 text-xl font-bold tracking-tight">Optima</div>
                        <Nav />
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}


