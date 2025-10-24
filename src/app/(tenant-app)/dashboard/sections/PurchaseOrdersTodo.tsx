"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = { id: string; supplier: string; status: string; total: number; createdAt: string };

export default function PurchaseOrdersTodo() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const nf = new Intl.NumberFormat('fr-FR');

    useEffect(() => {
        (async () => {
            try { setLoading(true); const r = await fetch('/api/tenant/purchases/orders?status=created,confirmed&limit=5', { cache: 'no-store' }); const d = await r.json(); setRows(d?.items || []); }
            catch { setRows([]); } finally { setLoading(false); }
        })();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Commandes d'achat</CardTitle>
                <CardDescription>À confirmer ou réceptionner</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="w-full overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PO</TableHead>
                                <TableHead>Fournisseur</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="hidden sm:table-cell">Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <Skeleton className="h-6 w-full" />
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-sm text-gray-500">Rien à afficher</TableCell></TableRow>
                            ) : rows.map((o: any) => (
                                <TableRow key={o.id}>
                                    <TableCell className="font-mono text-xs">{o.id.slice(0, 8).toUpperCase()}</TableCell>
                                    <TableCell className="truncate max-w-[160px]" title={o.supplier}>{o.supplier}</TableCell>
                                    <TableCell className="text-right">{nf.format(Number(o.total || o.totalTTC || 0))} FCFA</TableCell>
                                    <TableCell className="hidden sm:table-cell">{o.status}</TableCell>
                                    <TableCell className="text-right"><Link className="text-blue-600 hover:underline" href={`/purchases/orders/${o.id}`}>Voir</Link></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}


