"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Spinner } from "@/components/ui/spinner";

type Po = {
    id: string;
    supplier: string;
    status: string;
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
    createdAt: string;
    lines: { id: string; name: string; qty: number; unit: string; unitPrice: number; taxRate: number; totalTTC: number }[];
    tenant?: { name?: string | null; logoUrl?: string | null };
    receipt?: { id?: string; status?: string; receivedByLine?: Record<string, number> } | null;
};

const money = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(Number(n || 0)));

export default function PurchaseOrderDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id as string;
    const [po, setPo] = useState<Po | null>(null);
    const router = useRouter();
    const [sendOpen, setSendOpen] = useState(false);
    const [sendTo, setSendTo] = useState("");
    const [sendSubject, setSendSubject] = useState("");
    const [sendMessage, setSendMessage] = useState("");
    const [receiveOpen, setReceiveOpen] = useState(false);
    const [receiveNote, setReceiveNote] = useState("");
    const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});
    const [loadingConfirm, setLoadingConfirm] = useState(false);
    const [loadingSend, setLoadingSend] = useState(false);
    const [loadingReceive, setLoadingReceive] = useState(false);

    useEffect(() => {
        if (!id) return;
        const run = async () => {
            try {
                const res = await fetch(`/api/tenant/purchases/orders/${id}`);
                if (!res.ok) throw new Error();
                setPo(await res.json());
            } catch { }
        };
        run();
    }, [id]);

    if (!po) return <div className="p-6">Chargement…</div>;

    const openSend = () => {
        if (!po) return;
        const subject = `Commande d’achat ${po.id.substring(0, 8).toUpperCase()} – ${po.supplier}`;
        const bodyLines = po.lines
            .map((l) => `- ${l.name} × ${l.qty} @ ${new Intl.NumberFormat('fr-FR').format(Math.round(Number(l.unitPrice)))} FCFA (TVA ${l.taxRate}%)`)
            .join("\n");
        const body = `Bonjour ${po.supplier},\n\nMerci de confirmer la commande suivante :\n${bodyLines}\n\nTotal TTC: ${new Intl.NumberFormat('fr-FR').format(Math.round(Number(po.totalTTC)))} FCFA.\n\nCordialement,`;
        setSendSubject(subject);
        setSendMessage(body);
        const maybeEmail = (po.supplier || '').includes('@') ? po.supplier : '';
        setSendTo(maybeEmail);
        setSendOpen(true);
    };

    const onConfirm = async () => {
        try {
            setLoadingConfirm(true);
            const res = await fetch(`/api/tenant/purchases/orders/${id}/confirm`, { method: 'POST' });
            if (!res.ok) throw new Error();
            // recharger les données (inclut auto-réception not_received)
            const refreshed = await fetch(`/api/tenant/purchases/orders/${id}`);
            if (refreshed.ok) setPo(await refreshed.json()); else setPo((prev) => prev ? { ...prev, status: 'confirmed' } as Po : prev);
            toast.success('Commande confirmée');
        } catch {
            toast.error('Erreur lors de la confirmation');
        } finally {
            setLoadingConfirm(false);
        }
    };

    const openReceive = () => {
        if (!po) return;
        // Préremplir avec la quantité restante par ligne
        const map: Record<string, number> = {};
        const receivedMap = po.receipt?.receivedByLine || {};
        for (const l of po.lines) {
            const ordered = Number(l.qty || 0);
            const received = Number(receivedMap[l.id] || 0);
            const remaining = Math.max(0, ordered - received);
            map[l.id] = remaining;
        }
        setReceiveQty(map);
        setReceiveNote("");
        setReceiveOpen(true);
    };

    const submitReceive = async () => {
        try {
            const lines = Object.entries(receiveQty)
                .map(([poLineId, qty]) => ({ poLineId, qty: Number(qty || 0) }))
                .filter((l) => Number.isFinite(l.qty) && l.qty > 0);
            if (lines.length === 0) { toast.error('Veuillez saisir au moins une quantité'); return; }
            const idem = Math.random().toString(36).slice(2);
            const res = await fetch(`/api/tenant/purchases/orders/${id}/receive`, {
                method: 'POST', headers: { 'content-type': 'application/json', 'x-idempotency-key': idem }, body: JSON.stringify({ lines, note: receiveNote || undefined })
            });
            if (!res.ok) throw new Error();
            setReceiveOpen(false);
            // Recharger la commande (pour statut et cumuls)
            const refreshed = await fetch(`/api/tenant/purchases/orders/${id}`);
            if (refreshed.ok) setPo(await refreshed.json());
            toast.success('Réception enregistrée');
        } catch {
            toast.error('Erreur lors de la réception');
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.back()}>← Retour</Button>
                    <h1 className="text-2xl font-semibold">Commande {po.id.substring(0, 8).toUpperCase()}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(`/api/tenant/purchases/orders/${po.id}/pdf`, '_blank')}>Télécharger PDF</Button>
                    {po.status === 'created' && <Badge variant="secondary">Créée</Badge>}
                    {po.status === 'confirmed' && <Badge>Confirmée</Badge>}
                    {po.status === 'received' && <Badge className="bg-green-600 hover:bg-green-600">Réceptionnée</Badge>}
                </div>
            </div>

            {/* Actions */}
            {po.status === 'created' && (
                <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={openSend} disabled={sendOpen}>Envoyer au fournisseur</Button>
                    <Button onClick={onConfirm} disabled={loadingConfirm}>{loadingConfirm ? (<><Spinner className="mr-2" />Confirmation…</>) : 'Confirmer la commande'}</Button>
                </div>
            )}
            {po.status === 'confirmed' && (
                <div className="flex gap-2 justify-end">
                    {po.receipt?.id && (
                        <Button variant="outline" onClick={() => window.open(`/purchases/receipts/${po.receipt?.id}`, '_blank')}>Voir la réception</Button>
                    )}
                    <Button onClick={openReceive}>Réceptionner</Button>
                </div>
            )}

            <Card className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Fournisseur</div>
                        <div className="font-medium">{po.supplier}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Date</div>
                        <div className="font-medium">{new Date(po.createdAt).toLocaleDateString('fr-FR')}</div>
                    </div>
                </div>
            </Card>

            {/* Envoi commande – Modale */}
            <Dialog open={sendOpen} onOpenChange={setSendOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Envoyer la commande</DialogTitle>
                        <DialogDescription>Composez votre message et joignez le PDF de la commande.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-12 items-center gap-2">
                            <div className="col-span-2 text-gray-500">À</div>
                            <div className="col-span-10"><Input placeholder="email@fournisseur.com" value={sendTo} onChange={(e) => setSendTo(e.target.value)} /></div>
                            <div className="col-span-2 text-gray-500">Objet</div>
                            <div className="col-span-10"><Input value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} /></div>
                        </div>
                        <Textarea rows={10} value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} />

                        <Card className="p-3 flex items-center justify-between">
                            <div>
                                <div className="font-medium">{po.id.substring(0, 8).toUpperCase()}-commande.pdf</div>
                                <div className="text-gray-600">Résumé de la commande (simulation PDF)</div>
                            </div>
                            <Button variant="outline" onClick={async () => {
                                const pdf = await PDFDocument.create();
                                const page = pdf.addPage([595.28, 841.89]); // A4 portrait
                                const font = await pdf.embedFont(StandardFonts.Helvetica);
                                const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
                                const { width, height } = page.getSize();
                                const margin = 40;
                                // Remplacer uniquement les espaces insécables; conserver les accents (WinAnsi OK)
                                const clean = (t: string) => (t || "").replace(/[\u202F\u00A0]/g, ' ');
                                const draw = (txt: string, opts: any) => page.drawText(clean(txt), opts);
                                const line = (y: number) => page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

                                // Header: logo si disponible, sinon nom tenant
                                if (po.tenant?.logoUrl) {
                                    try {
                                        const resp = await fetch(po.tenant.logoUrl);
                                        if (resp.ok) {
                                            const imgBytes = await resp.arrayBuffer();
                                            const img = await pdf.embedPng(imgBytes);
                                            const max = 80; const ar = img.width / img.height;
                                            const wImg = ar > 1 ? max : max * ar; const hImg = ar > 1 ? max / ar : max;
                                            page.drawImage(img, { x: margin, y: height - 10 - hImg, width: wImg, height: hImg });
                                        }
                                    } catch { }
                                } else {
                                    draw(clean(po.tenant?.name || 'OPTIMA'), { x: margin, y: height - 50, size: 18, font: bold });
                                }
                                draw("Commande d'achat", { x: width - margin - 160, y: height - 50, size: 18, font: bold });
                                draw(`N° ${po.id.substring(0, 8).toUpperCase()}`, { x: width - margin - 160, y: height - 68, size: 10, font });
                                line(height - 78);

                                // Supplier / date
                                draw('Fournisseur', { x: margin, y: height - 100, size: 10, font: bold });
                                draw(`${po.supplier}`, { x: margin, y: height - 114, size: 10, font });
                                draw('Date', { x: width - margin - 160, y: height - 100, size: 10, font: bold });
                                draw(`${new Date(po.createdAt).toLocaleDateString('fr-FR')}`, { x: width - margin - 160, y: height - 114, size: 10, font });

                                // Table header
                                const tableTop = height - 150;
                                const w = width - 2 * margin;
                                const col = [0.5, 0.1, 0.15, 0.1, 0.15];
                                const x = [margin, margin + col[0] * w, margin + (col[0] + col[1]) * w, margin + (col[0] + col[1] + col[2]) * w, margin + (col[0] + col[1] + col[2] + col[3]) * w];
                                const header = ['Désignation', 'Qté', 'PU', 'TVA %', 'Total TTC'];
                                header.forEach((h, i) => draw(h, { x: x[i] + 2, y: tableTop, size: 10, font: bold }));
                                line(tableTop - 6);

                                let y = tableTop - 20;
                                const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n || 0))).replace(/[\u202F\u00A0]/g, ' ') + ' FCFA';
                                for (const l of po.lines) {
                                    const total = Number(l.qty) * Number(l.unitPrice) * (1 + Number(l.taxRate) / 100);
                                    draw(l.name, { x: x[0] + 2, y, size: 10, font });
                                    draw(String(l.qty), { x: x[1] + 2, y, size: 10, font });
                                    draw(fmt(l.unitPrice).replace(' FCFA', ''), { x: x[2] + 2, y, size: 10, font });
                                    draw(String(l.taxRate), { x: x[3] + 2, y, size: 10, font });
                                    draw(fmt(total), { x: x[4] + 2, y, size: 10, font });
                                    y -= 16;
                                }

                                line(y - 6);
                                draw('Total HT', { x: x[3] - 40, y: y - 22, size: 10, font: bold });
                                draw(fmt(po.totalHT), { x: x[4] + 2, y: y - 22, size: 10, font: bold });
                                draw('TVA', { x: x[3] - 40, y: y - 38, size: 10, font: bold });
                                draw(fmt(po.totalTVA), { x: x[4] + 2, y: y - 38, size: 10, font: bold });
                                draw('Total TTC', { x: x[3] - 40, y: y - 54, size: 12, font: bold });
                                draw(fmt(po.totalTTC), { x: x[4] + 2, y: y - 54, size: 12, font: bold });

                                // Footer
                                page.drawLine({ start: { x: margin, y: 60 }, end: { x: width - margin, y: 60 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
                                draw("Document généré par Optima ERP - https://optima-erp.com", { x: width / 2 - 100, y: 48, size: 9, font: bold });

                                const bytes = await pdf.save();
                                const blob = new Blob([bytes as any], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                window.open(url, '_blank');
                            }}>Aperçu PDF</Button>
                        </Card>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={loadingSend}>Annuler</Button>
                            <Button disabled={loadingSend} onClick={async () => {
                                try {
                                    setLoadingSend(true);
                                    const idem = Math.random().toString(36).slice(2);
                                    const res = await fetch(`/api/tenant/purchases/orders/${po.id}/send`, { method: 'POST', headers: { 'x-idempotency-key': idem, 'content-type': 'application/json' }, body: JSON.stringify({ to: sendTo, subject: sendSubject, message: sendMessage }) });
                                    if (!res.ok) throw new Error();
                                    setSendOpen(false);
                                    toast.success('Commande envoyée au fournisseur');
                                } catch {
                                    toast.error("Erreur lors de l'envoi de la commande");
                                } finally {
                                    setLoadingSend(false);
                                }
                            }}>{loadingSend ? (<><Spinner className="mr-2" />Envoi…</>) : 'Envoyer'}</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Card className="p-4">
                <div className="font-medium mb-2">Lignes</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-500">
                            <tr>
                                <th className="py-1">Désignation</th>
                                <th className="py-1">Qté</th>
                                {po.receipt && <th className="py-1">Reçu</th>}
                                {po.receipt && <th className="py-1">Restant</th>}
                                <th className="py-1">PU</th>
                                <th className="py-1">TVA %</th>
                                <th className="py-1">Total TTC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {po.lines.map((l) => (
                                <tr key={l.id} className="border-t">
                                    <td className="py-1">{l.name}</td>
                                    <td className="py-1">{Number(l.qty)}</td>
                                    {po.receipt && (
                                        <>
                                            <td className="py-1">{Number(po.receipt.receivedByLine?.[l.id] || 0)}</td>
                                            <td className="py-1">{Math.max(0, Number(l.qty || 0) - Number(po.receipt.receivedByLine?.[l.id] || 0))}</td>
                                        </>
                                    )}
                                    <td className="py-1">{money(l.unitPrice)} FCFA</td>
                                    <td className="py-1">{Number(l.taxRate)}</td>
                                    <td className="py-1">{money(l.totalTTC)} FCFA</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="text-right mt-3 text-sm">
                    <div>Total HT: {money(po.totalHT)} FCFA</div>
                    <div>TVA: {money(po.totalTVA)} FCFA</div>
                    <div className="font-medium">Total TTC: {money(po.totalTTC)} FCFA</div>
                </div>
            </Card>

            {/* Réception – Modale */}
            <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
                <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Enregistrer une réception</DialogTitle>
                        <DialogDescription>Saisissez les quantités reçues par ligne. La sur‑réception est refusée.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left text-gray-500">
                                    <tr>
                                        <th className="py-1">Désignation</th>
                                        <th className="py-1">Commandé</th>
                                        <th className="py-1">Déjà reçu</th>
                                        <th className="py-1">Restant</th>
                                        <th className="py-1">Qté à recevoir</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {po.lines.map((l) => {
                                        const ordered = Number(l.qty || 0);
                                        const received = Number(po.receipt?.receivedByLine?.[l.id] || 0);
                                        const remaining = Math.max(0, ordered - received);
                                        return (
                                            <tr key={l.id} className="border-t">
                                                <td className="py-1">{l.name}</td>
                                                <td className="py-1">{ordered}</td>
                                                <td className="py-1">{received}</td>
                                                <td className="py-1">{remaining}</td>
                                                <td className="py-1">
                                                    <Input type="number" min={0} max={remaining} value={receiveQty[l.id] ?? 0} onChange={(e) => setReceiveQty((prev) => ({ ...prev, [l.id]: Number(e.target.value || 0) }))} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <Label>Note (optionnel)</Label>
                            <Textarea value={receiveNote} onChange={(e) => setReceiveNote(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setReceiveOpen(false)} disabled={loadingReceive}>Annuler</Button>
                            <Button onClick={async () => { setLoadingReceive(true); await submitReceive(); setLoadingReceive(false); }} disabled={loadingReceive}>{loadingReceive ? (<><Spinner className="mr-2" />Enregistrement…</>) : 'Enregistrer'}</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}


