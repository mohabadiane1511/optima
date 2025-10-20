"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import Link from "next/link";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type RfqLine = {
    id: string;
    item: string;
    quantity: number;
    estimatedPrice: number;
    taxRate: number; // %
};

type Rfq = {
    id: string;
    suppliers: string[];
    status: "draft" | "sent" | "closed";
    createdAt: string; // ISO
    note?: string;
    lines: RfqLine[];
    number?: string; // legacy UI
    purchaseOrderIds?: string[];
};

const currency = (n: number) =>
    new Intl.NumberFormat("fr-FR").format(Math.round(n));

export default function PurchasesRfqPage() {
    const [rfqs, setRfqs] = useState<Rfq[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<"all" | Rfq["status"]>("all");
    const [search, setSearch] = useState("");
    const filtered = useMemo(() => {
        return rfqs.filter((r) => {
            const sOk = statusFilter === "all" || r.status === statusFilter;
            const q = search.trim().toLowerCase();
            const num = r.number || r.id;
            const qOk = !q || num.toLowerCase().includes(q) || r.suppliers.join(", ").toLowerCase().includes(q);
            return sOk && qOk;
        });
    }, [rfqs, statusFilter, search]);

    // Chargement initial liste
    useEffect(() => {
        const controller = new AbortController();
        const fetchRfqs = async () => {
            try {
                setLoading(true); setError(null);
                const params = new URLSearchParams();
                if (statusFilter !== 'all') params.set('status', statusFilter);
                if (search.trim()) params.set('q', search.trim());
                const res = await fetch(`/api/tenant/purchases/rfqs?${params.toString()}`, { signal: controller.signal });
                if (!res.ok) throw new Error('Erreur chargement RFQ');
                const data = await res.json();
                const items = (data?.items || []).map((it: any) => ({
                    id: it.id,
                    suppliers: it.suppliers || [],
                    status: it.status,
                    createdAt: it.createdAt,
                    note: it.note || undefined,
                    lines: [],
                    number: it.id.substring(0, 8).toUpperCase(),
                })) as Rfq[];
                setRfqs(items);
            } catch (e: any) {
                if (e?.name !== 'AbortError') setError(e?.message || 'Erreur');
            } finally { setLoading(false); }
        };
        fetchRfqs();
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, search]);

    // Création RFQ (API) + auto-complétion fournisseurs
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
    const [supplierQuery, setSupplierQuery] = useState("");
    const [supplierLoading, setSupplierLoading] = useState(false);
    const [supplierSuggestions, setSupplierSuggestions] = useState<{ id: string; name: string }[]>([]);
    // Auto-complétion fournisseurs (recherche)
    useEffect(() => {
        if (!supplierQuery.trim()) { setSupplierSuggestions([]); return; }
        const ctrl = new AbortController();
        const t = setTimeout(async () => {
            try {
                setSupplierLoading(true);
                const params = new URLSearchParams({ q: supplierQuery.trim(), limit: "8" });
                const res = await fetch(`/api/tenant/suppliers?${params}`, { signal: ctrl.signal });
                if (!res.ok) throw new Error();
                const data = await res.json();
                const items = (data?.items || []).map((s: any) => ({ id: s.id, name: s.name }));
                setSupplierSuggestions(items);
            } catch {
                setSupplierSuggestions([]);
            } finally {
                setSupplierLoading(false);
            }
        }, 250);
        return () => { clearTimeout(t); ctrl.abort(); };
    }, [supplierQuery]);
    const [cNote, setCNote] = useState<string>("");
    const [cLines, setCLines] = useState<RfqLine[]>([
        { id: "c1", item: "Article", quantity: 1, estimatedPrice: 0, taxRate: 18 },
    ]);

    const addLine = () => {
        setCLines((prev) => [
            ...prev,
            { id: `c${prev.length + 1}`, item: "", quantity: 1, estimatedPrice: 0, taxRate: 18 },
        ]);
    };

    const totalLine = (l: RfqLine) => l.quantity * l.estimatedPrice * (1 + l.taxRate / 100);
    const totalRfq = (r: Rfq) => r.lines.reduce((s, l) => s + totalLine(l), 0);
    const totalCreate = cLines.reduce((s, l) => s + totalLine(l), 0);

    const createRfq = async () => {
        const suppliers = selectedSuppliers.length ? selectedSuppliers : [];
        const payload = {
            suppliers,
            note: cNote || undefined,
            lines: cLines.map((l) => ({ item: l.item, quantity: l.quantity, estimatedPrice: l.estimatedPrice, taxRate: l.taxRate }))
        };
        const res = await fetch('/api/tenant/purchases/rfqs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) { toast.error('Erreur lors de la création de la RFQ'); return; }
        // recharger la liste
        setCreateOpen(false);
        setSelectedSuppliers([]); setSupplierQuery(""); setSupplierSuggestions([]); setCNote(""); setCLines([{ id: 'c1', item: 'Article', quantity: 1, estimatedPrice: 0, taxRate: 18 }]);
        const refresh = await fetch('/api/tenant/purchases/rfqs');
        if (refresh.ok) {
            const data = await refresh.json();
            const items = (data?.items || []).map((it: any) => ({
                id: it.id,
                suppliers: it.suppliers || [],
                status: it.status,
                createdAt: it.createdAt,
                note: it.note || undefined,
                lines: [],
                number: it.id.substring(0, 8).toUpperCase(),
            })) as Rfq[];
            setRfqs(items);
        }
        toast.success('Brouillon RFQ créé');
    };

    // Détail RFQ (fake)
    const [detail, setDetail] = useState<Rfq | null>(null);
    const loadDetail = async (id: string) => {
        const res = await fetch(`/api/tenant/purchases/rfqs/${id}`);
        if (!res.ok) return;
        const d = await res.json();
        const rfq: Rfq = {
            id: d.id,
            suppliers: d.suppliers || [],
            status: d.status,
            createdAt: d.createdAt,
            note: d.note || undefined,
            lines: (d.lines || []).map((l: any) => ({ id: l.id, item: l.item, quantity: Number(l.quantity), estimatedPrice: Number(l.estimatedPrice), taxRate: Number(l.taxRate) })),
            number: d.id.substring(0, 8).toUpperCase(),
            purchaseOrderIds: Array.isArray(d.purchaseOrders) ? d.purchaseOrders.map((p: any) => p.id) : [],
        };
        setDetail(rfq);
        if (rfq.status === 'sent' || rfq.status === 'closed') {
            // charger les offres automatiquement
            await loadOffers(rfq);
        }
    };
    const setStatus = async (r: Rfq, s: Rfq["status"]) => {
        const res = await fetch(`/api/tenant/purchases/rfqs/${r.id}/status`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: s }) });
        if (!res.ok) { toast.error('Erreur lors du changement de statut'); return; }
        setRfqs((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: s } : x)));
        setDetail((d) => (d && d.id === r.id ? { ...d, status: s } : d));
        if (s === 'sent') toast.success('RFQ envoyée');
        else if (s === 'closed') toast.success('RFQ clôturée');
        else toast.success('Statut mis à jour');
    };

    // Offres reçues (fake) : par ligne, une proposition par fournisseur
    type Offer = { lineId: string; supplier: string; price: number; lead: number };
    const [offers, setOffers] = useState<Record<string, Offer[]>>({}); // key = rfq.id
    const [selected, setSelected] = useState<Record<string, Offer>>({}); // key = lineId → offer
    const [convertOpen, setConvertOpen] = useState(false);
    const [convertSupplier, setConvertSupplier] = useState<string>("");
    // Saisie offres réelles
    const [newOfferSupplier, setNewOfferSupplier] = useState<Record<string, string>>({});
    const [newOfferPrice, setNewOfferPrice] = useState<Record<string, number>>({});
    const [newOfferLead, setNewOfferLead] = useState<Record<string, number>>({});
    const [newOfferNotes, setNewOfferNotes] = useState<Record<string, string>>({});

    const loadOffers = async (r: Rfq) => {
        const res = await fetch(`/api/tenant/purchases/rfqs/${r.id}/offers`);
        if (!res.ok) { toast.error('Erreur lors du chargement des offres'); return; }
        const list = await res.json();
        const off: Offer[] = (list || []).map((o: any) => ({ lineId: o.lineId, supplier: o.supplier, price: Number(o.price), lead: Number(o.lead) }));
        setOffers((prev) => ({ ...prev, [r.id]: off }));
        const byLine: Record<string, Offer[]> = {};
        off.forEach((o) => { byLine[o.lineId] = byLine[o.lineId] ? [...byLine[o.lineId], o] : [o]; });
        const chosen: Record<string, Offer> = {};
        Object.keys(byLine).forEach((lineId) => {
            const arr = byLine[lineId];
            if (arr.length) {
                const best = arr.reduce((a, b) => (a.price <= b.price ? a : b));
                chosen[lineId] = best;
            }
        });
        setSelected((prev) => ({ ...prev, ...chosen }));
    };

    const addOffer = async (r: Rfq, lineId: string) => {
        const supplier = (newOfferSupplier[lineId] || '').trim();
        const price = Number(newOfferPrice[lineId] || 0);
        const lead = Number(newOfferLead[lineId] || 0);
        const notes = (newOfferNotes[lineId] || '').trim() || null;
        if (!supplier || price <= 0) { toast.error('Fournisseur et prix requis'); return; }
        const payload = { offers: [{ lineId, supplier, price, lead, notes }] };
        const res = await fetch(`/api/tenant/purchases/rfqs/${r.id}/offers`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) { toast.error('Erreur lors de l\'enregistrement de l\'offre'); return; }
        await loadOffers(r);
        setNewOfferPrice((prev) => ({ ...prev, [lineId]: 0 }));
        setNewOfferLead((prev) => ({ ...prev, [lineId]: 0 }));
        setNewOfferNotes((prev) => ({ ...prev, [lineId]: '' }));
        toast.success('Offre ajoutée');
    };

    // Envoi RFQ (fake): destinataires, message, pièce jointe simulée
    const [sendOpen, setSendOpen] = useState(false);
    const [sendSubject, setSendSubject] = useState("");
    const [sendMessage, setSendMessage] = useState("");

    const openSend = (r: Rfq) => {
        // Préparer un sujet et un message par défaut
        const subject = `Demande de prix ${r.number}`;
        const bodyLines = r.lines
            .map((l) => `- ${l.item} × ${l.quantity} (TVA ${l.taxRate}%)`)
            .join("\n");
        const body = `Bonjour,\n\nMerci de nous communiquer votre meilleure offre pour les lignes suivantes :\n${bodyLines}\n\nMerci d'indiquer le délai, les conditions et la validité de l'offre.\n\nCordialement,`;
        setSendSubject(subject);
        setSendMessage(body);
        setSendOpen(true);
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Demandes de prix</h1>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>Nouvelle demande</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Nouvelle demande de prix</DialogTitle>
                            <DialogDescription>Enregistrez un brouillon puis envoyez-le aux fournisseurs.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Fournisseurs</Label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedSuppliers.map((s) => (
                                        <div key={s} className="flex items-center gap-2 px-2 py-1 rounded border text-sm">
                                            <span>{s}</span>
                                            <button className="text-gray-500 hover:text-gray-700" onClick={() => setSelectedSuppliers((prev) => prev.filter((x) => x !== s))}>×</button>
                                        </div>
                                    ))}
                                </div>
                                <div className="relative">
                                    <Input value={supplierQuery} onChange={(e) => setSupplierQuery(e.target.value)} placeholder="Rechercher un fournisseur…" />
                                    {(supplierQuery || supplierLoading || supplierSuggestions.length > 0) && (
                                        <div className="absolute z-10 mt-1 w-full rounded border bg-white shadow">
                                            <div className="max-h-56 overflow-auto">
                                                {supplierLoading && (<div className="px-3 py-2 text-sm text-gray-500">Recherche…</div>)}
                                                {!supplierLoading && supplierSuggestions.map((s) => (
                                                    <button key={s.id} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm" onClick={() => {
                                                        setSelectedSuppliers((prev) => prev.includes(s.name) ? prev : [...prev, s.name]);
                                                        setSupplierQuery(""); setSupplierSuggestions([]);
                                                    }}>{s.name}</button>
                                                ))}
                                                {!supplierLoading && supplierSuggestions.length === 0 && supplierQuery.trim() && (
                                                    <div className="px-3 py-2 text-sm">
                                                        <div className="flex items-center justify-between">
                                                            <div>Aucun résultat pour “{supplierQuery}”.</div>
                                                            <Button size="sm" onClick={async () => {
                                                                const name = supplierQuery.trim(); if (!name) return;
                                                                const res = await fetch('/api/tenant/suppliers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
                                                                if (!res.ok) { alert('Erreur création fournisseur'); return; }
                                                                setSelectedSuppliers((prev) => prev.includes(name) ? prev : [...prev, name]);
                                                                setSupplierQuery(""); setSupplierSuggestions([]);
                                                            }}>Créez ce fournisseur</Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Note</Label>
                                <Textarea value={cNote} onChange={(e) => setCNote(e.target.value)} placeholder="Précisions, délais souhaités …" />
                            </div>
                            <div className="space-y-2">
                                <Label>Lignes</Label>
                                <div className="space-y-2">
                                    {cLines.map((l, idx) => (
                                        <div key={l.id} className="grid grid-cols-12 gap-2 items-center">
                                            <Input className="col-span-5" value={l.item} onChange={(e) => setCLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, item: e.target.value } : x)))} placeholder="Article / Service" />
                                            <Input className="col-span-2" type="number" value={l.quantity}
                                                onChange={(e) => setCLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, quantity: Number(e.target.value || 0) } : x)))} placeholder="Qté" />
                                            <Input className="col-span-3" type="number" value={l.estimatedPrice}
                                                onChange={(e) => setCLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, estimatedPrice: Number(e.target.value || 0) } : x)))} placeholder="Prix estimé" />
                                            <Input className="col-span-2" type="number" value={l.taxRate}
                                                onChange={(e) => setCLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, taxRate: Number(e.target.value || 0) } : x)))} placeholder="TVA %" />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center">
                                    <Button type="button" variant="outline" onClick={addLine}>Ajouter une ligne</Button>
                                    <div className="text-sm text-gray-600">Total estimé: {currency(totalCreate)} FCFA</div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
                                <Button onClick={createRfq}>Enregistrer le brouillon</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-64">
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les statuts</SelectItem>
                                <SelectItem value="draft">Brouillon</SelectItem>
                                <SelectItem value="sent">Envoyée</SelectItem>
                                <SelectItem value="closed">Clôturée</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 max-w-sm">
                        <Input placeholder="Recherche par N° ou fournisseur" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-500">
                            <tr className="border-b">
                                <th className="py-2">N°</th>
                                <th className="py-2">Fournisseurs</th>
                                <th className="py-2">Total estimé</th>
                                <th className="py-2">Statut</th>
                                <th className="py-2">Date</th>
                                <th className="py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r) => (
                                <tr key={r.id} className="border-b hover:bg-gray-50">
                                    <td className="py-2">{r.number}</td>
                                    <td className="py-2">{r.suppliers.join(", ")}</td>
                                    <td className="py-2">{currency(totalRfq(r))} FCFA</td>
                                    <td className="py-2">
                                        {r.status === "draft" && <Badge variant="secondary">Brouillon</Badge>}
                                        {r.status === "sent" && <Badge>Envoyée</Badge>}
                                        {r.status === "closed" && <Badge className="bg-green-600 hover:bg-green-600">Clôturée</Badge>}
                                    </td>
                                    <td className="py-2">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</td>
                                    <td className="py-2 text-right">
                                        <Button variant="outline" size="sm" onClick={() => loadDetail(r.id)}>Voir</Button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} className="py-8 text-center text-gray-500">Aucune demande. Créez votre première demande de prix.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Détail RFQ */}
            <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    {detail && (
                        <div className="space-y-4">
                            <DialogHeader>
                                <DialogTitle>{detail.number || detail.id}</DialogTitle>
                                <DialogDescription>Fournisseurs: {detail.suppliers.join(", ")}</DialogDescription>
                            </DialogHeader>

                            {/* Bandeau d'aide contextuel */}
                            {(() => {
                                const allSelected = detail.lines.every((l) => !!selected[l.id]);
                                let title = ""; let desc = "";
                                if (detail.status === 'draft') {
                                    title = "Brouillon"; desc = "Envoyez la demande pour commencer à collecter des offres.";
                                } else if (detail.status === 'sent' && !allSelected) {
                                    title = "Offres en cours"; desc = "Sélectionnez une offre pour chaque ligne afin d'activer la conversion.";
                                } else if (detail.status === 'sent' && allSelected) {
                                    title = "Prêt à convertir"; desc = "Toutes les lignes ont une offre sélectionnée. Cliquez sur “Clôturer et convertir en commande”.";
                                } else if (detail.status === 'closed') {
                                    title = "RFQ clôturée"; desc = "Les offres sont figées. Consultez les commandes créées.";
                                }
                                return title ? (
                                    <Alert>
                                        <AlertTitle>{title}</AlertTitle>
                                        <AlertDescription>{desc}</AlertDescription>
                                    </Alert>
                                ) : null;
                            })()}

                            {/* Stepper simple */}
                            <div className="flex items-center gap-2 text-xs">
                                <Badge variant="secondary">RFQ</Badge>
                                <span>→</span>
                                <Badge variant="secondary">Commande</Badge>
                                <span>→</span>
                                <Badge variant="secondary">Réception</Badge>
                                <span>→</span>
                                <Badge variant="secondary">Facture</Badge>
                                <span>→</span>
                                <Badge variant="secondary">Paiement</Badge>
                            </div>

                            {/* Lignes */}
                            <Card className="p-3">
                                <div className="font-medium mb-2">Lignes</div>
                                <div className="space-y-1">
                                    {detail.lines.map((l) => (
                                        <div key={l.id} className="flex justify-between text-sm">
                                            <div>{l.item} × {l.quantity} @ {currency(l.estimatedPrice)} FCFA</div>
                                            <div>{currency(totalLine(l))} FCFA</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-right mt-2 text-sm text-gray-600">Total estimé: {currency(totalRfq(detail))} FCFA</div>
                            </Card>

                            {/* Offres reçues: visible si 'sent' ou 'closed'; saisie activée seulement si 'sent' */}
                            {detail.status === 'sent' || detail.status === 'closed' ? (
                                <Card className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="font-medium">Offres reçues</div>
                                        <div className="flex items-center gap-2" />
                                    </div>
                                    <div className="space-y-4 text-sm">
                                        {detail.lines.map((l) => {
                                            const offs = (offers[detail.id] || []).filter((o) => o.lineId === l.id);
                                            const best = offs.length ? Math.min(...offs.map((o) => o.price)) : null;
                                            const disabled = detail.status !== 'sent';
                                            return (
                                                <div key={l.id}>
                                                    <div className="mb-1 font-medium">{l.item} (Qté {l.quantity})</div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full">
                                                            <thead className="text-left text-gray-500">
                                                                <tr>
                                                                    <th className="py-1">Choix</th>
                                                                    <th className="py-1">Fournisseur</th>
                                                                    <th className="py-1">Prix proposé</th>
                                                                    <th className="py-1">Délai (jours)</th>
                                                                    <th className="py-1">Indicateur</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {offs.length === 0 && (
                                                                    <tr><td colSpan={5} className="py-2 text-gray-500">Aucune réponse pour l’instant.</td></tr>
                                                                )}
                                                                {offs.map((o, idx) => (
                                                                    <tr key={idx} className="border-t">
                                                                        <td className="py-1">
                                                                            <input
                                                                                type="radio"
                                                                                name={`pick_${l.id}`}
                                                                                checked={selected[l.id]?.supplier === o.supplier && selected[l.id]?.price === o.price}
                                                                                onChange={() => setSelected((prev) => ({ ...prev, [l.id]: o }))}
                                                                            />
                                                                        </td>
                                                                        <td className="py-1">{o.supplier}</td>
                                                                        <td className="py-1">{currency(o.price)} FCFA</td>
                                                                        <td className="py-1">{o.lead}</td>
                                                                        <td className="py-1">
                                                                            {best !== null && o.price === best ? (
                                                                                <Badge className="bg-green-600 hover:bg-green-600">Meilleure offre</Badge>
                                                                            ) : (
                                                                                <Badge variant="secondary">Offre</Badge>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                                                            <div className="w-56">
                                                                <Select value={newOfferSupplier[l.id] || ''} onValueChange={(v) => setNewOfferSupplier((prev) => ({ ...prev, [l.id]: v }))}>
                                                                    <SelectTrigger><SelectValue placeholder="Fournisseur" /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {detail.suppliers.map((s) => (
                                                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <Input className="w-32" type="number" placeholder="Prix" value={newOfferPrice[l.id] ?? ''} onChange={(e) => setNewOfferPrice((prev) => ({ ...prev, [l.id]: Number(e.target.value || 0) }))} disabled={disabled} />
                                                            <Input className="w-28" type="number" placeholder="Délai" value={newOfferLead[l.id] ?? ''} onChange={(e) => setNewOfferLead((prev) => ({ ...prev, [l.id]: Number(e.target.value || 0) }))} disabled={disabled} />
                                                            <Input className="flex-1 min-w-40" placeholder="Notes (optionnel)" value={newOfferNotes[l.id] ?? ''} onChange={(e) => setNewOfferNotes((prev) => ({ ...prev, [l.id]: e.target.value }))} disabled={disabled} />
                                                            <Button size="sm" onClick={() => addOffer(detail, l.id)} disabled={disabled}>Ajouter l'offre</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {detail.status === 'closed' && (
                                        <div className="mt-3 text-xs text-gray-500">La RFQ est clôturée, la saisie d’offres est désactivée.</div>
                                    )}
                                </Card>
                            ) : (
                                <Card className="p-3 text-sm text-gray-600">Envoyez la RFQ pour commencer à enregistrer des offres.</Card>
                            )}

                            {/* Conversion en commande: visible uniquement si 'sent' ET toutes les lignes ont une offre sélectionnée */}
                            {/* CTA principal: Clôturer et convertir */}
                            {detail.status === 'sent' && (
                                <div className="flex justify-end">
                                    <Button
                                        className="mt-2"
                                        disabled={detail.lines.some((l) => !selected[l.id])}
                                        onClick={() => setConvertOpen(true)}
                                    >
                                        Clôturer et convertir en commande
                                    </Button>
                                </div>
                            )}

                            {/* Actions statut */}
                            <div className="flex justify-end gap-2">
                                {detail.status === "draft" && (
                                    <>
                                        <Button variant="outline" onClick={() => openSend(detail)}>Envoyer</Button>
                                        <Button onClick={() => setStatus(detail, "sent")}>Marquer comme envoyée</Button>
                                    </>
                                )}
                                {detail.status === "sent" && (
                                    <></>
                                )}
                                {detail.status === "closed" && detail.purchaseOrderIds && detail.purchaseOrderIds.length > 0 && (
                                    <Button asChild>
                                        <Link href={`/purchases/orders/${detail.purchaseOrderIds[0]}`}>Voir la commande créée</Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Envoi RFQ */}
            <Dialog open={sendOpen} onOpenChange={setSendOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nouvel e‑mail – Demande de prix</DialogTitle>
                        <DialogDescription>Composez votre message puis envoyez aux fournisseurs sélectionnés.</DialogDescription>
                    </DialogHeader>
                    {detail && (
                        <div className="space-y-4">
                            {/* En‑tête style mail */}
                            <div className="grid grid-cols-12 items-center gap-2 text-sm">
                                <div className="col-span-2 text-gray-500">De</div>
                                <div className="col-span-10"><Input value="achats@optima.local" readOnly /></div>
                                <div className="col-span-2 text-gray-500">À</div>
                                <div className="col-span-10">
                                    <div className="flex flex-wrap gap-2">
                                        {detail.suppliers.map((s) => (
                                            <Badge key={s} variant="secondary">{s}</Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2 text-gray-500">Cc</div>
                                <div className="col-span-10"><Input placeholder="Ajouter des destinataires en copie (optionnel)" /></div>
                                <div className="col-span-2 text-gray-500">Objet</div>
                                <div className="col-span-10"><Input value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} /></div>
                            </div>

                            <div className="space-y-2">
                                <Textarea rows={10} value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label>Pièce jointe</Label>
                                <Card className="p-3 text-sm flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">{detail.number}-resume.pdf</div>
                                        <div className="text-gray-600">Résumé de la demande (simulation)</div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            if (!detail) return;
                                            const pdf = await PDFDocument.create();
                                            const page = pdf.addPage([595.28, 841.89]);
                                            const font = await pdf.embedFont(StandardFonts.Helvetica);
                                            const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
                                            const { width, height } = page.getSize();
                                            const margin = 50;
                                            const clean = (t: string) =>
                                                (t || "")
                                                    .normalize("NFKD")
                                                    .replace(/[\u202F\u00A0]/g, " ")
                                                    .replace(/[^\x00-\x7F]/g, "");
                                            const draw = (txt: string, opts: any) => page.drawText(clean(txt), opts);

                                            // En-tête
                                            draw("DEMANDE DE PRIX", { x: margin, y: height - 70, size: 22, font: bold, color: rgb(0.1, 0.1, 0.1) });
                                            draw(detail.number || detail.id, { x: margin, y: height - 95, size: 12, font, color: rgb(0.4, 0.4, 0.4) });

                                            // Fournisseurs
                                            draw("Fournisseurs:", { x: margin, y: height - 125, size: 10, font: bold });
                                            draw(detail.suppliers.join(", "), { x: margin + 90, y: height - 125, size: 10, font });

                                            // Tableau lignes
                                            const tableTop = height - 160;
                                            const cols = [0.55, 0.15, 0.15, 0.15]; // item, qty, price, total
                                            const tableW = width - margin * 2;
                                            const colX = [margin, margin + cols[0] * tableW, margin + (cols[0] + cols[1]) * tableW, margin + (cols[0] + cols[1] + cols[2]) * tableW];
                                            const rowH = 18;

                                            const header = ["Article / Service", "Qté", "Prix estimé", "Total"];
                                            header.forEach((h, i) => {
                                                draw(h, { x: colX[i] + 2, y: tableTop, size: 10, font: bold });
                                            });

                                            let y = tableTop - rowH;
                                            const money = (n: number) => clean(new Intl.NumberFormat('fr-FR').format(Math.round(n)));
                                            let total = 0;
                                            detail.lines.forEach((l) => {
                                                const lineTotal = l.quantity * l.estimatedPrice * (1 + l.taxRate / 100);
                                                total += lineTotal;
                                                const vals = [l.item, String(l.quantity), money(l.estimatedPrice), money(lineTotal) + " FCFA"];
                                                vals.forEach((v, i) => draw(v, { x: colX[i] + 2, y, size: 10, font }));
                                                y -= rowH;
                                            });

                                            draw("Total estimé:", { x: colX[2] + 2, y: y - 6, size: 10, font: bold });
                                            draw(money(total) + " FCFA", { x: colX[3] + 2, y: y - 6, size: 10, font });

                                            const bytes = await pdf.save();
                                            const blob = new Blob([bytes as any], { type: 'application/pdf' });
                                            const url = URL.createObjectURL(blob);
                                            window.open(url, '_blank');
                                        }}
                                    >
                                        Aperçu
                                    </Button>
                                </Card>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setSendOpen(false)}>Annuler</Button>
                                <Button onClick={async () => {
                                    if (!detail) return;
                                    const idem = Math.random().toString(36).slice(2);
                                    const res = await fetch(`/api/tenant/purchases/rfqs/${detail.id}/send`, { method: 'POST', headers: { 'x-idempotency-key': idem } });
                                    if (!res.ok) { toast.error('Erreur lors de l\'envoi'); return; }
                                    setSendOpen(false);
                                    await setStatus(detail, 'sent');
                                }}>Envoyer</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Conversion – Aperçu et confirmation */}
            <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Préparer la commande d’achat</DialogTitle>
                        <DialogDescription>Aperçu de la commande préremplie à partir des offres sélectionnées.</DialogDescription>
                    </DialogHeader>
                    {detail && (
                        <div className="space-y-4 text-sm">
                            <div className="text-sm text-gray-600">Vous pouvez retenir des fournisseurs différents par ligne. Aucune sélection globale requise.</div>

                            <Card className="p-3">
                                <div className="font-medium mb-2">Lignes de la commande</div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="text-left text-gray-500">
                                            <tr>
                                                <th className="py-1">Article / Service</th>
                                                <th className="py-1">Fournisseur</th>
                                                <th className="py-1">Qté</th>
                                                <th className="py-1">Prix</th>
                                                <th className="py-1">TVA %</th>
                                                <th className="py-1">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detail.lines.map((l) => {
                                                const pick = selected[l.id];
                                                const unit = pick ? pick.price : l.estimatedPrice;
                                                const lineTotal = l.quantity * unit * (1 + l.taxRate / 100);
                                                return (
                                                    <tr key={l.id} className="border-t">
                                                        <td className="py-1">{l.item}</td>
                                                        <td className="py-1">{pick?.supplier || "—"}</td>
                                                        <td className="py-1">{l.quantity}</td>
                                                        <td className="py-1">{currency(unit)} FCFA</td>
                                                        <td className="py-1">{l.taxRate}</td>
                                                        <td className="py-1">{currency(lineTotal)} FCFA</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="text-right mt-2">Total: {currency(detail.lines.reduce((s, l) => {
                                    const unit = selected[l.id]?.price ?? l.estimatedPrice;
                                    return s + l.quantity * unit * (1 + l.taxRate / 100);
                                }, 0))} FCFA</div>
                            </Card>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setConvertOpen(false)}>Annuler</Button>
                                <Button onClick={async () => {
                                    if (!detail) return;
                                    const payload = {
                                        selected: Object.fromEntries(detail.lines.map((l) => [l.id, { price: selected[l.id]?.price ?? l.estimatedPrice, lead: selected[l.id]?.lead ?? 0, supplier: selected[l.id]?.supplier || convertSupplier || detail.suppliers[0] }]))
                                    };
                                    const idem = Math.random().toString(36).slice(2);
                                    const res = await fetch(`/api/tenant/purchases/rfqs/${detail.id}/convert`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-idempotency-key': idem }, body: JSON.stringify(payload) });
                                    if (!res.ok) { toast.error('Erreur lors de la conversion'); return; }
                                    const data = await res.json();
                                    setConvertOpen(false);
                                    await setStatus(detail, 'closed');
                                    toast.success(Array.isArray(data.poIds) ? `Commandes créées: ${data.poIds.join(', ')}` : 'Commandes créées');
                                }}>Confirmer et créer la commande</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
