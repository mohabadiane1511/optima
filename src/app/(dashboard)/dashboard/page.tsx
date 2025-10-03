import { AppShell } from "@/shared/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
    // Placeholders KPI
    const kpis = [
        { label: "Chiffre d'affaires (mois)", value: "— FCFA" },
        { label: "Factures en retard", value: "—" },
        { label: "Produits sous seuil", value: "—" },
    ];

    return (
        <AppShell>
            <h1 className="text-2xl font-semibold mb-6">Tableau de bord</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((k) => (
                    <Card key={k.label} className="transition hover:shadow-md">
                        <CardContent className="p-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                            <div className="text-sm text-black/60 dark:text-white/60">{k.label}</div>
                            <div className="text-2xl font-semibold mt-1">{k.value}</div>
                            <div className="text-xs text-emerald-600 mt-1">+10.5% vs hier</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                <Card className="lg:col-span-2 h-[320px]">
                    <CardContent className="p-0 h-full flex items-center justify-center text-black/60 dark:text-white/60 animate-in fade-in-50 slide-in-from-left-2 duration-300">
                        Orders Overview (chart placeholder)
                    </CardContent>
                </Card>
                <Card className="h-[320px]">
                    <CardContent className="p-0 h-full flex items-center justify-center text-black/60 dark:text-white/60 animate-in fade-in-50 slide-in-from-right-2 duration-300">
                        Sale Analytics (donut placeholder)
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                <Card className="h-[280px]">
                    <CardContent className="p-0 h-full flex items-center justify-center text-black/60 dark:text-white/60 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                        Sales (chart placeholder)
                    </CardContent>
                </Card>
                <Card className="h-[280px]">
                    <CardContent className="p-0 h-full flex items-center justify-center text-black/60 dark:text-white/60 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                        Purchase Analytics (bar chart placeholder)
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}


