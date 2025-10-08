"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, Download } from "lucide-react";

type Invoice = {
    id: string;
    number: string | null;
    status: string;
    issueDate: string | null;
    dueDate: string | null;
    customer: { name: string; address?: string | null; email?: string | null };
    lines: { name: string; qty: number; unit: string; unitPrice?: number; totalHT?: number }[];
    payments: { amount: number; method?: string; paidAt?: string }[];
};

export default function InvoiceDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id as string;
    const nf = useMemo(() => new Intl.NumberFormat('fr-FR'), []);
    const [inv, setInv] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const res = await fetch(`/api/tenant/invoices/${id}`, { cache: 'no-store' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Erreur chargement facture');
                setInv(data);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const totals = useMemo(() => {
        if (!inv) return { total: 0, paid: 0, balance: 0, tva: 0 } as any;
        const total = Number((inv as any).totalTTC ?? inv.lines?.reduce((s, l) => s + Number(l.totalHT ?? l.unitPrice ?? 0) * Number((l as any).tvaRate ? 1 + Number((l as any).tvaRate) / 100 : 1), 0));
        const tva = Number((inv as any).totalTVA ?? inv.lines?.reduce((s, l) => s + Number((l as any).totalTVA || 0), 0) ?? 0);
        const paid = inv.payments?.reduce((s, p) => s + Number(p.amount || 0), 0) ?? 0;
        return { total, paid, balance: Math.max(0, total - paid), tva };
    }, [inv]);

    async function recordPayment() {
        const amountStr = prompt('Montant payé (FCFA)');
        if (!amountStr) return;
        const amount = Number(amountStr);
        if (!amount || amount <= 0) return alert('Montant invalide');
        try {
            const res = await fetch(`/api/tenant/invoices/${id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, method: 'cash' }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur');
            window.location.reload();
        } catch (e: any) { alert(e.message); }
    }

    if (loading) return <div className="p-6 text-sm text-gray-500">Chargement…</div>;
    if (error || !inv) return <div className="p-6 text-sm text-red-600">{error || 'Facture introuvable'}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{inv.number || '(brouillon)'}</h1>
                    <p className="text-gray-600">{inv.issueDate ? `Facture du ${new Date(inv.issueDate).toLocaleDateString('fr-FR')}` : 'Brouillon non émis'}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => history.back()}>Retour</Button>
                    <Button variant="outline"><Printer className="h-4 w-4 mr-2" /> Imprimer</Button>
                    <Button variant="outline"><Download className="h-4 w-4 mr-2" /> PDF</Button>
                    {inv.status !== 'paid' && (
                        <Button onClick={recordPayment}>Enregistrer paiement</Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Détails</CardTitle>
                        <CardDescription>Client et lignes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <div className="text-sm text-gray-500">Client</div>
                                <div className="font-medium">{inv.customer?.name}</div>
                                {inv.customer?.address && <div className="text-sm text-gray-600">{inv.customer.address}</div>}
                                {inv.customer?.email && <div className="text-sm text-gray-600">{inv.customer.email}</div>}
                            </div>
                            <div>
                                <div className="text-sm text-gray-500">Statut</div>
                                <Badge>{inv.status === 'draft' ? 'Brouillon' : inv.status === 'paid' ? 'Payée' : inv.status === 'overdue' ? 'Échue' : 'Émise'}</Badge>
                                {inv.dueDate && <><div className="text-sm text-gray-500 mt-3">Échéance</div><div className="text-sm">{new Date(inv.dueDate).toLocaleDateString('fr-FR')}</div></>}
                            </div>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Article</TableHead>
                                    <TableHead className="text-right">Qté</TableHead>
                                    <TableHead>Unité</TableHead>
                                    <TableHead className="text-right">PU</TableHead>
                                    <TableHead className="text-right">TVA %</TableHead>
                                    <TableHead className="text-right">Montant</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inv.lines?.map((l, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{l.name}</TableCell>
                                        <TableCell className="text-right">{l.qty}</TableCell>
                                        <TableCell>{l.unit}</TableCell>
                                        <TableCell className="text-right">{nf.format(Number((l as any).unitPrice ?? 0))} FCFA</TableCell>
                                        <TableCell className="text-right">{Number((l as any).tvaRate ?? 0)}</TableCell>
                                        <TableCell className="text-right">{nf.format(Number((l as any).unitPrice ?? 0) * Number(l.qty))} FCFA</TableCell>
                                    </TableRow>
                                ))}
                                {totals.tva > 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-right">TVA</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell className="text-right">{nf.format(totals.tva)} FCFA</TableCell>
                                    </TableRow>
                                )}
                                <TableRow>
                                    <TableCell colSpan={4} className="text-right font-medium">Total</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right font-medium">{nf.format(totals.total)} FCFA</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Règlements</CardTitle>
                        <CardDescription>Historique des paiements</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>Total</span><span className="font-medium">{nf.format(totals.total)} FCFA</span></div>
                            <div className="flex justify-between"><span>Payé</span><span className="font-medium">{nf.format(totals.paid)} FCFA</span></div>
                            <div className="flex justify-between"><span>Solde</span><span className="font-medium">{nf.format(totals.balance)} FCFA</span></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


