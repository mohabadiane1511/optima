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

type Line = { productId?: string; name: string; sku?: string; qty: number; unit: string; price: number; tva: number };
type ProductOption = { id: string; name: string; sku: string; salePrice: number; unit: string };

export default function NewInvoicePage() {
    const [customer, setCustomer] = useState("");
    const [dueDate, setDueDate] = useState<string>("");
    const [lines, setLines] = useState<Line[]>([]);
    const [products, setProducts] = useState<ProductOption[]>([]);
    const nf = useMemo(() => new Intl.NumberFormat('fr-FR'), []);

    const totals = useMemo(() => {
        const ht = lines.reduce((s, l) => s + l.qty * l.price, 0);
        const tva = lines.reduce((s, l) => s + (l.tva / 100) * (l.qty * l.price), 0);
        const ttc = ht + tva;
        return { ht, tva, ttc };
    }, [lines]);

    const addLine = () => setLines(prev => [...prev, { name: "", qty: 1, unit: "unité", price: 0, tva: 0 }]);
    const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

    // Charger produits pour le sélecteur
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/tenant/products', { cache: 'no-store' });
                const data = await res.json();
                if (Array.isArray(data)) {
                    setProducts(data.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku, salePrice: Number(p.salePrice || 0), unit: p.unit || 'unité' })));
                }
            } catch { }
        })();
    }, []);

    async function createDraft(): Promise<string | null> {
        try {
            const body = {
                customer: { name: customer },
                dueDate: dueDate || null,
                lines: lines.map(l => ({ name: l.name, sku: l.sku, qty: l.qty, unit: l.unit, price: l.price, tva: l.tva })),
            };
            const res = await fetch('/api/tenant/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) { alert(data.error || 'Création impossible'); return null; }
            return data.id as string;
        } catch (e: any) { alert('Erreur: ' + e.message); return null; }
    }

    async function onSaveDraft() {
        const id = await createDraft();
        if (id) window.location.href = `/sales/invoices/${id}`;
    }

    async function onIssue() {
        const id = await createDraft();
        if (!id) return;
        try {
            const res = await fetch(`/api/tenant/invoices/${id}/issue`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) { alert(data.error || 'Émission impossible'); return; }
            window.location.href = `/sales/invoices/${id}`;
        } catch (e: any) { alert('Erreur: ' + e.message); }
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
                    <Button variant="outline" onClick={onSaveDraft}>Enregistrer brouillon</Button>
                    <Button onClick={onIssue}>Émettre</Button>
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
                                <Input placeholder="Rechercher ou saisir client" value={customer} onChange={(e) => setCustomer(e.target.value)} />
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
                                                <TableCell className="min-w-[120px]"><Input className="h-9" value={l.sku || ''} placeholder="SKU" onChange={(e) => {
                                                    const v = e.target.value; setLines(p => p.map((x, i) => i === idx ? { ...x, sku: v } : x));
                                                }} /></TableCell>
                                                <TableCell className="text-right min-w-[90px]"><Input className="h-9" type="number" value={l.qty} onChange={(e) => {
                                                    const v = Number(e.target.value || 0); setLines(p => p.map((x, i) => i === idx ? { ...x, qty: v } : x));
                                                }} /></TableCell>
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
                                                <TableCell className="text-right min-w-[120px]"><Input className="h-9" type="number" value={l.price} onChange={(e) => {
                                                    const v = Number(e.target.value || 0); setLines(p => p.map((x, i) => i === idx ? { ...x, price: v } : x));
                                                }} /></TableCell>
                                                <TableCell className="text-right min-w-[100px]"><Input className="h-9" type="number" value={l.tva} onChange={(e) => {
                                                    const v = Number(e.target.value || 0); setLines(p => p.map((x, i) => i === idx ? { ...x, tva: v } : x));
                                                }} /></TableCell>
                                                <TableCell className="text-right">{nf.format(Number(l.qty) * Number(l.price) * (1 + Number(l.tva) / 100))} FCFA</TableCell>
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
        </div>
    );
}


