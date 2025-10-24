"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Bucket = { date: string; total: number };

export default function RevenueSection() {
    const nf = useMemo(() => new Intl.NumberFormat('fr-FR'), []);
    const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
    const [buckets, setBuckets] = useState<Bucket[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [tip, setTip] = useState<{ x: number; y: number; label: string; value: string } | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const window = granularity === 'daily' ? 7 : granularity === 'weekly' ? 12 : granularity === 'yearly' ? 5 : 12;
                const res = await fetch(`/api/tenant/invoices/summary?granularity=${granularity}&window=${window}`, { cache: 'no-store' });
                const data = await res.json();
                if (mounted) setBuckets((data?.revenue || []) as Bucket[]);
            } catch { if (mounted) setBuckets([]); }
        })();
        return () => { mounted = false; };
    }, [granularity]);

    const total = useMemo(() => buckets.reduce((s, b) => s + Number(b.total || 0), 0), [buckets]);

    const formatLabel = (dateStr: string) => {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return '';
        if (granularity === 'daily') return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        if (granularity === 'weekly') return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        if (granularity === 'monthly') return d.toLocaleDateString('fr-FR', { month: 'short' });
        return String(d.getFullYear());
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start md:items-center justify-between gap-3 flex-col md:flex-row">
                    <div>
                        <CardTitle>Chiffre d'affaires</CardTitle>
                        <CardDescription>Total: {nf.format(total)} FCFA</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(g => (
                            <button key={g} onClick={() => setGranularity(g)} className={`text-xs px-3 py-1 rounded border ${granularity === g ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300'}`}>{g === 'daily' ? 'Jours' : g === 'weekly' ? 'Semaines' : g === 'monthly' ? 'Mois' : 'Années'}</button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div ref={containerRef} className="relative w-full h-56">
                    {!buckets.length ? (
                        <Skeleton className="h-full w-full" />
                    ) : (
                        <svg viewBox="0 0 100 56" className="w-full h-full">
                            {(() => {
                                const vals = buckets.map(b => Number(b.total || 0));
                                const maxVal = Math.max(1, ...vals);
                                const n = Math.max(1, buckets.length);
                                const groupW = 100 / n;
                                const barW = Math.max(1.5, groupW * 0.6);
                                const y = (v: number) => 50 - (v / maxVal) * 45;
                                return (
                                    <g>
                                        {/* grid */}
                                        {[0, 1, 2, 3, 4, 5].map(i => {
                                            const yy = 50 - (i / 5) * 45;
                                            return <line key={i} x1={0} y1={yy} x2={100} y2={yy} stroke="#eef2f7" strokeWidth={0.2} />
                                        })}
                                        {buckets.map((b, i) => {
                                            const x = i * groupW + (groupW - barW) / 2;
                                            const height = 50 - y(Number(b.total || 0));
                                            return (
                                                <g key={i}>
                                                    <rect
                                                        x={x}
                                                        y={y(Number(b.total || 0))}
                                                        width={barW}
                                                        height={height}
                                                        fill="#0ea5e9"
                                                        onMouseMove={(e) => {
                                                            const rect = containerRef.current?.getBoundingClientRect();
                                                            const left = rect ? e.clientX - rect.left : 0;
                                                            const top = rect ? e.clientY - rect.top : 0;
                                                            setTip({ x: left + 10, y: top + 10, label: formatLabel(b.date), value: `${nf.format(Number(b.total || 0))} FCFA` });
                                                        }}
                                                        onMouseLeave={() => setTip(null)}
                                                    />
                                                    {/* X-axis label */}
                                                    <text x={x + barW / 2} y={54} textAnchor="middle" fontSize={2.2} fill="#6b7280">{formatLabel(b.date)}</text>
                                                </g>
                                            )
                                        })}
                                    </g>
                                )
                            })()}
                        </svg>
                    )}
                    {tip && (
                        <div
                            className="pointer-events-none absolute z-10 rounded-md bg-black/80 px-2 py-1 text-[11px] text-white shadow"
                            style={{ left: Math.max(4, Math.min(tip.x, (containerRef.current?.clientWidth || 0) - 120)), top: Math.max(4, tip.y) }}
                        >
                            <div className="font-medium">{tip.label}</div>
                            <div>{tip.value}</div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}


