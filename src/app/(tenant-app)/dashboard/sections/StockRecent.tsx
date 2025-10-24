"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Row = { id: string; productName: string | null; productSku: string | null; type: string; qty: number; createdAt: string };

export default function StockRecent() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { (async () => { try { setLoading(true); const r = await fetch('/api/tenant/stock-movements?limit=15', { cache: 'no-store' }); const d = await r.json(); setRows((d || []).map((m: any) => ({ id: m.id, productName: m.productName, productSku: m.productSku, type: m.type, qty: Number(m.qty || 0), createdAt: m.createdAt }))); } catch { setRows([]); } finally { setLoading(false); } })(); }, []);
    return (
        <Card>
            <CardHeader>
                <CardTitle>Activité stock récente</CardTitle>
                <CardDescription>15 derniers mouvements</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 text-sm">
                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-4/6" />
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="text-gray-500">Aucun mouvement</div>
                    ) : rows.map(r => (
                        <div key={r.id} className="flex items-center justify-between">
                            <div className="truncate max-w-[60%]" title={r.productName || r.productSku || 'Produit'}>{r.productName || r.productSku || 'Produit'}</div>
                            <div className={r.type === 'IN' ? 'text-emerald-700' : 'text-blue-700'}>{r.type === 'IN' ? '+ ' : '- '}{r.qty}</div>
                            <div className="text-gray-500">{new Date(r.createdAt).toLocaleString('fr-FR')}</div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}


