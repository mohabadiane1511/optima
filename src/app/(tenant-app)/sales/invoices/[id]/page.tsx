"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";

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
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [loadingIssue, setLoadingIssue] = useState(false);
    const [loadingCancel, setLoadingCancel] = useState(false);
    const [loadingRecord, setLoadingRecord] = useState(false);

    const paymentMethods = [
        { value: "cash", label: "Espèces" },
        { value: "mobile", label: "(Wave, Orange Money)" },
        { value: "card", label: "Carte bancaire" },
        { value: "transfer", label: "Virement bancaire" }
    ];

    async function reload() {
        try {
            const res = await fetch(`/api/tenant/invoices/${id}`, { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur chargement facture');
            setInv(data);
        } catch (e: any) {
            setError(e.message);
        }
    }

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

    async function issueInvoice(): Promise<boolean> {
        try {
            setLoadingIssue(true);
            const res = await fetch(`/api/tenant/invoices/${id}/issue`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Émission impossible');
            toast.success('Facture émise');
            await reload();
            return true;
        } catch (e: any) {
            toast.error(e.message);
            return false;
        } finally { setLoadingIssue(false); }
    }

    function openPaymentDialog() {
        if (!inv) return;
        if (inv.status === 'draft') {
            const confirmIssue = confirm('La facture est en brouillon. Voulez-vous l\'émettre avant d\'enregistrer un paiement ?');
            if (!confirmIssue) return;
            issueInvoice().then(ok => {
                if (ok) {
                    setPaymentAmount(totals.balance.toString());
                    setPaymentDialogOpen(true);
                }
            });
            return;
        }
        if (totals.balance <= 0) {
            toast.error('Solde déjà à 0 — aucun paiement requis.');
            return;
        }
        setPaymentAmount(totals.balance.toString());
        setPaymentDialogOpen(true);
    }

    async function recordPayment() {
        if (!inv) return;
        const amount = Number(paymentAmount);
        if (!amount || amount <= 0) {
            toast.error('Montant invalide');
            return;
        }
        if (amount > totals.balance) {
            toast.error(`Montant saisi (${nf.format(amount)} FCFA) supérieur au solde (${nf.format(totals.balance)} FCFA).`);
            return;
        }
        try {
            setLoadingRecord(true);
            const res = await fetch(`/api/tenant/invoices/${id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, method: paymentMethod }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur');
            toast.success('Paiement enregistré');
            setPaymentDialogOpen(false);
            setPaymentAmount("");
            window.location.reload();
        } catch (e: any) { toast.error(e.message); }
        finally { setLoadingRecord(false); }
    }

    if (loading) return <div className="p-6 text-sm text-gray-500">Chargement…</div>;
    if (error || !inv) return <div className="p-6 text-sm text-red-600">{error || 'Facture introuvable'}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => history.back()}><ArrowLeft className="h-4 w-4" /></Button>
                    <h1 className="text-2xl font-bold">{inv.number || '(brouillon)'}</h1>
                    <p className="text-gray-600">{inv.issueDate ? `Facture du ${new Date(inv.issueDate).toLocaleDateString('fr-FR')}` : 'Brouillon non émis'}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Printer className="h-4 w-4 mr-2" /> Imprimer</Button>
                    <Button variant="outline" onClick={() => window.open(`/api/tenant/invoices/${id}/pdf`, '_blank')}><Download className="h-4 w-4 mr-2" /> PDF</Button>
                    {inv.status === 'draft' && (
                        <Button onClick={issueInvoice} disabled={loadingIssue}>{loadingIssue ? (<><Spinner className="mr-2" />Émission…</>) : 'Émettre'}</Button>
                    )}
                    {(inv.status === 'draft' || inv.status === 'sent' || inv.status === 'overdue') && totals.paid === 0 && (
                        <Button variant="destructive" onClick={async () => {
                            setLoadingCancel(true);
                            if (!confirm('Confirmer l\'annulation de cette facture ?')) return;
                            try {
                                const res = await fetch(`/api/tenant/invoices/${id}/cancel`, { method: 'POST' });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || 'Annulation impossible');
                                toast.success('Facture annulée');
                                await reload();
                            } catch (e: any) { toast.error(e.message); }
                            finally { setLoadingCancel(false); }
                        }} disabled={loadingCancel}>{loadingCancel ? (<><Spinner className="mr-2" />Annulation…</>) : 'Annuler'}</Button>
                    )}
                    {(inv.status === 'sent' || inv.status === 'overdue') && (
                        <Button onClick={openPaymentDialog} disabled={totals.balance <= 0}>Enregistrer paiement</Button>
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
                                <Badge>{inv.status === 'draft' ? 'Brouillon' : inv.status === 'paid' ? 'Payée' : inv.status === 'overdue' ? 'Échue' : inv.status === 'cancelled' ? 'Annulée' : 'Émise'}</Badge>
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

            {/* Modal de paiement */}
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Enregistrer un paiement</DialogTitle>
                        <DialogDescription>
                            Montant restant: {nf.format(totals.balance)} FCFA
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Montant payé (FCFA)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="0"
                                min="0"
                                max={totals.balance}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="method">Méthode de paiement</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner méthode" />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods.map(method => (
                                        <SelectItem key={method.value} value={method.value}>
                                            {method.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={recordPayment} disabled={loadingRecord}>{loadingRecord ? (<><Spinner className="mr-2" />Enregistrement…</>) : 'Enregistrer'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


