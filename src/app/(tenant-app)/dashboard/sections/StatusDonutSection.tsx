"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatusDonutSection() {
    const [statuses, setStatuses] = useState<Record<string, number>>({});
    useEffect(() => { (async () => { try { const r = await fetch('/api/tenant/invoices/summary', { cache: 'no-store' }); const d = await r.json(); setStatuses(d?.statuses || {}); } catch { } })(); }, []);

    const order: Array<keyof typeof statuses> = ['paid', 'sent', 'overdue', 'draft', 'cancelled'] as any;
    //mettre en francais les labels
    const labels: Record<string, string> = { paid: 'Payées', sent: 'Émises', overdue: 'Échues', draft: 'Brouillons', cancelled: 'Annulées' };
    const colors: Record<string, string> = { paid: '#10b981', sent: '#6366f1', overdue: '#ef4444', draft: '#9ca3af', cancelled: '#6b7280' };
    const values = order.map(k => Number((statuses as any)[k] || 0));
    const total = Math.max(1, values.reduce((s, v) => s + v, 0));
    let start = 0; const cx = 90, cy = 90, r = 60;
    const segs = values.map((v, i) => { const a = (v / total) * Math.PI * 2, end = start + a; const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start); const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end); const large = a > Math.PI ? 1 : 0; const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`; const color = colors[order[i] as any] || '#ddd'; start = end; return { d, color, label: order[i], v }; });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Statuts des factures</CardTitle>
                <CardDescription>Répartition du nombre de factures</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    {Object.keys(statuses).length === 0 ? (
                        <Skeleton className="h-[180px] w-[180px]" />
                    ) : (
                        <svg width={180} height={180} viewBox="0 0 180 180">{segs.map((s, i) => (<path key={i} d={s.d} fill={s.color} />))}</svg>
                    )}
                    <div className="space-y-1 text-sm">
                        {order.map(k => (
                            <div key={String(k)} className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: colors[k as any] }}></span>{labels[k as any]}: {(statuses as any)[k] || 0}</div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


