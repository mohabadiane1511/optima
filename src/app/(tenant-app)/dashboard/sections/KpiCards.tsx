"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Summary = {
    revenue: { date: string; total: number }[];
    statuses: Record<string, number>;
};

export default function KpiCards() {
    const nf = useMemo(() => new Intl.NumberFormat("fr-FR"), []);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [lowStock, setLowStock] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                // 1) Résumé factures (CA payé + statuts)
                const res = await fetch("/api/tenant/invoices/summary", { cache: "no-store" });
                const data = await res.json();
                if (mounted) setSummary({ revenue: data?.revenue || [], statuses: data?.statuses || {} });

                // 2) Solde à encaisser (rapide, première page suffit souvent pour MVP; sinon on itèrera)
                try {
                    const res2 = await fetch("/api/tenant/invoices?status=sent,overdue&limit=100", { cache: "no-store" });
                    const d2 = await res2.json();
                    const b = (d2?.items || []).reduce((s: number, it: any) => s + Number(it.balance || 0), 0);
                    if (mounted) setBalance(b);
                } catch { }

                // 3) Produits sous seuil (qtyOnHand <= 5)
                try {
                    const res3 = await fetch("/api/tenant/products", { cache: "no-store" });
                    const d3 = await res3.json();
                    const count = (d3 || []).filter((p: any) => Number(p?.qtyOnHand || 0) <= 5).length;
                    if (mounted) setLowStock(count);
                } catch { }
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const totalPaid = useMemo(() => (summary?.revenue || []).reduce((s, r) => s + Number(r.total || 0), 0), [summary]);
    const statuses = summary?.statuses || { paid: 0, overdue: 0 } as any;

    const cards = [
        { label: "CA payé", value: `${nf.format(totalPaid)} FCFA` },
        { label: "Solde à encaisser", value: `${nf.format(balance)} FCFA` },
        { label: "Factures payées", value: String(Number(statuses.paid || 0)) },
        { label: "Produits sous seuil", value: String(lowStock) },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
                <Card key={c.label}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">{c.label}</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? <Skeleton className="h-6 w-24" /> : c.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}


