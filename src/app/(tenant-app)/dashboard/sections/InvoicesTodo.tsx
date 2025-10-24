"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = { id: string; number: string; customer: string; dueDate: string | null; total: number };

export default function InvoicesTodo() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const nf = new Intl.NumberFormat('fr-FR');

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/tenant/invoices?status=sent,overdue&limit=5', { cache: 'no-store' });
                const data = await res.json();
                const mapped: Row[] = (data?.items || []).map((i: any) => ({ id: i.id, number: i.number || '(brouillon)', customer: i.customer || '—', dueDate: i.dueDate || null, total: Number(i.total || i.totalTTC || 0) }));
                if (mounted) setRows(mapped);
            } catch { if (mounted) setRows([]); } finally { if (mounted) setLoading(false); }
        })();
        return () => { mounted = false; };
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Factures à traiter</CardTitle>
                <CardDescription>À encaisser rapidement</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="w-full overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Numéro</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead className="hidden sm:table-cell">Échéance</TableHead>
                                <TableHead className="text-right">Total</TableHead>
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
                            ) : rows.map(r => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-mono text-xs">{r.number}</TableCell>
                                    <TableCell className="truncate max-w-[160px]" title={r.customer}>{r.customer}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{r.dueDate ? new Date(r.dueDate).toLocaleDateString('fr-FR') : '—'}</TableCell>
                                    <TableCell className="text-right">{nf.format(r.total)} FCFA</TableCell>
                                    <TableCell className="text-right"><Link className="text-blue-600 hover:underline" href={`/sales/invoices/${r.id}`}>Voir</Link></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}


