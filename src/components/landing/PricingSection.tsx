"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check, Phone } from "lucide-react";

const moduleLabels: Record<string, string> = {
    dashboard: "Tableau de bord",
    produits_stocks: "Produits & Stocks",
    ventes: "Ventes & Facturation",
    achats: "Achats & Fournisseurs",
    caisses: "Gestion de caisse",
    rh: "Ressources humaines",
    etat_financier_pdf: "États financiers PDF",
};

const plans = [
    {
        code: "ESSENTIEL",
        name: "Essentiel",
        priceMonthly: 5000,
        priceYearly: 54000,
        yearlyDiscount: 10,
        users: 1,
        modules: ["dashboard", "produits_stocks", "ventes", "etat_financier_pdf"],
        popular: false,
    },
    {
        code: "CROISSANCE",
        name: "Croissance",
        priceMonthly: 15000,
        priceYearly: 150000,
        yearlyDiscount: 16.67,
        users: 3,
        modules: ["dashboard", "produits_stocks", "ventes", "achats", "etat_financier_pdf"],
        popular: true,
    },
    {
        code: "SERENITE",
        name: "Sérénité",
        priceMonthly: 25000,
        priceYearly: 250000,
        yearlyDiscount: 16.67,
        users: 5,
        modules: ["dashboard", "produits_stocks", "ventes", "achats", "caisses", "etat_financier_pdf"],
        popular: false,
    },
    {
        code: "PREMIUM",
        name: "Premium",
        priceMonthly: 40000,
        priceYearly: 400000,
        yearlyDiscount: 16.67,
        users: 10,
        modules: ["dashboard", "produits_stocks", "ventes", "achats", "caisses", "rh", "etat_financier_pdf"],
        popular: false,
    },
];

export default function PricingSection() {
    const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
    const nf = new Intl.NumberFormat("fr-FR");

    return (
        <section id="tarifs" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12 sm:mb-16">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Des tarifs adaptés à <span className="text-blue-600">chaque entreprise</span>
                    </h2>
                    <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                        Choisissez le plan qui correspond à vos besoins
                    </p>

                    {/* Toggle mensuel/annuel */}
                    <div className="inline-flex items-center gap-3 p-1 bg-white border border-gray-200 rounded-full">
                        <button
                            onClick={() => setBillingPeriod("monthly")}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingPeriod === "monthly"
                                    ? "bg-blue-600 text-white shadow-md"
                                    : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Mensuel
                        </button>
                        <button
                            onClick={() => setBillingPeriod("yearly")}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingPeriod === "yearly"
                                    ? "bg-blue-600 text-white shadow-md"
                                    : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Annuel
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                Économisez jusqu'à 17%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                    {plans.map((plan) => {
                        const price = billingPeriod === "monthly" ? plan.priceMonthly : plan.priceYearly;
                        const pricePerMonth = billingPeriod === "yearly" ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;

                        return (
                            <div
                                key={plan.code}
                                className={`relative bg-white rounded-2xl border-2 p-6 sm:p-8 transition-all duration-300 ${plan.popular
                                        ? "border-blue-600 shadow-2xl scale-105 sm:scale-100 lg:scale-105 -mt-4 sm:-mt-0 lg:-mt-4"
                                        : "border-gray-200 hover:border-blue-300 hover:shadow-xl"
                                    }`}
                            >
                                {/* Badge Populaire */}
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                                        Le plus populaire
                                    </div>
                                )}

                                {/* Header */}
                                <div className="mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl sm:text-5xl font-bold text-gray-900">
                                            {nf.format(pricePerMonth)}
                                        </span>
                                        <span className="text-gray-600">FCFA</span>
                                        <span className="text-sm text-gray-500">/mois</span>
                                    </div>
                                    {billingPeriod === "yearly" && (
                                        <p className="text-sm text-gray-500 mt-1">
                                            Facturé {nf.format(price)} FCFA/an
                                        </p>
                                    )}
                                </div>

                                {/* Users */}
                                <div className="mb-6 pb-6 border-b border-gray-200">
                                    <p className="text-sm text-gray-600 mb-1">
                                        <span className="font-semibold text-gray-900">{plan.users}</span> utilisateur{plan.users > 1 ? "s" : ""} inclus
                                    </p>
                                    {plan.code !== "PREMIUM" && (
                                        <p className="text-xs text-gray-500">Utilisateurs supplémentaires : +{plan.code === "ESSENTIEL" ? "500" : "1000"} FCFA/mois</p>
                                    )}
                                </div>

                                {/* Modules */}
                                <div className="mb-6">
                                    <p className="text-sm font-semibold text-gray-900 mb-3">Modules inclus :</p>
                                    <ul className="space-y-2">
                                        {plan.modules.map((module) => (
                                            <li key={module} className="flex items-start gap-2 text-sm text-gray-700">
                                                <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                                <span>{moduleLabels[module] || module}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* CTA */}
                                <Button
                                    asChild
                                    className={`w-full ${plan.popular
                                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                                            : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                                        }`}
                                >
                                    <Link href="#contact">
                                        {plan.code === "PREMIUM" ? (
                                            <>
                                                <Phone className="mr-2 h-4 w-4" /> Nous contacter
                                            </>
                                        ) : (
                                            "Choisir ce plan"
                                        )}
                                    </Link>
                                </Button>
                            </div>
                        );
                    })}
                </div>

                {/* Footer note */}
                <div className="mt-12 text-center">
                    <p className="text-sm text-gray-600">
                        Tous les plans incluent un essai gratuit de 14 jours. Pas de carte bancaire requise.
                    </p>
                </div>
            </div>
        </section>
    );
}

