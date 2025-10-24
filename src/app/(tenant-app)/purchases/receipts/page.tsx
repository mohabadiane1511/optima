"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type ReceiptItem = {
    id: string;
    purchaseOrderId: string;
    supplier: string | null;
    status: string;
    createdAt: string;
    entryCount: number;
};

export default function ReceiptsPage() {
    const [items, setItems] = useState<ReceiptItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState("");
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
                if (q.trim()) params.set("q", q.trim());
                const res = await fetch(`/api/tenant/purchases/receipts?${params.toString()}`, { signal: controller.signal });
                if (!res.ok) throw new Error();
                const data = await res.json();
                setItems((data?.items || []) as ReceiptItem[]);
                if (data?.pagination) {
                    setTotal(Number(data.pagination.total || 0));
                    setTotalPages(Number(data.pagination.totalPages || 0));
                }
            } catch {
            } finally { setLoading(false); }
        };
        run();
        return () => controller.abort();
    }, [q, page, limit]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Réceptions</h1>
            </div>

            <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 max-w-sm"><Input placeholder="Rechercher (ID ou fournisseur)" value={q} onChange={(e) => setQ(e.target.value)} /></div>
                    <div className="text-sm text-gray-500">{loading ? <Skeleton className="h-4 w-24" /> : ""}</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-500">
                            <tr className="border-b">
                                <th className="py-2">Réception</th>
                                <th className="py-2">Commande</th>
                                <th className="py-2">Fournisseur</th>
                                <th className="py-2">Statut</th>
                                <th className="py-2">Lots</th>
                                <th className="py-2">Date</th>
                                <th className="py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="py-4"><div className="space-y-2"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-5/6" /><Skeleton className="h-5 w-4/6" /></div></td></tr>
                            ) : items.map((r) => (
                                <tr key={r.id} className="border-b hover:bg-gray-50">
                                    <td className="py-2">{r.id.substring(0, 8).toUpperCase()}</td>
                                    <td className="py-2">{r.purchaseOrderId.substring(0, 8).toUpperCase()}</td>
                                    <td className="py-2">{r.supplier || "—"}</td>
                                    <td className="py-2">
                                        {r.status === 'not_received' && <Badge variant="secondary">Non réceptionnée</Badge>}
                                        {r.status === 'partial' && <Badge>Partielle</Badge>}
                                        {r.status === 'received' && <Badge className="bg-green-600 hover:bg-green-600">Complète</Badge>}
                                    </td>
                                    <td className="py-2">{r.entryCount}</td>
                                    <td className="py-2">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</td>
                                    <td className="py-2 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="outline" size="sm" asChild><Link href={`/purchases/receipts/${r.id}`}>Voir la réception</Link></Button>
                                            <Button variant="outline" size="sm" asChild><Link href={`/purchases/orders/${r.purchaseOrderId}`}>Voir la commande</Link></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr><td colSpan={7} className="py-8 text-center text-gray-500">Aucune réception</td></tr>
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


