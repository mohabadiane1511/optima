"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Calendar, CalendarDays, Play } from "lucide-react";

export default function Hero() {
    return (
        <section className="relative bg-white overflow-hidden">
            {/* Décorations subtiles en arrière-plan - accents bleus discrets */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="hidden sm:block absolute top-20 left-10 w-56 md:w-72 h-56 md:h-72 bg-blue-100/40 rounded-full blur-3xl"></div>
                <div className="hidden sm:block absolute bottom-20 right-10 w-72 md:w-96 h-72 md:h-96 bg-blue-50/50 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 lg:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-start lg:items-center">
                    {/* Colonne gauche : Texte */}
                    <div className="text-left order-2 lg:order-1">
                        {/* Titre principal */}
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-gray-900 mb-3 sm:mb-4 lg:mb-5 leading-tight tracking-tight">
                            Optima,
                            <br />
                            <span className="text-blue-600">Solution de gestion d&apos;entreprise</span>
                        </h1>

                        {/* Sous-titre */}
                        <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-5 sm:mb-6 lg:mb-8 max-w-xl leading-relaxed">
                            Gérez vos ventes, achats, stocks et équipe dans un seul outil moderne.
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-start items-stretch sm:items-start mb-5 sm:mb-6 lg:mb-8">
                            <Button
                                size="lg"
                                className="bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base px-4 sm:px-6 py-3 sm:py-4 lg:py-5 h-auto shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
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
                                <span className="flex items-center justify-center">Contactez un commercial<ArrowRight className="ml-2 h-4 w-4" /></span>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                size="lg"
                                className="border-blue-600 text-blue-600 hover:bg-blue-50 text-sm sm:text-base px-4 sm:px-6 py-3 sm:py-4 lg:py-5 h-auto w-full sm:w-auto"
                            >
                                <Link href="#demo" className="flex items-center justify-center">
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    Planifier un rendez-vous
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Colonne droite : Mockup/Visual (charts & stats visibles) */}
                    <div className="relative w-full mx-auto lg:max-w-none order-1 lg:order-2 mb-6 lg:mb-0">
                        <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 lg:p-8 shadow-lg sm:shadow-xl">
                            <div className="bg-white rounded-lg shadow-md sm:shadow-lg border border-gray-100 overflow-hidden">
                                {/* Barre de titre simulateur */}
                                <div className="bg-gray-100 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 flex items-center gap-1.5 sm:gap-2">
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500"></div>
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
                                    <div className="ml-2 sm:ml-3 md:ml-4 text-[10px] sm:text-[11px] md:text-sm text-gray-500 font-mono truncate">dashboard.optima.app</div>
                                </div>
                                {/* Contenu placeholder dashboard */}
                                <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-white">
                                    {/* Stats cards visibles */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3 lg:gap-4 mb-3 sm:mb-4 md:mb-6">
                                        {["CA payé", "À encaisser", "Factures", "Sous seuil"].map((label, i) => (
                                            <div key={i} className="bg-blue-50 rounded-lg p-2 sm:p-2.5 md:p-3 lg:p-4 border border-blue-100">
                                                <div className="h-2 sm:h-2.5 md:h-3 bg-blue-200 rounded w-12 sm:w-14 md:w-16 mb-1 sm:mb-1.5 md:mb-2"></div>
                                                <div className="h-5 sm:h-6 md:h-7 bg-blue-600 rounded w-16 sm:w-20 md:w-24"></div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Charts visibles */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
                                        {/* Bar chart */}
                                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 md:p-5 border border-gray-200 h-36 sm:h-40 md:h-48">
                                            <div className="h-2.5 sm:h-3 md:h-4 bg-gray-200 rounded w-24 sm:w-28 md:w-32 mb-2 sm:mb-3 md:mb-4"></div>
                                            <div className="grid grid-cols-12 items-end gap-[2px] sm:gap-[3px] md:gap-1 h-20 sm:h-24 md:h-32">
                                                {Array.from({ length: 12 }).map((_, i) => (
                                                    <div key={i} className="bg-blue-500/80 rounded-t-[2px] sm:rounded-t" style={{ height: `${20 + ((i * 13) % 70)}%` }}></div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Donut + legend */}
                                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 md:p-5 border border-gray-200 h-36 sm:h-40 md:h-48 flex items-center justify-center sm:justify-start gap-2 sm:gap-3 md:gap-4">
                                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 flex-shrink-0">
                                                <svg viewBox="0 0 100 100" className="w-full h-full">
                                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="12" strokeDasharray="180 400" strokeLinecap="round" transform="rotate(-90 50 50)" />
                                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#60a5fa" strokeWidth="12" strokeDasharray="120 400" strokeLinecap="round" transform="rotate(30 50 50)" />
                                                </svg>
                                            </div>
                                            <div className="text-[10px] sm:text-[11px] md:text-xs text-gray-700 space-y-0.5 sm:space-y-1 min-w-0">
                                                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-sm bg-blue-500 flex-shrink-0"></span><span className="truncate">Payées</span></div>
                                                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-sm bg-blue-400 flex-shrink-0"></span><span className="truncate">Émises</span></div>
                                                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-sm bg-gray-300 flex-shrink-0"></span><span className="truncate">Brouillons</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

