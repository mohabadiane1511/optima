"use client";

import { Package, ShoppingCart, TrendingUp, FileText, Users, BarChart3 } from "lucide-react";

const modules = [
    {
        icon: Package,
        title: "Produits & Stocks",
        description: "Catalogue complet, gestion des stocks en temps réel, mouvements tracés",
        features: [
            "SKU, catégories, prix achat/vente",
            "Alertes automatiques (seuils)",
            "Historique complet des mouvements",
            "Export CSV"
        ]
    },
    {
        icon: ShoppingCart,
        title: "Ventes & Facturation",
        description: "Facturation professionnelle, suivi des paiements, analytics détaillées",
        features: [
            "Gestion clients",
            "Factures (brouillon → émission → paiement)",
            "Graphiques CA et marges",
            "Suivi des encaissements"
        ]
    },
    {
        icon: TrendingUp,
        title: "Achats & Fournisseurs",
        description: "Gestion complète de vos achats, de la demande de prix à la réception",
        features: [
            "Demandes de prix (RFQ)",
            "Commandes d'achat",
            "Réceptions de marchandises",
            "Factures fournisseurs"
        ]
    },
    {
        icon: BarChart3,
        title: "Analytics & Reporting",
        description: "KPIs en temps réel, visualisations, pilotage de votre activité",
        features: [
            "CA, solde à encaisser",
            "Graphiques interactifs",
            "Alertes automatiques",
            "Vue d'ensemble"
        ]
    },
    {
        icon: FileText,
        title: "Traçabilité & Audit",
        description: "Historique complet de toutes les actions, conformité et transparence",
        features: [
            "Toutes les actions tracées",
            "Export des logs",
            "Purge automatique",
            "Sécurité renforcée"
        ]
    },
    {
        icon: Users,
        title: "Gestion d'équipe",
        description: "Membres, rôles et permissions pour collaborer en toute sécurité",
        features: [
            "Gestion des membres",
            "Rôles (owner, admin, viewer)",
            "Multi-tenant",
            "Collaboration sécurisée"
        ]
    }
];

export default function ModulesSection() {
    return (
        <section id="modules" className="py-10 sm:py-14 md:py-16 lg:py-24 bg-blue-50/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8 sm:mb-12 md:mb-16">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
                        Tous vos besoins, <span className="text-blue-600">une seule plateforme</span>
                    </h2>
                    <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-4">
                        Des modules interconnectés pour gérer toute votre entreprise efficacement
                    </p>
                </div>

                {/* Mobile Slider (scroll-snap) */}
                <div className="sm:hidden -mx-4 px-4">
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none" role="region" aria-label="Modules">
                        {modules.map((module, index) => {
                            const Icon = module.icon;
                            return (
                                <div
                                    key={`m-${index}`}
                                    className="snap-start shrink-0 w-[85%] last:mr-4 group bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="w-10 h-10 mb-3 flex items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                                        <Icon className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{module.title}</h3>
                                    <p className="text-xs text-gray-600 mb-3 leading-relaxed">{module.description}</p>
                                    <ul className="space-y-1.5">
                                        {module.features.map((feature, featureIndex) => (
                                            <li key={`mf-${index}-${featureIndex}`} className="flex items-start gap-2 text-xs text-gray-700">
                                                <span className="text-blue-600 mt-1 flex-shrink-0">•</span>
                                                <span className="leading-relaxed">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Grid for >= sm */}
                <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {modules.map((module, index) => {
                        const Icon = module.icon;
                        return (
                            <div
                                key={index}
                                className="group bg-white border border-gray-200 rounded-xl p-6 md:p-8 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                            >
                                <div className="w-12 h-12 md:w-14 md:h-14 mb-4 flex items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                                    <Icon className="h-6 w-6 md:h-7 md:w-7 text-blue-600" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">{module.title}</h3>
                                <p className="text-sm md:text-base text-gray-600 mb-4 leading-relaxed">{module.description}</p>
                                <ul className="space-y-2">
                                    {module.features.map((feature, featureIndex) => (
                                        <li key={featureIndex} className="flex items-start gap-2 text-sm text-gray-700">
                                            <span className="text-blue-600 mt-1.5 flex-shrink-0">•</span>
                                            <span className="leading-relaxed">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

