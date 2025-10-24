"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentMethodsSection() {
    const [rows, setRows] = useState<{ method: string; total: number }[]>([]);
    useEffect(() => { (async () => { try { const r = await fetch('/api/tenant/invoices/summary', { cache: 'no-store' }); const d = await r.json(); setRows(d?.paymentMethods || []); } catch { } })(); }, []);
    const label: Record<string, string> = { cash: 'Espèces', card: 'Carte', transfer: 'Virement', mobile: 'Mobile', other: 'Autre' };
    const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ef4444'];
    const total = Math.max(1, rows.reduce((s, r) => s + Number(r.total || 0), 0));
    let start = 0; const cx = 90, cy = 90, r = 60;
    const segs = rows.map((it, i) => { const v = Number(it.total || 0); const a = (v / total) * Math.PI * 2; const end = start + a; const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start); const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end); const large = a > Math.PI ? 1 : 0; const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`; const color = colors[i % colors.length]; start = end; return { d, color, label: it.method, v }; });
    return (
        <Card>
            <CardHeader>
                <CardTitle>Méthodes de paiement</CardTitle>
                <CardDescription>Somme par méthode</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    {rows.length === 0 ? (
                        <Skeleton className="h-[180px] w-[180px]" />
                    ) : (
                        <svg width={180} height={180} viewBox="0 0 180 180">{segs.map((s, i) => (<path key={i} d={s.d} fill={s.color} />))}</svg>
                    )}
                    <div className="space-y-1 text-sm">
                        {rows.map((it, i) => (
                            <div key={it.method} className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: colors[i % colors.length] }}></span>{label[it.method] || it.method}: {Number(it.total || 0).toLocaleString('fr-FR')} FCFA</div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


