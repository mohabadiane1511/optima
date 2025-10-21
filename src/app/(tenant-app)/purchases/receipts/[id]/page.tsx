"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ReceiptDetail = {
    id: string;
    status: "not_received" | "partial" | "received" | string;
    note?: string | null;
    createdAt: string;
    purchaseOrder: { id: string; supplier: string | null };
    lines: { id?: string; name: string; ordered: number; received: number; remaining: number }[];
    history: { id: string; createdAt: string; note?: string | null; lines: { poLineId: string; qty: number }[] }[];
};

export default function ReceiptDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id as string;
    const router = useRouter();
    const [data, setData] = useState<ReceiptDetail | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!id) return;
        const controller = new AbortController();
        const run = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/tenant/purchases/receipts/${id}`, { signal: controller.signal });
                if (!res.ok) throw new Error();
                setData(await res.json());
            } catch {
            } finally { setLoading(false); }
        };
        run();
        return () => controller.abort();
    }, [id]);

    const totals = useMemo(() => {
        if (!data) return { ordered: 0, received: 0, remaining: 0 };
        return data.lines.reduce((acc, l) => ({
            ordered: acc.ordered + Number(l.ordered || 0),
            received: acc.received + Number(l.received || 0),
            remaining: acc.remaining + Math.max(0, Number(l.remaining || 0)),
        }), { ordered: 0, received: 0, remaining: 0 });
    }, [data]);

    if (!data) return <div className="p-6">{loading ? "Chargement…" : "Introuvable"}</div>;

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.back()}>← Retour</Button>
                    <h1 className="text-2xl font-semibold">Réception {data.id.substring(0, 8).toUpperCase()}</h1>
                </div>
                <div className="flex items-center gap-2">
                    {data.status === 'not_received' && <Badge variant="secondary">Non réceptionnée</Badge>}
                    {data.status === 'partial' && <Badge>Partielle</Badge>}
                    {data.status === 'received' && <Badge className="bg-green-600 hover:bg-green-600">Complète</Badge>}
                </div>
            </div>

            <Card className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Commande</div>
                        <div className="font-medium">{data.purchaseOrder.id.substring(0, 8).toUpperCase()}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Fournisseur</div>
                        <div className="font-medium">{data.purchaseOrder.supplier || '—'}</div>
                    </div>
                    {data.note && (
                        <div className="col-span-2">
                            <div className="text-gray-500">Note</div>
                            <div className="font-medium whitespace-pre-wrap">{data.note}</div>
                        </div>
                    )}
                </div>
            </Card>

            <Card className="p-4">
                <div className="font-medium mb-2">Synthèse par ligne</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-500">
                            <tr>
                                <th className="py-1">Désignation</th>
                                <th className="py-1">Commandé</th>
                                <th className="py-1">Reçu</th>
                                <th className="py-1">Restant</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.lines.map((l, idx) => (
                                <tr key={l.id || idx} className="border-t">
                                    <td className="py-1">{l.name}</td>
                                    <td className="py-1">{Number(l.ordered)}</td>
                                    <td className="py-1">{Number(l.received)}</td>
                                    <td className="py-1">{Number(l.remaining)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t font-medium">
                                <td className="py-1 text-right">Totaux</td>
                                <td className="py-1">{totals.ordered}</td>
                                <td className="py-1">{totals.received}</td>
                                <td className="py-1">{totals.remaining}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>

            <Card className="p-4">
                <div className="font-medium mb-2">Historique des lots</div>
                <div className="space-y-3 text-sm">
                    {data.history.length === 0 && (
                        <div className="text-gray-600">Aucun lot enregistré.</div>
                    )}
                    {data.history.map((e) => (
                        <div key={e.id} className="border rounded p-3">
                            <div className="flex items-center justify-between">
                                <div className="font-medium">Lot du {new Date(e.createdAt).toLocaleString('fr-FR')}</div>
                            </div>
                            {e.note && (<div className="mt-1 text-gray-700 whitespace-pre-wrap">{e.note}</div>)}
                            <div className="mt-2 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-gray-500">
                                        <tr>
                                            <th className="py-1">Ligne PO</th>
                                            <th className="py-1">Qté reçue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {e.lines.map((l, i) => (
                                            <tr key={`${l.poLineId}-${i}`} className="border-t">
                                                <td className="py-1">{l.poLineId.substring(0, 8).toUpperCase()}</td>
                                                <td className="py-1">{Number(l.qty)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}


