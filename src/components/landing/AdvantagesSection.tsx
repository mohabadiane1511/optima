"use client";

import { Sparkles, Clock, ShieldCheck, UploadCloud, Building, Headset, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const items = [
    {
        icon: Sparkles,
        title: "Simplicité",
        desc: "Prise en main rapide, interface moderne et claire.",
    },
    {
        icon: Clock,
        title: "Temps réel",
        desc: "KPIs, ventes et stocks toujours à jour.",
    },
    {
        icon: ShieldCheck,
        title: "Traçabilité",
        desc: "Journal d’audit complet pour chaque action.",
    },
    {
        icon: UploadCloud,
        title: "Export & contrôle",
        desc: "Exports CSV : vos données vous appartiennent.",
    },
    {
        icon: AlertCircle,
        title: "Notifications",
        desc: "Notifications en temps réel, par email.",
    },
    {
        icon: Headset,
        title: "Support local",
        desc: "Équipe réactive, au plus près de vous.",
    },
];

export default function AdvantagesSection() {
    return (
        <section id="avantages" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-blue-50/30 pointer-events-none"></div>

            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12 sm:mb-16 md:mb-20">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Pourquoi choisir <span className="text-blue-600">Optima</span> ?
                    </h2>
                    <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                        Des avantages concrets qui font la différence au quotidien
                    </p>
                </div>

                {/* Grid moderne avec hover effects dans un cadre */}
                <div className="border-2 border-gray-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 bg-white/50 backdrop-blur-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                        {items.map((it, i) => {
                            const Icon = it.icon;
                            return (
                                <div
                                    key={i}
                                    className="group relative bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1"
                                >
                                    {/* Icône avec effet */}
                                    <div className="mb-6">
                                        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors duration-300">
                                            <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
                                        </div>
                                    </div>

                                    {/* Contenu */}
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                                        {it.title}
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                                        {it.desc}
                                    </p>

                                    {/* Accent line on hover */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-b-2xl scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* CTA section */}
                <div className="mt-12 sm:mt-16 text-center">
                    <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                        <Link href="#demo">Découvrir Optima</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}


