"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, Phone, Menu, X } from "lucide-react";

export default function Navbar() {
    const [open, setOpen] = useState(false);

    const navLinks = [
        { href: "#modules", label: "Modules" },
        { href: "#avantages", label: "Avantages" },
        { href: "#pour-qui", label: "Pour qui ?" },
        { href: "#tarifs", label: "Tarifs" },
        { href: "#demo", label: "Démo" },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-100 backdrop-blur relative">
            {/* Gradient background layer */}
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white via-blue-100/60 to-white"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="h-16 flex items-center justify-between gap-4">
                    {/* Logo */}
                    <Link href="/" className="group inline-flex items-center gap-2 sm:gap-3 transition-transform hover:scale-105">
                        <div className="transition-transform group-hover:rotate-3">
                            <Image
                                src="/images/logo_optima-sans_bg.png"
                                alt="Optima"
                                width={5000}
                                height={5000}
                                className="h-20 sm:h-24 md:h-16 lg:h-20 w-auto object-contain drop-shadow-sm"
                                priority
                            />
                        </div>
                        <span className="hidden md:inline text-xl lg:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-blue-800 transition-all duration-300">
                            Optima
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden lg:flex items-center gap-8">
                        {navLinks.map((l) => (
                            <Link key={l.href} href={l.href} className="text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors">
                                {l.label}
                            </Link>
                        ))}
                    </nav>

                    {/* CTAs desktop */}
                    <div className="hidden lg:flex items-center gap-2">
                        <Button asChild variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                            <Link href="#demo" className="flex items-center">
                                <CalendarDays className="mr-2 h-4 w-4" /> Planifier
                            </Link>
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={(e) => {
                                try {
                                    e.preventDefault();
                                    if (typeof window !== 'undefined') {
                                        window.location.hash = '#contact';
                                        window.dispatchEvent(new Event('open-contact'));
                                    }
                                } catch { }
                            }}
                        >
                            <span className="flex items-center"><Phone className="mr-2 h-4 w-4" /> Contact commercial</span>
                        </Button>
                    </div>

                    {/* Mobile toggle */}
                    <button onClick={() => setOpen((v) => !v)} aria-label="Toggle menu" className="lg:hidden inline-flex items-center justify-center rounded-md border border-gray-200 p-2 text-gray-700 hover:bg-blue-50">
                        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile drawer */}
            <div className={`${open ? "max-h-[480px]" : "max-h-0"} overflow-hidden border-t border-gray-100 lg:hidden transition-[max-height] duration-300 ease-in-out bg-white/90 backdrop-blur`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <nav className="flex flex-col gap-2">
                        {navLinks.map((l) => (
                            <Link key={l.href} href={l.href} className="px-2 py-2 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700" onClick={() => setOpen(false)}>
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                    <div className="mt-4 flex flex-col gap-2">
                        <Button asChild variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 w-full">
                            <Link href="#demo" onClick={() => setOpen(false)} className="flex items-center justify-center">
                                <CalendarDays className="mr-2 h-4 w-4" /> Planifier un rendez-vous
                            </Link>
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full" onClick={(e) => {
                            try {
                                e.preventDefault();
                                setOpen(false);
                                if (typeof window !== 'undefined') {
                                    window.location.hash = '#contact';
                                    window.dispatchEvent(new Event('open-contact'));
                                }
                            } catch { }
                        }}>
                            <span className="flex items-center justify-center"><Phone className="mr-2 h-4 w-4" /> Contact commercial</span>
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}


