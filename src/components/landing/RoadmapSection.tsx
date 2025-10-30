"use client";

import { Users, MessageSquare, Sparkles, ShoppingBag, Factory, Wrench, Megaphone, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const upcomingModules = [
    {
        icon: Users,
        title: "RH & Paie",
        category: "En cours de développement",
        description: "Gestion complète des ressources humaines avec bulletins de paie automatisés, déclarations sociales (IPRES, CSS), gestion des congés et plannings.",
        features: ["Bulletins de paie", "Déclarations sociales", "Gestion congés", "Présences & pointage"],
        color: "blue"
    },
    {
        icon: MessageSquare,
        title: "CRM",
        category: "En cours de développement",
        description: "Pipeline commercial complet, suivi des opportunités, gestion de la relation client et campagnes marketing ciblées.",
        features: ["Pipeline commercial", "Suivi clients", "Tickets support", "Campagnes email"],
        color: "purple"
    },
    {
        icon: Sparkles,
        title: "IA & Analytics",
        category: "Q1 2026",
        description: "Intelligence artificielle pour prédire les ventes, optimiser les stocks, générer des insights automatiques et recommandations personnalisées.",
        features: ["Prédictions ventes", "Optimisation stocks", "Recommandations produits", "Insights automatisés"],
        color: "amber"
    },
    {
        icon: ShoppingBag,
        title: "E-commerce",
        category: "Q1 2026",
        description: "Intégrations avec les principales plateformes e-commerce et marketplaces pour synchroniser stocks et commandes en temps réel.",
        features: ["Sync multi-canaux", "Marketplaces", "Gestion commandes", "Inventaire unifié"],
        color: "green"
    },
    {
        icon: Factory,
        title: "Production",
        category: "Q1 2026",
        description: "Planification de la production, gestion des nomenclatures, suivi des coûts et ordres de fabrication.",
        features: ["Planification production", "Nomenclatures", "Coûts industriels", "Ordres de fabrication"],
        color: "orange"
    },
    {
        icon: Megaphone,
        title: "Marketing",
        category: "Q1 2026",
        description: "Création et suivi de campagnes marketing, analyse du ROI, segmentation clients et automation marketing.",
        features: ["Campagnes marketing", "ROI & Analytics", "Segmentation", "Marketing automation"],
        color: "pink"
    },
    {
        icon: Smartphone,
        title: "Mobile App",
        category: "Q1 2026",
        description: "Application mobile native pour les équipes terrain : prise de commandes, inventaires, consultations en déplacement.",
        features: ["App iOS & Android", "Commandes terrain", "Inventaires mobiles", "Consultations offline"],
        color: "indigo"
    },
];

const categoryColors = {
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    green: "bg-green-100 text-green-700 border-green-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    cyan: "bg-cyan-100 text-cyan-700 border-cyan-200",
    pink: "bg-pink-100 text-pink-700 border-pink-200",
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

export default function RoadmapSection() {
    return (
        <section className="py-16 sm:py-20 md:py-24 lg:py-32 bg-white relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 pointer-events-none"></div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12 sm:mb-16">
                    <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
                        Roadmap
                    </Badge>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Des modules en <span className="text-blue-600">perpétuelle évolution</span>
                    </h2>
                    <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                        Nous développons continuellement de nouvelles fonctionnalités pour répondre à vos besoins futurs
                    </p>
                </div>

                {/* Timeline layout */}
                <div className="space-y-8 sm:space-y-10">
                    {upcomingModules.map((module, index) => {
                        const Icon = module.icon;
                        const isEven = index % 2 === 0;

                        return (
                            <div
                                key={index}
                                className={`flex flex-col lg:flex-row items-start gap-6 lg:gap-8 ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"
                                    }`}
                            >
                                {/* Timeline indicator (mobile) */}
                                <div className="lg:hidden flex items-center gap-4 w-full">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-600 flex items-center justify-center">
                                        <Icon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <Badge className={`mb-2 ${categoryColors[module.color as keyof typeof categoryColors]}`}>
                                            {module.category}
                                        </Badge>
                                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                                            {module.title}
                                        </h3>
                                    </div>
                                </div>

                                {/* Left side - Icon & Timeline (desktop) */}
                                <div className={`hidden lg:flex flex-col items-center ${isEven ? "lg:order-1" : "lg:order-3"} w-24`}>
                                    <div className="w-16 h-16 rounded-2xl bg-white border-2 border-blue-600 shadow-lg flex items-center justify-center">
                                        <Icon className="w-8 h-8 text-blue-600" />
                                    </div>
                                    {index < upcomingModules.length - 1 && (
                                        <div className="w-0.5 h-full min-h-[120px] bg-gradient-to-b from-blue-600 to-blue-200 mt-2"></div>
                                    )}
                                </div>

                                {/* Content card */}
                                <div className={`flex-1 ${isEven ? "lg:order-2" : "lg:order-2"} bg-white border-2 border-gray-200 rounded-xl p-6 sm:p-8 hover:border-blue-300 hover:shadow-lg transition-all`}>
                                    <div className="hidden lg:flex items-center gap-3 mb-4">
                                        <Badge className={categoryColors[module.color as keyof typeof categoryColors]}>
                                            {module.category}
                                        </Badge>
                                    </div>

                                    <h3 className="hidden lg:block text-2xl font-bold text-gray-900 mb-3">
                                        {module.title}
                                    </h3>

                                    <p className="text-gray-600 mb-4 leading-relaxed text-sm sm:text-base">
                                        {module.description}
                                    </p>

                                    {/* Features list */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {module.features.map((feature, featureIndex) => (
                                            <div key={featureIndex} className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0"></div>
                                                <span>{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CTA */}
                <div className="mt-12 sm:mt-16 text-center">
                    <p className="text-sm sm:text-base text-gray-600 mb-4">
                        Une fonctionnalité vous intéresse particulièrement ?
                    </p>
                    <a
                        href="#contact"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-base sm:text-lg"
                    >
                        Contactez-nous pour prioriser son développement
                        <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </a>
                </div>
            </div>
        </section>
    );
}

