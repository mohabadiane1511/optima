"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, FileDown, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
    const nf = useMemo(() => new Intl.NumberFormat('fr-FR'), []);
    const [rows, setRows] = useState<InvoiceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const filtered = useMemo(() => rows.filter(r => {
        const s = q.toLowerCase();
        return r.number.toLowerCase().includes(s) || r.customer.toLowerCase().includes(s);
    }), [q, rows]);

    useEffect(() => {
        (async () => {
            setLoading(true); setError(null);
            try {
                const res = await fetch('/api/tenant/invoices', { cache: 'no-store' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Erreur chargement');
                const mapped: InvoiceRow[] = (data || []).map((i: any) => ({
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
            } catch (e: any) { setError(e.message); }
            finally { setLoading(false); }
        })();
    }, []);

    const stats = useMemo(() => {
        const totalTTC = filtered.reduce((s, r) => s + r.total, 0);
        const totalSolde = filtered.reduce((s, r) => s + r.balance, 0);
        const nbPayees = filtered.filter(r => r.status === 'paid').length;
        const nbEchues = filtered.filter(r => r.status === 'overdue').length;
        return { totalTTC, totalSolde, nbPayees, nbEchues };
    }, [filtered]);

    const statusBadge = (s: InvoiceRow["status"]) => {
        switch (s) {
            case "paid": return <Badge className="bg-emerald-600">Payée</Badge>;
            case "overdue": return <Badge className="bg-red-600">Échue</Badge>;
            case "sent": return <Badge>Émise</Badge>;
            case "draft": return <Badge variant="secondary">Brouillon</Badge>;
            case "cancelled": return <Badge variant="secondary">Annulée</Badge>;
        }
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

            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Chiffre d'affaires (sélection)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{nf.format(stats.totalTTC)} FCFA</div><CardDescription>Total TTC des factures listées</CardDescription></CardContent>
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
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Factures échues</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.nbEchues}</div><CardDescription>Non réglées à échéance</CardDescription></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Filtres</CardTitle>
                    <CardDescription>Recherche client/numéro et filtres de statut (à venir)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                        <div className="flex-1 flex items-center gap-2">
                            <Input placeholder="Rechercher (client, numéro)" value={q} onChange={(e) => setQ(e.target.value)} />
                            <Button variant="outline" className="shrink-0"><Filter className="h-4 w-4 mr-2" />Filtres</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Liste</CardTitle>
                    <CardDescription>{filtered.length} facture(s)</CardDescription>
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
                </CardContent>
            </Card>
        </div>
    );
}


