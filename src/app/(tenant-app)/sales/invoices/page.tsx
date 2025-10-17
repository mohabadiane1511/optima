"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, FileDown, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type InvoiceRow = {
    id: string;
    number: string;
    customer: string;
    issueDate: string | null;
    dueDate: string | null;
    status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
    total: number;
    balance: number;
};

export default function InvoicesListPage() {
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalInvoices, setTotalInvoices] = useState(0);
    const nf = useMemo(() => new Intl.NumberFormat('fr-FR'), []);
    const [rows, setRows] = useState<InvoiceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Graph params (comme Produits & Stocks)
    const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
    const windowByGranularity: Record<typeof granularity, number> = { daily: 7, weekly: 12, monthly: 12, yearly: 5 } as any;

    const [summary, setSummary] = useState<{ revenue: { date: string; total: number }[]; statuses: Record<string, number>; paymentMethods?: { method: string; total: number }[]; productMargins?: { productId: string; name: string | null; sku: string | null; revenue: number; cost: number; margin: number }[]; topProducts?: { productId: string; name: string | null; sku: string | null; qty: number; revenue: number }[]; granularity: string } | null>(null);

    // Tooltip état
    const [tip, setTip] = useState<{ x: number; y: number; label: string; value: number } | null>(null);

    const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "sent" | "overdue" | "draft" | "cancelled">("all");

    const filtered = useMemo(() => rows.filter(r => {
        const s = q.toLowerCase();
        return r.number.toLowerCase().includes(s) || r.customer.toLowerCase().includes(s);
    }), [q, rows]);

    const loadInvoices = async (pageNum: number = 1) => {
        setLoading(true); setError(null);
        try {
            const statusParam = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
            const res = await fetch(`/api/tenant/invoices?page=${pageNum}&limit=10${statusParam}`, { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur chargement');
            const mapped: InvoiceRow[] = (data.items || []).map((i: any) => ({
                id: i.id,
                number: i.number || '(brouillon)',
                customer: i.customer || '—',
                issueDate: i.issueDate || null,
                dueDate: i.dueDate || null,
                status: i.status,
                total: Number(i.total || i.totalTTC || 0),
                balance: Number(i.balance || 0),
            }));
            setRows(mapped);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotalInvoices(data.pagination?.total || 0);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        loadInvoices(page);
    }, [page, statusFilter]);

    // Charger résumé (CA par période + statuts) selon granularité
    useEffect(() => {
        (async () => {
            try {
                const window = windowByGranularity[granularity];
                const res = await fetch(`/api/tenant/invoices/summary?granularity=${granularity}&window=${window}`, { cache: 'no-store' });
                const data = await res.json();
                if (res.ok) setSummary({ revenue: data.revenue || [], statuses: data.statuses || {}, paymentMethods: data.paymentMethods || [], productMargins: data.productMargins || [], topProducts: data.topProducts || [], granularity: data.granularity });
            } catch { }
        })();
    }, [granularity]);

    const stats = useMemo(() => {
        const totalTTC = filtered.filter(r => r.status === 'paid').reduce((s, r) => s + r.total, 0);
        const totalSolde = filtered.reduce((s, r) => r.status !== 'cancelled' && r.status !== 'draft' ? s + r.balance : s, 0);
        const nbPayees = filtered.filter(r => r.status === 'paid').length;
        const nbEchues = filtered.filter(r => r.status === 'overdue').length;
        return { totalTTC, totalSolde, nbPayees, nbEchues };
    }, [filtered]);

    // CA aligné sur le graphe (même fenêtre/granularité)
    const summaryTotalPaid = useMemo(() => {
        if (!summary) return 0;
        return (summary.revenue || []).reduce((s, b) => s + Number(b.total || 0), 0);
    }, [summary]);

    const statusBadge = (s: InvoiceRow["status"]) => {
        switch (s) {
            case "paid": return <Badge className="bg-emerald-600">Payée</Badge>;
            case "overdue": return <Badge className="bg-red-600">Échue</Badge>;
            case "sent": return <Badge>Émise</Badge>;
            case "draft": return <Badge variant="secondary">Brouillon</Badge>;
            case "cancelled": return <Badge variant="secondary">Annulée</Badge>;
        }
    };

    // Bar chart pour CA avec tooltip
    const RevenueChart = () => {
        if (!summary || (summary.revenue || []).length === 0) return <div className="text-sm text-gray-500">Aucune donnée</div>;
        const buckets = [...summary.revenue]
            .map(r => ({ x: new Date(r.date).getTime(), d: new Date(r.date), y: r.total }))
            .sort((a, b) => a.x - b.x);
        const ys = buckets.map(b => b.y);
        const maxY = Math.max(1, ...ys);
        const padL = 52, padB = 32, padT = 10, padR = 10, W = 640, H = 240;
        const plotW = W - padL - padR, plotH = H - padB - padT;
        const yScale = (v: number) => padT + plotH - (v / maxY) * plotH;
        const step = plotW / Math.max(1, buckets.length);
        const barW = Math.max(8, Math.min(40, step * 0.6));

        // X ticks labels
        const fmtX = (d: Date) => {
            switch (granularity) {
                case 'daily': return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                case 'weekly': return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                case 'monthly': return d.toLocaleDateString('fr-FR', { month: 'short' });
                case 'yearly': return d.getFullYear().toString();
            }
        };

        // Y ticks
        const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxY * i) / 4));

        return (
            <div className="relative">
                <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} onMouseLeave={() => setTip(null)}>
                    {/* Grid + Y axis */}
                    {yTicks.map((t, i) => (
                        <g key={i}>
                            <line x1={padL} y1={yScale(t)} x2={W - padR} y2={yScale(t)} stroke="#eef2f7" />
                            <text x={padL - 6} y={yScale(t)} textAnchor="end" dominantBaseline="middle" fill="#6b7280" fontSize={10}>{nf.format(t)}</text>
                        </g>
                    ))}
                    {/* Axes */}
                    <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#cbd5e1" />
                    <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#cbd5e1" />

                    {/* Bars */}
                    {buckets.map((b, i) => {
                        const cx = padL + step * i + step / 2; // centre de la barre
                        const x = cx - barW / 2;
                        const y = yScale(b.y);
                        const h = (H - padB) - y;
                        return (
                            <rect
                                key={i}
                                x={x}
                                y={y}
                                width={barW}
                                height={Math.max(0, h)}
                                fill="#0ea5e9"
                                rx={2}
                                onMouseEnter={(e) => setTip({ x: e.nativeEvent.offsetX + 10, y: e.nativeEvent.offsetY + 10, label: fmtX(b.d), value: b.y })}
                                onMouseMove={(e) => setTip(prev => prev ? { ...prev, x: e.nativeEvent.offsetX + 10, y: e.nativeEvent.offsetY + 10 } : prev)}
                            />
                        );
                    })}

                    {/* X ticks */}
                    {buckets.map((b, i) => {
                        const cx = padL + step * i + step / 2;
                        return <text key={`t${i}`} x={cx} y={H - padB + 14} textAnchor="middle" fill="#6b7280" fontSize={10}>{fmtX(b.d)}</text>;
                    })}

                    {/* Legend */}
                    <g>
                        <rect x={W - 130} y={padT} width={10} height={10} fill="#0ea5e9" rx={2} />
                        <text x={W - 114} y={padT + 9} fontSize={11} fill="#374151">CA payé</text>
                    </g>
                </svg>
                {tip && (
                    <div
                        className="pointer-events-none absolute z-10 rounded-md bg-white/95 shadow px-2 py-1 text-xs text-gray-700 border border-gray-200"
                        style={{ left: tip.x, top: tip.y }}
                    >
                        <div className="font-medium">{tip.label}</div>
                        <div>{nf.format(tip.value)} FCFA</div>
                    </div>
                )}
            </div>
        );
    };

    const StatusDonut = () => {
        if (!summary) return <div className="text-sm text-gray-500">Aucune donnée</div>;
        const order: Array<keyof typeof summary.statuses> = ['paid', 'sent', 'overdue', 'draft', 'cancelled'] as any;
        const labelMap: Record<string, string> = { paid: 'Payée', sent: 'Émise', overdue: 'Échue', draft: 'Brouillon', cancelled: 'Annulée' };
        const colors: Record<string, string> = { paid: '#10b981', sent: '#6366f1', overdue: '#ef4444', draft: '#9ca3af', cancelled: '#6b7280' };
        const values = order.map(k => Number((summary.statuses as any)[k] || 0));
        const total = Math.max(1, values.reduce((s, v) => s + v, 0));
        const cx = 90, cy = 90, r = 60; let start = 0;
        const segs = values.map((v, i) => { const angle = (v / total) * Math.PI * 2; const end = start + angle; const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start); const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end); const large = angle > Math.PI ? 1 : 0; const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`; start = end; return { d, color: colors[order[i] as any] || '#ddd', label: order[i], v }; });
        return (
            <div className="flex items-center gap-4">
                <svg width={180} height={180} viewBox="0 0 180 180">
                    {segs.map((s, i) => <path key={i} d={s.d} fill={s.color} />)}
                </svg>
                <div className="space-y-1 text-sm">
                    {order.map((k) => (
                        <div key={k} className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: colors[k] }}></span>{labelMap[k]}: {(summary.statuses as any)[k] || 0}</div>
                    ))}
                </div>
            </div>
        );
    };

    const PaymentMethodsDonut = () => {
        if (!summary || !summary.paymentMethods) return <div className="text-sm text-gray-500">Aucune donnée</div>;
        const items = summary.paymentMethods.length ? summary.paymentMethods : [];
        const labelMap: Record<string, string> = { cash: 'Espèces', card: 'Carte', transfer: 'Virement', mobile: 'Mobile', other: 'Autre' };
        const colorPool = ['#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#14b8a6', '#f43f5e'];
        const colors: Record<string, string> = {};
        items.forEach((it, i) => { colors[it.method] = colorPool[i % colorPool.length]; });
        const values = items.map(it => Number(it.total || 0));
        const total = Math.max(1, values.reduce((s, v) => s + v, 0));
        const cx = 90, cy = 90, r = 60; let start = 0;
        const segs = items.map((it) => { const v = Number(it.total || 0); const angle = (v / total) * Math.PI * 2; const end = start + angle; const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start); const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end); const large = angle > Math.PI ? 1 : 0; const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`; start = end; return { d, color: colors[it.method] || '#ddd', label: it.method, v }; });
        return (
            <div className="flex items-center gap-4">
                <svg width={180} height={180} viewBox="0 0 180 180">
                    {segs.map((s, i) => <path key={i} d={s.d} fill={s.color} />)}
                </svg>
                <div className="space-y-1 text-sm">
                    {items.map((it) => (
                        <div key={it.method} className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: colors[it.method] }}></span>
                            {labelMap[it.method] || it.method}: {nf.format(Number(it.total || 0))} FCFA
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const ProductMarginsChart = () => {
        if (!summary || !summary.productMargins || summary.productMargins.length === 0) return <div className="text-sm text-gray-500">Aucune donnée</div>;
        const items = [...summary.productMargins];
        const W = 640, H = 240, padL = 140, padR = 18, padT = 10, padB = 20;
        const plotW = W - padL - padR, plotH = H - padT - padB;
        const barH = Math.min(22, Math.max(12, Math.floor(plotH / Math.max(1, items.length + 1))));
        const gap = Math.max(6, Math.floor((plotH - barH * items.length) / Math.max(1, items.length + 1)));
        const maxAbs = Math.max(1, ...items.map(it => Math.abs(Number(it.margin || 0))));
        const xScale = (v: number) => padL + (v / maxAbs) * plotW * 0.95;
        return (
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
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
                    <p className="text-gray-600">Suivi des ventes et paiements</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline"><FileDown className="h-4 w-4 mr-2" /> Export CSV</Button>
                    <Button asChild><Link href="/sales/invoices/new"><Plus className="h-4 w-4 mr-2" /> Nouvelle facture</Link></Button>
                </div>
            </div>

            {/* Statistiques + Graphes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Chiffre d'affaires</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{nf.format(summaryTotalPaid)} FCFA</div><CardDescription>Aligné sur le graphe ({granularity === 'monthly' ? '12 mois' : granularity === 'weekly' ? '12 semaines' : granularity === 'daily' ? '7 jours' : '5 ans'})</CardDescription></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Solde restant</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{nf.format(stats.totalSolde)} FCFA</div><CardDescription>Montant à encaisser</CardDescription></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Factures payées</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.nbPayees}</div><CardDescription>Sur la sélection</CardDescription></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Top 3 produits</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            {(summary?.topProducts || []).slice(0, 3).map((p, i) => (
                                <div key={p.productId || i} className="flex items-center justify-between">
                                    <div className="truncate max-w-[60%]" title={p.name || p.sku || p.productId || 'Produit'}>{p.name || p.sku || p.productId || 'Produit'}</div>
                                    <div className="text-right">
                                        <div className="font-medium">{nf.format(Number(p.revenue || 0))} FCFA</div>
                                        <div className="text-gray-500">{nf.format(Number(p.qty || 0))} u.</div>
                                    </div>
                                </div>
                            ))}
                            {(!summary || (summary.topProducts || []).length === 0) && (
                                <div className="text-gray-500">Aucune vente</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Contrôles de période */}
            <div className="flex items-center gap-2">
                <Button variant={granularity === 'daily' ? 'default' : 'outline'} size="sm" onClick={() => setGranularity('daily')}>Jour</Button>
                <Button variant={granularity === 'weekly' ? 'default' : 'outline'} size="sm" onClick={() => setGranularity('weekly')}>Semaine</Button>
                <Button variant={granularity === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setGranularity('monthly')}>Mois</Button>
                <Button variant={granularity === 'yearly' ? 'default' : 'outline'} size="sm" onClick={() => setGranularity('yearly')}>Année</Button>
            </div>

            {/* Graphes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>CA réalisé dans le temps</CardTitle>
                        <CardDescription>{granularity === 'monthly' ? 'Mensuel (12 mois)' : granularity === 'weekly' ? 'Hebdomadaire (12 semaines)' : granularity === 'daily' ? 'Quotidien (7 jours)' : 'Annuel (5 ans)'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RevenueChart />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Répartition des statuts</CardTitle>
                        <CardDescription>Nombre de factures par statut</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <StatusDonut />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Méthodes de paiement</CardTitle>
                        <CardDescription>Somme des montants par méthode</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PaymentMethodsDonut />
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Marge brute par produit</CardTitle>
                    <CardDescription>Top 10 produits (factures payées)</CardDescription>
                </CardHeader>
                <CardContent>
                    <ProductMarginsChart />
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Filtres</CardTitle>
                    <CardDescription>Recherche client/numéro et filtres de statut</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                        <div className="flex-1 flex items-center gap-2">
                            <Input placeholder="Rechercher (client, numéro)" value={q} onChange={(e) => setQ(e.target.value)} />
                            <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setPage(1); }}>
                                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les statuts</SelectItem>
                                    <SelectItem value="paid">Payée</SelectItem>
                                    <SelectItem value="sent">Émise</SelectItem>
                                    <SelectItem value="overdue">Échue</SelectItem>
                                    <SelectItem value="draft">Brouillon</SelectItem>
                                    <SelectItem value="cancelled">Annulée</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Liste</CardTitle>
                    <CardDescription>{totalInvoices} facture(s) - Page {page} sur {totalPages}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Numéro</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Échéance</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Solde</TableHead>
                                    <TableHead className="text-center">Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={8} className="text-center text-sm text-gray-500">Chargement…</TableCell></TableRow>
                                ) : error ? (
                                    <TableRow><TableCell colSpan={8} className="text-center text-sm text-red-600">{error}</TableCell></TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} className="text-center text-sm text-gray-500">Aucune facture</TableCell></TableRow>
                                ) : filtered.map(r => (
                                    <TableRow key={r.id} className="hover:bg-gray-50">
                                        <TableCell className="font-mono text-xs">{r.number}</TableCell>
                                        <TableCell>{r.customer}</TableCell>
                                        <TableCell>{r.issueDate ? new Date(r.issueDate).toLocaleDateString('fr-FR') : '—'}</TableCell>
                                        <TableCell>{r.dueDate ? new Date(r.dueDate).toLocaleDateString('fr-FR') : '—'}</TableCell>
                                        <TableCell className="text-right">{nf.format(r.total)} FCFA</TableCell>
                                        <TableCell className="text-right">{r.balance > 0 ? `${nf.format(r.balance)} FCFA` : '—'}</TableCell>
                                        <TableCell className="text-center">{(() => {
                                            switch (r.status) {
                                                case "paid": return <Badge className="bg-emerald-600">Payée</Badge>;
                                                case "overdue": return <Badge className="bg-red-600">Échue</Badge>;
                                                case "sent": return <Badge>Émise</Badge>;
                                                case "draft": return <Badge variant="secondary">Brouillon</Badge>;
                                                case "cancelled": return <Badge variant="secondary">Annulée</Badge>;
                                            }
                                        })()}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" asChild><Link href={`/sales/invoices/${r.id}`}><Printer className="h-4 w-4 mr-1" /> Voir</Link></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-500">
                            Page {page} sur {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                            >
                                Suivant <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


