"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = { id: string; sku: string; name: string; qtyOnHand: number };

export default function LowStockList() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { (async () => { try { setLoading(true); const r = await fetch('/api/tenant/products', { cache: 'no-store' }); const d = await r.json(); const list = (d || []).filter((p: any) => Number(p.qtyOnHand || 0) <= 5).slice(0, 5).map((p: any) => ({ id: p.id, sku: p.sku, name: p.name, qtyOnHand: Number(p.qtyOnHand || 0) })); setRows(list); } catch { setRows([]); } finally { setLoading(false); } })(); }, []);
    return (
        <Card>
            <CardHeader>
                <CardTitle>Stock à surveiller</CardTitle>
                <CardDescription>Produits sous le seuil</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="w-full overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Produit</TableHead>
                                <TableHead className="text-right">Stock</TableHead>

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
                                <TableRow><TableCell colSpan={5} className="text-sm text-gray-500">RAS</TableCell></TableRow>
                            ) : rows.map(r => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                                    <TableCell className="truncate max-w-[160px]" title={r.name}>{r.name}</TableCell>
                                    <TableCell className="text-right">{r.qtyOnHand}</TableCell>

                                    <TableCell className="text-right"><Link className="text-blue-600 hover:underline" href={`/products`}>Voir</Link></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}


