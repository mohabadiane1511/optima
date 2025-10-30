"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Footer() {
    return (
        <footer className="bg-black text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                {/* Top area */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
                    {/* Brand */}
                    <div>
                        <div className="text-2xl font-extrabold tracking-tight">Optima</div>
                        <p className="mt-3 text-sm text-gray-300 leading-relaxed max-w-xs">
                            Votre solution de gestion d'entreprise.
                        </p>
                        <div className="mt-4 text-xs text-gray-500">© {new Date().getFullYear()} Optima. Tous droits réservés.</div>
                    </div>

                    {/* Produit */}
                    <div>
                        <div className="text-sm font-semibold text-gray-100 uppercase tracking-wider mb-3">Produit</div>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="#modules" className="text-gray-300 hover:text-white">Modules</Link></li>
                            <li><Link href="#tarifs" className="text-gray-300 hover:text-white">Tarifs</Link></li>
                            <li><Link href="#avantages" className="text-gray-300 hover:text-white">Avantages</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Intégrations (à venir)</Link></li>
                        </ul>
                    </div>

                    {/* Ressources */}
                    <div>
                        <div className="text-sm font-semibold text-gray-100 uppercase tracking-wider mb-3">Ressources</div>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="#faq" className="text-gray-300 hover:text-white">FAQ</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Documentation</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Support</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Roadmap</Link></li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <div className="text-sm font-semibold text-gray-100 uppercase tracking-wider mb-3">Restez informé</div>
                        <form className="flex gap-2 max-w-sm">
                            <Input type="email" placeholder="Votre email" className="bg-white/10 border-white/20 text-white placeholder:text-gray-400" />
                            <Button type="submit" className="bg-white text-black hover:bg-gray-100">OK</Button>
                        </form>
                        <p className="mt-2 text-xs text-gray-500">Pas de spam. Désinscription à tout moment.</p>
                    </div>
                </div>

                {/* Bottom area */}
                <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="text-xs text-gray-400">Construit avec ❤️ </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                        <Link href="#" className="hover:text-white">Confidentialité</Link>
                        <Link href="#" className="hover:text-white">Conditions</Link>
                        <Link href="#" className="hover:text-white">Contact</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}


