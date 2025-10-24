"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ProductMarginsSection() {
    const nf = useMemo(() => new Intl.NumberFormat('fr-FR'), []);
    const [items, setItems] = useState<{ productId: string; name: string | null; sku: string | null; margin: number }[]>([]);
    useEffect(() => { (async () => { try { const r = await fetch('/api/tenant/invoices/summary', { cache: 'no-store' }); const d = await r.json(); setItems((d?.productMargins || []).map((x: any) => ({ productId: x.productId, name: x.name, sku: x.sku, margin: Number(x.margin || 0) }))); } catch { } })(); }, []);
    const W = 640, H = 220, padL = 140, padR = 18, padT = 10, padB = 20;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const barH = Math.min(22, Math.max(12, Math.floor(plotH / Math.max(1, items.length + 1))));
    const gap = Math.max(6, Math.floor((plotH - barH * items.length) / Math.max(1, items.length + 1)));
    const maxAbs = Math.max(1, ...items.map(it => Math.abs(Number(it.margin || 0))));
    const xScale = (v: number) => padL + (v / maxAbs) * plotW * 0.95;
    return (
        <Card>
            <CardHeader>
                <CardTitle>Marge brute par produit</CardTitle>
                <CardDescription>Top produits (factures payées)</CardDescription>
            </CardHeader>
            <CardContent>
                <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
                    <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#cbd5e1" />
                    {items.map((it, i) => {
                        const y = padT + gap * (i + 1) + barH * i;
                        const m = Number(it.margin || 0);
                        const w = Math.max(0, xScale(Math.abs(m)) - padL);
                        const color = m >= 0 ? '#10b981' : '#ef4444';
                        return (
                            <g key={it.productId || i}>
                                <text x={padL - 8} y={y + barH / 2} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="#374151">
                                    {(it.name || it.sku || it.productId || 'Produit')}
                                </text>
                                <rect x={padL} y={y} width={w} height={barH} rx={2} fill={color} />
                                <text x={padL + w + 6} y={y + barH / 2} dominantBaseline="middle" fontSize={10} fill="#6b7280">{nf.format(m)} FCFA</text>
                            </g>
                        );
                    })}
                </svg>
            </CardContent>
        </Card>
    );
}


