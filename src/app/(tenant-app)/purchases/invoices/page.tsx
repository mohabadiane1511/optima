"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Item = { id: string; number?: string | null; supplier?: string | null; status: string; invoiceDate: string; dueDate?: string | null; totalTTC: number };

export default function SupplierInvoicesPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string>('all');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const run = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams({ page: String(page), limit: String(limit) });
                if (status !== 'all') params.set('status', status);
                if (q.trim()) params.set('q', q.trim());
                const res = await fetch(`/api/tenant/purchases/invoices?${params.toString()}`, { signal: controller.signal });
                if (!res.ok) throw new Error();
                const data = await res.json();
                setItems(data?.items || []);
                if (data?.pagination) { setTotal(Number(data.pagination.total || 0)); setTotalPages(Number(data.pagination.totalPages || 0)); }
            } catch {
            } finally { setLoading(false); }
        };
        run();
        return () => controller.abort();
    }, [status, q, page, limit]);

    const money = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n || 0)));
    const statusLabel = (s?: string | null) => {
        switch ((s || '').toLowerCase()) {
            case 'draft': return 'Brouillon';
            case 'posted': return 'Validée';
            case 'paid': return 'Payée';
            case 'cancelled': return 'Annulée';
            default: return s || '—';
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Factures fournisseurs</h1>
            </div>

            <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-48">
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous</SelectItem>
                                <SelectItem value="draft">Brouillon</SelectItem>
                                <SelectItem value="posted">Validée</SelectItem>
                                <SelectItem value="paid">Payée</SelectItem>
                                <SelectItem value="cancelled">Annulée</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 max-w-sm"><Input placeholder="Rechercher (numéro, fournisseur)" value={q} onChange={(e) => setQ(e.target.value)} /></div>
                    <div className="text-sm text-gray-500">{loading ? 'Chargement…' : ''}</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-500">
                            <tr className="border-b">
                                <th className="py-2">N°</th>
                                <th className="py-2">Fournisseur</th>
                                <th className="py-2">Statut</th>
                                <th className="py-2">Date</th>
                                <th className="py-2">Échéance</th>
                                <th className="py-2">Total</th>
                                <th className="py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it) => (
                                <tr key={it.id} className="border-b hover:bg-gray-50">
                                    <td className="py-2">{it.number || '—'}</td>
                                    <td className="py-2">{it.supplier || '—'}</td>
                                    <td className="py-2">{statusLabel(it.status)}</td>
                                    <td className="py-2">{new Date(it.invoiceDate).toLocaleDateString('fr-FR')}</td>
                                    <td className="py-2">{it.dueDate ? new Date(it.dueDate).toLocaleDateString('fr-FR') : '—'}</td>
                                    <td className="py-2">{money(it.totalTTC)} FCFA</td>
                                    <td className="py-2 text-right"><Button variant="outline" size="sm" asChild><Link href={`/purchases/invoices/${it.id}`}>Voir</Link></Button></td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr><td colSpan={7} className="py-8 text-center text-gray-500">Aucune facture</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between mt-3 text-sm">
                    <div className="text-gray-600">{loading ? 'Chargement…' : `Page ${page} / ${Math.max(totalPages, 1)} • ${total} éléments`}</div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <span className="text-gray-600">Par page</span>
                            <select className="border rounded px-2 py-1" value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>Précédent</Button>
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1))} disabled={totalPages ? page >= totalPages || loading : loading}>Suivant</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}


