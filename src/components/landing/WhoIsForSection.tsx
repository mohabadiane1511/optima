"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Factory, PackageSearch, ShoppingBag, ShoppingCart, UtensilsCrossed } from "lucide-react";

type Segment = {
    icon: React.ReactNode;
    title: string;
    popular?: boolean;
    bullets: string[];
};

const segments: Segment[] = [
    {
        icon: <ShoppingBag className="w-5 h-5 text-blue-600" />,
        title: "Logiciel de gestion pour commerces de détail (PME)",
        popular: true,
        bullets: [
            "Catalogue produits (SKU, prix achat/vente, catégories)",
            "Inventaire & mouvements de stock (IN/OUT)",
            "Factures de vente et enregistrement de paiements",
        ],
    },
    {
        icon: <PackageSearch className="w-5 h-5 text-blue-600" />,
        title: "Logiciel de gestion pour grossistes et distribution",
        bullets: [
            "Achats: RFQ, bons de commande, réceptions, factures d’achat",
            "Clients & fournisseurs (fiches, historique)",
            "Suivi des stocks et export des mouvements",
        ],
    },
    {
        icon: <Briefcase className="w-5 h-5 text-blue-600" />,
        title: "Logiciel de facturation et gestion commerciale B2B",
        bullets: [
            "Devis et factures de vente",
            "Enregistrement des paiements reçus",
            "KPI: CA, statuts de factures, à encaisser",
        ],
    },
    {
        icon: <UtensilsCrossed className="w-5 h-5 text-blue-600" />,
        title: "Logiciel de gestion restaurant (achats, stocks, caisse)",
        bullets: [
            "Achats & fournisseurs (commandes, réceptions, factures)",
            "Inventaire et mouvements (IN/OUT)",
            "Facturation et paiements enregistrés",
        ],
    },
    {
        icon: <Factory className="w-5 h-5 text-blue-600" />,
        title: "Logiciel de gestion de production pour petites industries",
        bullets: [
            "Entrées/sorties de stock (IN/OUT)",
            "Produits, catégories et prix de revient/vente",
            "Journal des mouvements et export",
        ],
    },
    {
        icon: <ShoppingCart className="w-5 h-5 text-blue-600" />,
        title: "Logiciel de gestion e‑commerce et inventaire",
        bullets: [
            "Catalogue produits centralisé",
            "Factures de vente et paiements",
            "Tableaux de bord des ventes (revenus, statuts)",
        ],
    },
];

export default function WhoIsForSection() {
    return (
        <section id="pour-qui" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 sm:mb-16">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Pour quel type d’entreprises ?
                    </h2>
                    <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
                        Optima est un logiciel de gestion commerciale (ERP léger) pour PME: facturation, gestion de stock,
                        achats/fournisseurs et tableaux de bord. Idéal pour le retail, le B2B, la distribution, la restauration,
                        la petite industrie et l’e‑commerce.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {segments.map((s, idx) => (
                        <div key={idx} className="relative bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 hover:shadow-xl transition-shadow">
                            {s.popular && (
                                <div className="absolute -top-3 left-6">
                                    <span className="text-[10px] sm:text-xs bg-blue-600 text-white px-2 py-1 rounded-full">Populaire</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                    {s.icon}
                                </div>
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{s.title}</h3>
                            </div>
                            <ul className="space-y-2 text-sm text-gray-700">
                                {s.bullets.map((b, i) => (
                                    <li key={i} className="flex gap-2">
                                        <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0"></span>
                                        <span>{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-12 sm:mt-14 text-center">
                    <div className="inline-flex gap-3">
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
                            Voir une démo adaptée
                        </Button>
                        <Button asChild variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                            <Link href="#tarifs">Comparer les plans</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}


