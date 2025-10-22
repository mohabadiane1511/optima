"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CldUploadWidget } from "next-cloudinary";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Inv = {
    id: string; status: string; number?: string | null; supplier?: string | null;
    invoiceDate: string; dueDate?: string | null; note?: string | null;
    attachmentUrl?: string | null; attachmentPublicId?: string | null; attachmentName?: string | null; attachmentSize?: number | null;
    totalHT: number; totalTVA: number; totalTTC: number;
    lines: { id: string; name: string; qty: number; unit: string; unitPrice: number; taxRate: number; totalTTC: number }[];
    payments: { id: string; amount: number; method: string; reference?: string | null; paidAt: string }[];
};

export default function SupplierInvoiceDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id as string;
    const router = useRouter();
    const [inv, setInv] = useState<Inv | null>(null);
    const [loading, setLoading] = useState(false);
    const [number, setNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [note, setNote] = useState('');
    const [att, setAtt] = useState<{ url?: string; publicId?: string; name?: string; size?: number } | null>(null);
    const [payAmount, setPayAmount] = useState<number>(0);
    const [payMethod, setPayMethod] = useState<string>('transfer');
    const [loadingPostStatus, setLoadingPostStatus] = useState<boolean>(false);
    const [loadingAddPayment, setLoadingAddPayment] = useState<boolean>(false);

    const money = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n || 0)));
    const methodLabel = (m?: string | null) => {
        switch ((m || '').toLowerCase()) {
            case 'transfer': return 'Virement bancaire';
            case 'card': return 'Carte bancaire';
            case 'mobile': return 'Paiement mobile (Wave/Orange Money)';
            case 'cash': return 'Espèces';
            case 'other': return 'Autre';
            default: return m || '—';
        }
    };
    const makeInlinePdfUrl = (url?: string | null) => {
        if (!url) return '';
        try {
            // Normaliser toute URL en livraison RAW et forcer l'affichage inline
            let u = url;
            if (u.includes('/image/upload/')) u = u.replace('/image/upload/', '/raw/upload/');
            if (u.includes('/video/upload/')) u = u.replace('/video/upload/', '/raw/upload/');
            if (u.includes('/raw/upload/') && !u.includes('/raw/upload/fl_attachment:false/')) {
                u = u.replace('/raw/upload/', '/raw/upload/fl_attachment:false/');
            }
            return u;
        } catch { return url || ''; }
    };

    useEffect(() => {
        if (!id) return;
        const run = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/tenant/purchases/invoices/${id}`);
                if (!res.ok) throw new Error();
                const j = await res.json();
                setInv(j);
                setNumber(j.number || '');
                setInvoiceDate(j.invoiceDate ? j.invoiceDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
                setDueDate(j.dueDate ? j.dueDate.slice(0, 10) : '');
                setNote(j.note || '');
                // Préremplir le montant avec le solde restant à payer
                const paidSum = Array.isArray(j.payments) ? j.payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0) : 0;
                const remaining = Math.max(0, Number(j.totalTTC || 0) - paidSum);
                setPayAmount(remaining);
            } catch {
            } finally { setLoading(false); }
        };
        run();
    }, [id]);

    if (!inv) return <div className="p-6">{loading ? 'Chargement…' : 'Introuvable'}</div>;

    const postStatus = async (status: 'posted' | 'cancelled') => {
        try {
            setLoadingPostStatus(true);
            const payload: any = { status, number, invoiceDate, dueDate: dueDate || undefined, note: note || undefined };
            if (att?.url) payload.attachment = att;
            const res = await fetch(`/api/tenant/purchases/invoices/${inv.id}/status`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
            const j = await res.json();
            if (!res.ok) { toast.error(j?.error || 'Erreur'); return; }
            toast.success(status === 'posted' ? 'Facture validée' : 'Facture annulée');
            // Mettre à jour localement le statut pour éviter un refresh manuel
            setInv((prev) => prev ? { ...prev, status: j?.status || status } as any : prev);
            router.refresh();
        } catch { toast.error('Erreur'); }
        finally { setLoadingPostStatus(false); }
    };

    const addPayment = async () => {
        try {
            setLoadingAddPayment(true);
            const res = await fetch(`/api/tenant/purchases/invoices/${inv.id}/payments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ amount: payAmount, method: payMethod }) });
            const j = await res.json();
            if (!res.ok) { toast.error(j?.error || 'Erreur'); return; }
            toast.success('Paiement enregistré');
            // Mettre à jour localement le statut et le solde restant
            setInv((prev) => prev ? { ...prev, status: j?.status || prev.status, payments: [...prev.payments, { id: j?.paymentId || Math.random().toString(36).slice(2), amount: payAmount, method: payMethod, paidAt: new Date().toISOString() }] } as any : prev);
            const remaining = Math.max(0, Number(inv.totalTTC || 0) - Number(j?.paidSum || 0));
            setPayAmount(remaining);
            router.refresh();
        } catch { toast.error('Erreur'); }
        finally { setLoadingAddPayment(false); }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.back()}>← Retour</Button>
                    <h1 className="text-2xl font-semibold">Facture fournisseur</h1>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    {inv.status === 'draft' && <>
                        <Button variant="outline" onClick={() => postStatus('cancelled')} disabled={loadingPostStatus}>Annuler</Button>
                        <Button onClick={() => postStatus('posted')} disabled={loadingPostStatus}>{loadingPostStatus ? (<><Spinner className="mr-2" />Validation…</>) : 'Valider'}</Button>
                    </>}
                    {inv.status === 'posted' && <span className="px-2 py-1 rounded border">Validée</span>}
                    {inv.status === 'paid' && <span className="px-2 py-1 rounded border bg-green-600 text-white">Payée</span>}
                    {inv.status === 'cancelled' && <span className="px-2 py-1 rounded border">Annulée</span>}
                </div>
            </div>

            <Card className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <Label>Numéro</Label>
                        <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="N° facture" />
                    </div>
                    <div>
                        <Label>Date</Label>
                        <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                    </div>
                    <div>
                        <Label>Échéance</Label>
                        <Input type="date" value={dueDate || ''} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                    <div>
                        <Label>Fournisseur</Label>
                        <Input value={inv.supplier || ''} readOnly />
                    </div>
                    <div className="col-span-2">
                        <Label>Note</Label>
                        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                </div>
            </Card>

            <Card className="p-4">
                <div className="font-medium mb-2">Pièce jointe (PDF)</div>
                <div className="flex items-center gap-3">
                    {inv.attachmentUrl && !att?.url && (
                        <a className="text-blue-600 underline" href={makeInlinePdfUrl(inv.attachmentUrl)} target="_blank" rel="noreferrer">Ouvrir le PDF existant</a>
                    )}
                    {att?.url && (
                        <a className="text-blue-600 underline" href={makeInlinePdfUrl(att.url)} target="_blank" rel="noreferrer">Ouvrir le PDF téléversé</a>
                    )}
                    <CldUploadWidget
                        uploadPreset="optima-supplier-invoices"
                        onSuccess={(res: any) => {
                            const info = (res?.info || {}) as any;
                            setAtt({ url: info.secure_url, publicId: info.public_id, name: info.original_filename, size: info.bytes });
                            toast.success('PDF téléversé');
                        }}
                        options={{ resourceType: 'raw', multiple: false, folder: 'optima-supplier-invoices', clientAllowedFormats: ['pdf'] }}
                    >
                        {({ open }) => <Button variant="outline" onClick={() => open()}>Téléverser / Remplacer</Button>}
                    </CldUploadWidget>
                </div>
            </Card>

            <Card className="p-4">
                <div className="font-medium mb-2">Lignes</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-500">
                            <tr>
                                <th className="py-1">Désignation</th>
                                <th className="py-1">Qté</th>
                                <th className="py-1">PU</th>
                                <th className="py-1">TVA %</th>
                                <th className="py-1">Total TTC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inv.lines.map((l) => (
                                <tr key={l.id} className="border-t">
                                    <td className="py-1">{l.name}</td>
                                    <td className="py-1">{Number(l.qty)}</td>
                                    <td className="py-1">{money(l.unitPrice)} FCFA</td>
                                    <td className="py-1">{Number(l.taxRate)}</td>
                                    <td className="py-1">{money(l.totalTTC)} FCFA</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="text-right mt-3 text-sm">
                        <div>Total HT: {money(inv.totalHT)} FCFA</div>
                        <div>TVA: {money(inv.totalTVA)} FCFA</div>
                        <div className="font-medium">Total TTC: {money(inv.totalTTC)} FCFA</div>
                    </div>
                </div>
            </Card>

            {/* Paiements */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="font-medium mb-2">Paiements</div>
                    {inv.status === 'posted' && (
                        <Button onClick={() => {
                            const el = document.getElementById('payment-form');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}>Enregistrer un règlement</Button>
                    )}
                </div>
                <div className="space-y-2">
                    {inv.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                            <div>{new Date(p.paidAt).toLocaleDateString('fr-FR')} • {methodLabel(p.method)} {p.reference ? `(${p.reference})` : ''}</div>
                            <div className="font-medium">{money(p.amount)} FCFA</div>
                        </div>
                    ))}
                </div>
                {inv.status === 'posted' && (
                    <div id="payment-form" className="mt-3 grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                            <Label>Montant</Label>
                            <Input type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value || 0))} />
                        </div>
                        <div className="col-span-6">
                            <Label>Méthode</Label>
                            <Select value={payMethod} onValueChange={setPayMethod}>
                                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="transfer">Virement bancaire</SelectItem>
                                    <SelectItem value="card">Carte bancaire</SelectItem>
                                    <SelectItem value="mobile">Paiement mobile (Wave/Orange Money)</SelectItem>
                                    <SelectItem value="cash">Espèces</SelectItem>
                                    <SelectItem value="other">Autre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2 text-right">
                            <Button onClick={addPayment} disabled={loadingAddPayment}>{loadingAddPayment ? (<><Spinner className="mr-2" />Enregistrement…</>) : 'Enregistrer'}</Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}


