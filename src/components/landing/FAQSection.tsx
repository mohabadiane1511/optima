"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
    {
        question: "Optima est-il adapté aux petites entreprises ?",
        answer: "Absolument ! Optima est conçu pour s'adapter à toutes les tailles d'entreprise. Le plan Essentiel est parfait pour démarrer avec un seul utilisateur, et vous pouvez évoluer vers des plans plus complets au fur et à mesure de votre croissance. L'interface est simple et intuitive, pas besoin de formation technique."
    },
    {
        question: "Combien de temps faut-il pour mettre en place Optima ?",
        answer: "La mise en place est très rapide ! En quelques minutes, vous pouvez créer votre compte et commencer à saisir vos premiers produits. Pour une migration complète depuis Excel ou un autre système, notre équipe peut vous accompagner dans l'import de vos données. La plupart des entreprises sont opérationnelles en moins d'une semaine."
    },
    {
        question: "Puis-je migrer mes données depuis Excel ou mon système actuel ?",
        answer: "Oui, nous proposons des outils d'import CSV pour vos produits, clients, et stocks. Nos experts peuvent également vous aider à migrer depuis d'autres systèmes. L'import est simple et sécurisé, et nous vous accompagnons tout au long du processus."
    },
    {
        question: "Mes données sont-elles sécurisées ?",
        answer: "La sécurité est notre priorité. Vos données sont hébergées sur des serveurs sécurisés avec chiffrement. Chaque action est tracée dans le journal d'audit pour une transparence totale. Vous pouvez exporter vos données à tout moment, elles vous appartiennent. Nous respectons les standards de protection des données."
    },
    {
        question: "Puis-je essayer Optima gratuitement ?",
        answer: "Oui ! Tous nos plans incluent un essai gratuit de 14 jours, sans carte bancaire requise. Vous pouvez tester toutes les fonctionnalités du plan choisi, créer vos produits, factures, et découvrir toutes les capacités d'Optima en conditions réelles."
    },
    {
        question: "Quel support technique est inclus ?",
        answer: "Le support est inclus dans tous nos plans. Vous avez accès à une documentation complète, et notre équipe répond à vos questions par email. Pour les plans supérieurs, un support prioritaire et des sessions de formation sont disponibles. Nous sommes là pour vous aider à réussir."
    },
    {
        question: "Puis-je ajouter des modules supplémentaires plus tard ?",
        answer: "Bien sûr ! Optima est modulaire et évolutif. Vous pouvez commencer avec le plan Essentiel et passer à un plan supérieur à tout moment pour débloquer de nouveaux modules. Aucune migration de données n'est nécessaire lors du changement de plan."
    },
    {
        question: "Que se passe-t-il si j'ai besoin de plus d'utilisateurs ?",
        answer: "Aucun problème ! Tous nos plans permettent d'ajouter des utilisateurs supplémentaires moyennant un coût par utilisateur et par mois. Vous gardez le contrôle total et pouvez ajuster le nombre d'utilisateurs selon vos besoins, sans changement de plan."
    },
    {
        question: "Optima fonctionne-t-il hors ligne ?",
        answer: "Optima est une solution cloud accessible depuis n'importe quel navigateur. Une connexion Internet est nécessaire pour utiliser la plateforme. Cependant, nous travaillons sur une application mobile avec mode offline pour les inventaires et consultations, prévue dans notre roadmap."
    },
    {
        question: "Puis-je personnaliser les factures et documents ?",
        answer: "Oui ! Vous pouvez personnaliser l'en-tête de vos factures avec votre logo et vos informations. Les factures sont générées en PDF professionnel. Des personnalisations plus poussées (modèles de documents) seront disponibles dans les prochaines versions."
    }
];

export default function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="py-16 sm:py-20 md:py-24 lg:py-32 bg-gradient-to-b from-blue-50/40 to-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12 sm:mb-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                        <HelpCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Questions <span className="text-blue-600">fréquentes</span>
                    </h2>
                    <p className="text-base sm:text-lg text-gray-600">
                        Trouvez rapidement les réponses à vos questions
                    </p>
                </div>

                {/* FAQ Accordion */}
                <div className="space-y-4">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <div
                                key={index}
                                className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-blue-300 hover:shadow-md"
                            >
                                {/* Question */}
                                <button
                                    onClick={() => toggle(index)}
                                    className="w-full flex items-center justify-between p-5 sm:p-6 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                                    aria-expanded={isOpen}
                                >
                                    <span className="text-base sm:text-lg font-semibold text-gray-900 pr-8">
                                        {faq.question}
                                    </span>
                                    <ChevronDown
                                        className={`w-5 h-5 text-blue-600 flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""
                                            }`}
                                    />
                                </button>

                                {/* Answer */}
                                <div
                                    className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                                        }`}
                                >
                                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
                                        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                            {faq.answer}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CTA */}
                <div className="mt-12 text-center">
                    <p className="text-sm sm:text-base text-gray-600 mb-4">
                        Vous avez une autre question ?
                    </p>
                    <a
                        href="#contact"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
                    >
                        Contactez notre équipe
                        <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </a>
                </div>
            </div>
        </section>
    );
}

