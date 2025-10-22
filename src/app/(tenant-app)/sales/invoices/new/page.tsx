"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type Line = { productId?: string; name: string; sku?: string; qty: number; unit: string; price: number; tva: number };
type ProductOption = { id: string; name: string; sku: string; salePrice: number; unit: string };
type Customer = { id: string; name: string; email?: string | null; phone?: string | null; address?: string | null };

export default function NewInvoicePage() {
    const [customer, setCustomer] = useState("");
    const [dueDate, setDueDate] = useState<string>("");
    const [lines, setLines] = useState<Line[]>([]);
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerId, setCustomerId] = useState<string>("");
    const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "", address: "" });
    const nf = useMemo(() => new Intl.NumberFormat('fr-FR'), []);

    const totals = useMemo(() => {
        const ht = lines.reduce((s, l) => s + l.qty * l.price, 0);
        const tva = lines.reduce((s, l) => s + (l.tva / 100) * (l.qty * l.price), 0);
        const ttc = ht + tva;
        return { ht, tva, ttc };
    }, [lines]);

    const addLine = () => setLines(prev => [...prev, { name: "", qty: 1, unit: "unité", price: 0, tva: 18 }]);
    const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

    // Charger produits pour le sélecteur
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/tenant/products', { cache: 'no-store' });
                const data = await res.json();
                if (Array.isArray(data)) {
                    const available = data.filter((p: any) => p.active && Number(p.qtyOnHand || 0) > 0);
                    setProducts(available.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku, salePrice: Number(p.salePrice || 0), unit: p.unit || 'unité' })));
                }
            } catch { }
            try {
                const resC = await fetch('/api/tenant/customers', { cache: 'no-store' });
                const dataC = await resC.json();
                if (Array.isArray(dataC)) setCustomers(dataC);
            } catch { }
        })();
    }, []);

    // Préremplir échéance J+14
    useEffect(() => {
        if (!dueDate) {
            const d = new Date(); d.setDate(d.getDate() + 14);
            setDueDate(d.toISOString().slice(0, 10));
        }
    }, []);

    async function createDraft(): Promise<string | null> {
        try {
            const body = {
                customer: customerId ? { id: customerId, name: customer || customers.find(c => c.id === customerId)?.name } : { name: customer },
                dueDate: dueDate || null,
                lines: lines.map(l => ({ productId: l.productId, name: l.name, sku: l.sku, qty: l.qty, unit: l.unit, price: l.price, tva: l.tva })),
            };
            const res = await fetch('/api/tenant/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error || 'Création impossible'); return null; }
            toast.success('Brouillon enregistré');
            return data.id as string;
        } catch (e: any) { toast.error('Erreur: ' + e.message); return null; }
    }

    const [saving, setSaving] = useState(false);
    const [issuing, setIssuing] = useState(false);
    async function onSaveDraft() {
        const id = await createDraft();
        if (id) window.location.href = `/sales/invoices/${id}`;
    }

    async function onIssue() {
        const id = await createDraft();
        if (!id) return;
        try {
            setIssuing(true);
            const res = await fetch(`/api/tenant/invoices/${id}/issue`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error || 'Émission impossible'); return; }
            toast.success('Facture émise');
            window.location.href = `/sales/invoices/${id}`;
        } catch (e: any) { toast.error('Erreur: ' + e.message); }
        finally { setIssuing(false); }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" asChild><Link href="/sales/invoices"><ArrowLeft className="h-4 w-4" /></Link></Button>
                    <div>
                        <h1 className="text-2xl font-bold">Nouvelle facture</h1>
                        <p className="text-gray-600">Saisissez les informations et enregistrez en brouillon ou émettez</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={async () => { setSaving(true); await onSaveDraft(); setSaving(false); }} disabled={saving || issuing}>{saving ? (<><Spinner className="mr-2" />Enregistrement…</>) : 'Enregistrer brouillon'}</Button>
                    <Button onClick={onIssue} disabled={issuing || saving}>{issuing ? (<><Spinner className="mr-2" />Émission…</>) : 'Émettre'}</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Détails facture</CardTitle>
                        <CardDescription>Client, échéance et lignes</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Client</Label>
                                <div className="flex gap-2">
                                    <Select value={customerId || 'new'} onValueChange={(v) => {
                                        if (v === 'new') { setCustomerId(''); setCustomer(''); }
                                        else { setCustomerId(v); const c = customers.find(x => x.id === v); setCustomer(c?.name || ''); }
                                    }}>
                                        <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner client" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new">— Nouveau client…</SelectItem>
                                            {customers.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button type="button" variant="outline" onClick={() => setCustomerDialogOpen(true)}>Nouveau</Button>
                                </div>
                                <Input className="mt-2" placeholder="Nom client (saisie libre)" value={customer} onChange={(e) => setCustomer(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Échéance</Label>
                                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-600">Lignes</div>
                                <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4 mr-2" />Ajouter une ligne</Button>
                            </div>
                            <div className="w-full overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-[280px]">Article</TableHead>
                                            <TableHead className="min-w-[120px]">SKU</TableHead>
                                            <TableHead className="text-right min-w-[90px]">Qté</TableHead>
                                            <TableHead className="min-w-[120px]">Unité</TableHead>
                                            <TableHead className="text-right min-w-[120px]">PU</TableHead>
                                            <TableHead className="text-right min-w-[100px]">TVA %</TableHead>
                                            <TableHead className="text-right min-w-[140px]">Montant</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lines.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-6 text-sm text-gray-500">
                                                    Aucune ligne. Cliquez sur "Ajouter une ligne" pour commencer.
                                                </TableCell>
                                            </TableRow>
                                        ) : lines.map((l, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="min-w-auto">
                                                    <div className="flex gap-2">
                                                        <Select value={l.productId || 'custom'} onValueChange={(val) => {
                                                            if (val === 'custom') {
                                                                setLines(p => p.map((x, i) => i === idx ? { ...x, productId: undefined } : x));
                                                            } else {
                                                                const prod = products.find(p => p.id === val);
                                                                if (prod) {
                                                                    setLines(p => p.map((x, i) => i === idx ? { ...x, productId: prod.id, name: prod.name, sku: prod.sku, price: prod.salePrice, unit: prod.unit } : x));
                                                                }
                                                            }
                                                        }}>
                                                            <SelectTrigger className="min-w-[200px] h-9"><SelectValue placeholder="Sélectionner un produit" /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="custom">Saisie libre…</SelectItem>
                                                                {products.map(p => (
                                                                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="min-w-[120px]"><Input className="h-9" value={l.sku || ''} placeholder="SKU" onChange={(e) => { const v = e.target.value; setLines(p => p.map((x, i) => i === idx ? { ...x, sku: v } : x)); }} disabled /></TableCell>
                                                <TableCell className="text-right min-w-[90px]"><Input className="h-9" type="number" value={l.qty} onChange={(e) => { const v = Number(e.target.value || 0); setLines(p => p.map((x, i) => i === idx ? { ...x, qty: v } : x)); }} /></TableCell>
                                                <TableCell className="min-w-[120px]">
                                                    <Select value={l.unit} onValueChange={(v) => setLines(p => p.map((x, i) => i === idx ? { ...x, unit: v } : x))}>
                                                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="unité">unité</SelectItem>
                                                            <SelectItem value="kg">kg</SelectItem>
                                                            <SelectItem value="L">L</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-right min-w-[120px]"><Input className="h-9" type="number" value={l.price} onChange={(e) => { const v = Number(e.target.value || 0); setLines(p => p.map((x, i) => i === idx ? { ...x, price: v } : x)); }} disabled /></TableCell>
                                                <TableCell className="text-right min-w-[100px]"><Input className="h-9" type="number" value={l.tva} onChange={(e) => { const v = Number(e.target.value || 0); setLines(p => p.map((x, i) => i === idx ? { ...x, tva: v } : x)); }} /></TableCell>
                                                <TableCell className="text-right">{nf.format(l.qty * l.price * (1 + l.tva / 100))} FCFA</TableCell>
                                                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => removeLine(idx)}><Trash className="h-4 w-4" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Récapitulatif</CardTitle>
                        <CardDescription>Vérifiez les montants</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>Total HT</span><span className="font-medium">{nf.format(totals.ht)} FCFA</span></div>
                            <div className="flex justify-between"><span>TVA</span><span className="font-medium">{nf.format(totals.tva)} FCFA</span></div>
                            <div className="flex justify-between text-base font-semibold pt-2 border-t"><span>Total TTC</span><span>{nf.format(totals.ttc)} FCFA</span></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Nouveau client</DialogTitle>
                        <DialogDescription>Créer un client rapidement</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input placeholder="Nom *" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                        <Input placeholder="Email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                        <Input placeholder="Téléphone" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                        <Input placeholder="Adresse" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCustomerDialogOpen(false)}>Annuler</Button>
                        <Button onClick={async () => {
                            if (!newCustomer.name.trim()) { toast.error('Nom requis'); return; }
                            try {
                                const res = await fetch('/api/tenant/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCustomer) });
                                const data = await res.json();
                                if (!res.ok) { toast.error(data.error || 'Création impossible'); return; }
                                toast.success('Client créé');
                                setCustomers(prev => [{ id: data.id, name: data.name, email: data.email, phone: data.phone, address: data.address }, ...prev]);
                                setCustomerId(data.id); setCustomer(data.name || '');
                                setCustomerDialogOpen(false); setNewCustomer({ name: '', email: '', phone: '', address: '' });
                            } catch (e: any) { toast.error(e.message); }
                        }}>Créer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


