"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type OrderListItem = {
    id: string;
    supplier: string;
    status: string;
    total: number;
    createdAt: string;
};

const money = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

export default function PurchaseOrdersPage() {
    const [items, setItems] = useState<OrderListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string>("all");
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
                const params = new URLSearchParams();
                if (status !== "all") params.set("status", status);
                if (q.trim()) params.set("q", q.trim());
                params.set("page", String(page));
                params.set("limit", String(limit));
                const res = await fetch(`/api/tenant/purchases/orders?${params.toString()}`, { signal: controller.signal });
                if (!res.ok) throw new Error("Erreur chargement commandes");
                const data = await res.json();
                setItems((data?.items || []) as OrderListItem[]);
                if (data?.pagination) {
                    setTotal(Number(data.pagination.total || 0));
                    setTotalPages(Number(data.pagination.totalPages || 0));
                }
            } catch (e) {
                // no-op UI simple
            } finally {
                setLoading(false);
            }
        };
        run();
        return () => controller.abort();
    }, [status, q, page, limit]);

    const filtered = useMemo(() => items, [items]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Commandes d'achat</h1>
            </div>

            <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-64">
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les statuts</SelectItem>
                                <SelectItem value="created">Créée</SelectItem>
                                <SelectItem value="confirmed">Confirmée</SelectItem>
                                <SelectItem value="received">Réceptionnée</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 max-w-sm">
                        <Input placeholder="Recherche fournisseur" value={q} onChange={(e) => setQ(e.target.value)} />
                    </div>
                    <div className="text-sm text-gray-500">{loading ? "Chargement…" : ""}</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-500">
                            <tr className="border-b">
                                <th className="py-2">PO</th>
                                <th className="py-2">Fournisseur</th>
                                <th className="py-2">Total</th>
                                <th className="py-2">Statut</th>
                                <th className="py-2">Date</th>
                                <th className="py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((o) => (
                                <tr key={o.id} className="border-b hover:bg-gray-50">
                                    <td className="py-2">{o.id.substring(0, 8).toUpperCase()}</td>
                                    <td className="py-2">{o.supplier}</td>
                                    <td className="py-2">{money(o.total)} FCFA</td>
                                    <td className="py-2">
                                        {o.status === 'created' && <Badge variant="secondary">Créée</Badge>}
                                        {o.status === 'confirmed' && <Badge>Confirmée</Badge>}
                                        {o.status === 'received' && <Badge className="bg-green-600 hover:bg-green-600">Réceptionnée</Badge>}
                                    </td>
                                    <td className="py-2">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</td>
                                    <td className="py-2 text-right"><Button variant="outline" size="sm" asChild><Link href={`/purchases/orders/${o.id}`}>Voir</Link></Button></td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} className="py-8 text-center text-gray-500">Aucune commande</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
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


