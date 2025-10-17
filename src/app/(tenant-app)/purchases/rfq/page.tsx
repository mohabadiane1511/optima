"use client";

import { useMemo, useState } from "react";
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

type RfqLine = {
    id: string;
    item: string;
    quantity: number;
    estimatedPrice: number;
    taxRate: number; // %
};

type Rfq = {
    id: string;
    number: string;
    suppliers: string[];
    status: "draft" | "sent" | "closed";
    date: string; // ISO date
    note?: string;
    lines: RfqLine[];
};

const currency = (n: number) =>
    new Intl.NumberFormat("fr-FR").format(Math.round(n));

export default function PurchasesRfqPage() {
    const [rfqs, setRfqs] = useState<Rfq[]>([...
        Array.from({ length: 5 }).map((_, i) => ({
            id: `rfq_${i + 1}`,
            number: `RFQ-2025-00${i + 1}`,
            suppliers: ["Fournisseur A", i % 2 ? "Fournisseur B" : "Fournisseur C"],
            status: (i % 3 === 0 ? "sent" : "draft") as Rfq["status"],
            date: new Date(Date.now() - i * 86400000).toISOString(),
            note: "Besoin urgent",
            lines: [
                {
                    id: `l${i}-1`,
                    item: "Article standard",
                    quantity: 3 + i,
                    estimatedPrice: 12000 + i * 500,
                    taxRate: 18,
                },
            ],
        }))
    ]);

    const [statusFilter, setStatusFilter] = useState<"all" | Rfq["status"]>("all");
    const [search, setSearch] = useState("");
    const filtered = useMemo(() => {
        return rfqs.filter((r) => {
            const sOk = statusFilter === "all" || r.status === statusFilter;
            const q = search.trim().toLowerCase();
            const qOk = !q || r.number.toLowerCase().includes(q) || r.suppliers.join(", ").toLowerCase().includes(q);
            return sOk && qOk;
        });
    }, [rfqs, statusFilter, search]);

    // Création RFQ (fake)
    const [createOpen, setCreateOpen] = useState(false);
    const [cSuppliers, setCSuppliers] = useState<string>("");
    const [cNote, setCNote] = useState<string>("");
    const [cLines, setCLines] = useState<RfqLine[]>([
        { id: "c1", item: "Article", quantity: 1, estimatedPrice: 10000, taxRate: 18 },
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

    const createRfq = () => {
        const id = `rfq_${rfqs.length + 1}`;
        const number = `RFQ-2025-${String(rfqs.length + 1).padStart(4, "0")}`;
        const suppliers = cSuppliers
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const newR: Rfq = {
            id,
            number,
            suppliers: suppliers.length ? suppliers : ["Fournisseur X"],
            status: "draft",
            date: new Date().toISOString(),
            note: cNote || undefined,
            lines: cLines,
        };
        setRfqs((prev) => [newR, ...prev]);
        // reset
        setCSuppliers("");
        setCNote("");
        setCLines([{ id: "c1", item: "Article", quantity: 1, estimatedPrice: 10000, taxRate: 18 }]);
        setCreateOpen(false);
    };

    // Détail RFQ (fake)
    const [detail, setDetail] = useState<Rfq | null>(null);
    const setStatus = (r: Rfq, s: Rfq["status"]) => {
        setRfqs((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: s } : x)));
        setDetail((d) => (d && d.id === r.id ? { ...d, status: s } : d));
    };

    // Offres reçues (fake) : par ligne, une proposition par fournisseur
    type Offer = { lineId: string; supplier: string; price: number; lead: number };
    const [offers, setOffers] = useState<Record<string, Offer[]>>({}); // key = rfq.id
    const [selected, setSelected] = useState<Record<string, Offer>>({}); // key = lineId → offer
    const [convertOpen, setConvertOpen] = useState(false);
    const [convertSupplier, setConvertSupplier] = useState<string>("");

    const generateOffers = (r: Rfq) => {
        // pour chaque ligne et chaque fournisseur, générer un prix autour du prix estimé
        const off: Offer[] = [];
        r.lines.forEach((l) => {
            r.suppliers.forEach((s, idx) => {
                const variance = (idx + 1) * 0.03; // petite variation par fournisseur
                const factor = 1 + (Math.random() - 0.5) * 2 * variance; // +/-
                const price = Math.max(1, Math.round(l.estimatedPrice * factor));
                const lead = 3 + Math.floor(Math.random() * 10); // 3 à 12 jours
                off.push({ lineId: l.id, supplier: s, price, lead });
            });
        });
        setOffers((prev) => ({ ...prev, [r.id]: off }));
        // Pré-sélectionner la meilleure offre (prix) par ligne
        const byLine: Record<string, Offer[]> = {};
        off.forEach((o) => {
            byLine[o.lineId] = byLine[o.lineId] ? [...byLine[o.lineId], o] : [o];
        });
        const chosen: Record<string, Offer> = {};
        Object.keys(byLine).forEach((lineId) => {
            const arr = byLine[lineId];
            const best = arr.reduce((a, b) => (a.price <= b.price ? a : b));
            chosen[lineId] = best;
        });
        setSelected((prev) => ({ ...prev, ...chosen }));
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
                                <Label>Fournisseurs (séparés par des virgules)</Label>
                                <Input value={cSuppliers} onChange={(e) => setCSuppliers(e.target.value)} placeholder="Fournisseur A, Fournisseur B" />
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
                                    <td className="py-2">{new Date(r.date).toLocaleDateString("fr-FR")}</td>
                                    <td className="py-2 text-right">
                                        <Button variant="outline" size="sm" onClick={() => setDetail(r)}>Voir</Button>
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
                                <DialogTitle>{detail.number}</DialogTitle>
                                <DialogDescription>Fournisseurs: {detail.suppliers.join(", ")}</DialogDescription>
                            </DialogHeader>

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

                            {/* Offres reçues (comparaison) */}
                            <Card className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-medium">Offres reçues (simulation)</div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" onClick={() => generateOffers(detail)}>Simuler des réponses</Button>
                                    </div>
                                </div>
                                <div className="space-y-4 text-sm">
                                    {detail.lines.map((l) => {
                                        const offs = (offers[detail.id] || []).filter((o) => o.lineId === l.id);
                                        const best = offs.length ? Math.min(...offs.map((o) => o.price)) : null;
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
                                                                <tr><td colSpan={5} className="py-2 text-gray-500">Aucune réponse pour l’instant. Utilisez “Simuler des réponses”.</td></tr>
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
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>

                            {/* Conversion en commande */}
                            <Card className="p-3">
                                <div className="flex items-center justify-between">
                                    <div className="font-medium">Conversion en commande d’achat</div>
                                    <Button
                                        onClick={() => {
                                            // Si toutes les lignes ont un choix, proposer un fournisseur retenu (majoritaire ou premier)
                                            if (detail) {
                                                const pickedSuppliers = detail.lines.map((l) => selected[l.id]?.supplier).filter(Boolean) as string[];
                                                const freq: Record<string, number> = {};
                                                pickedSuppliers.forEach((s) => { freq[s] = (freq[s] || 0) + 1; });
                                                const leader = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || detail.suppliers[0];
                                                setConvertSupplier(leader);
                                            }
                                            setConvertOpen(true);
                                        }}
                                        disabled={detail.lines.some((l) => !selected[l.id])}
                                    >
                                        Préparer la commande
                                    </Button>
                                </div>
                                <div className="text-xs text-gray-600 mt-2">
                                    Sélectionnez une offre par ligne puis cliquez sur “Préparer la commande”.
                                </div>
                            </Card>

                            {/* Actions statut */}
                            <div className="flex justify-end gap-2">
                                {detail.status === "draft" && (
                                    <>
                                        <Button variant="outline" onClick={() => openSend(detail)}>Envoyer</Button>
                                        <Button onClick={() => setStatus(detail, "sent")}>Marquer comme envoyée</Button>
                                    </>
                                )}
                                {detail.status === "sent" && (
                                    <>
                                        <Button variant="outline" onClick={() => alert("Simulation: Comparaison des offres")}>Comparer les offres</Button>
                                        <Button onClick={() => setConvertOpen(true)}>Clôturer et convertir en commande</Button>
                                    </>
                                )}
                                {detail.status === "closed" && (
                                    <Button onClick={() => alert("Simulation: Commande créée")}>Voir la commande créée</Button>
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
                                            draw(detail.number, { x: margin, y: height - 95, size: 12, font, color: rgb(0.4, 0.4, 0.4) });

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
                                <Button onClick={() => { alert('Simulation: e‑mail envoyé'); setSendOpen(false); setStatus(detail, 'sent'); }}>Envoyer</Button>
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
                            <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-3 text-gray-600">Fournisseur retenu</div>
                                <div className="col-span-9">
                                    <Select value={convertSupplier} onValueChange={setConvertSupplier}>
                                        <SelectTrigger><SelectValue placeholder="Choisir un fournisseur" /></SelectTrigger>
                                        <SelectContent>
                                            {detail.suppliers.map((s) => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

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
                                <Button onClick={() => {
                                    setConvertOpen(false);
                                    setStatus(detail, "closed");
                                    alert("Simulation: commande d’achat créée avec succès");
                                }}>Confirmer et créer la commande</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
