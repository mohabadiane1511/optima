"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, MoreHorizontal, Package, Upload, Download, Filter, History, FileDown } from "lucide-react";

type Product = {
    id: string;
    sku: string;
    name: string;
    category: string;
    salePrice: number;
    purchasePrice: number;
    stock: number;
    active: boolean;
};

const MOCK_PRODUCTS: Product[] = [
    { id: "1", sku: "PRD-0001", name: "Riz parfumé 5kg", category: "Alimentaire", salePrice: 6500, purchasePrice: 5200, stock: 42, active: true },
    { id: "2", sku: "PRD-0002", name: "Huile 1L", category: "Alimentaire", salePrice: 1500, purchasePrice: 1200, stock: 8, active: true },
    { id: "3", sku: "PRD-0003", name: "Savon liquide", category: "Hygiène", salePrice: 1800, purchasePrice: 1300, stock: 0, active: false },
    { id: "4", sku: "PRD-0004", name: "Sucre 1kg", category: "Alimentaire", salePrice: 900, purchasePrice: 700, stock: 120, active: true },
];

export default function ProductsPage() {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
    const nf = useMemo(() => new Intl.NumberFormat('fr-FR'), []);

    // Données mock pour graphiques (12 mois)
    const MOVES_IN = [50, 60, 45, 80, 70, 65, 72, 90, 85, 60, 55, 68];
    const MOVES_OUT = [40, 55, 38, 70, 66, 60, 70, 82, 80, 58, 50, 60];

    // Etat produits (dynamique)
    const [products, setProducts] = useState<Product[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState({ sku: "", name: "", salePrice: "", purchasePrice: "", categoryId: "" });
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [catOpen, setCatOpen] = useState(false);
    const [catName, setCatName] = useState("");
    const canSubmit = form.sku.trim() && form.name.trim() && Number(form.salePrice) >= 0 && Number(form.purchasePrice) >= 0;

    // UI: mouvement de stock
    const [moveOpen, setMoveOpen] = useState(false);
    const [moveType, setMoveType] = useState<'IN' | 'OUT'>('IN');
    const [moveQty, setMoveQty] = useState<string>("");
    const [moveProduct, setMoveProduct] = useState<Product | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyRows, setHistoryRows] = useState<{ id: string; type: string; qty: number; createdAt: string; createdBy: string | null; createdByName?: string | null; createdByEmail?: string | null; productName?: string | null; productSku?: string | null }[]>([]);
    const [recentMoves, setRecentMoves] = useState<typeof historyRows>([]);
    const [exportOpen, setExportOpen] = useState(false);
    const [exportPreset, setExportPreset] = useState<'today' | 'last7' | 'thisMonth' | 'custom'>('last7');
    const [exportFrom, setExportFrom] = useState<string>('');
    const [exportTo, setExportTo] = useState<string>('');

    async function loadProducts() {
        try {
            setLoading(true);
            // En dev, ajoute x-tenant-slug pour garantir la résolution côté API même sans sous-domaine effectif
            let headers: Record<string, string> = {};
            if (typeof window !== 'undefined') {
                const host = window.location.host;
                const slug = host.includes('.localhost') ? host.split('.localhost')[0] : '';
                if (slug && process.env.NODE_ENV !== 'production') {
                    headers['x-tenant-slug'] = slug;
                }
            }
            const res = await fetch('/api/tenant/products', { cache: 'no-store', headers });
            if (!res.ok) throw new Error('Erreur chargement produits');
            const data = await res.json();
            // DEBUG TEMP: journaliser la réponse et le slug côté client
            try { console.debug('[Products] slug=', headers['x-tenant-slug'] || '(none)', 'count=', Array.isArray(data) ? data.length : 'n/a'); } catch { }
            const normalized: Product[] = (data || []).map((p: any) => ({
                id: p.id,
                sku: p.sku,
                name: p.name,
                category: p.category?.name ?? '—',
                salePrice: Number(p.salePrice ?? 0),
                purchasePrice: Number(p.purchasePrice ?? 0),
                stock: Number(p.qtyOnHand ?? 0),
                active: !!p.active,
            }));
            setProducts(normalized);
            setError("");
        } catch (e: any) {
            try { console.error('[Products] fetch error', e?.message || e); } catch { }
            // Afficher l'erreur et ne pas basculer sur le mock pour refléter la base réelle
            setProducts([]);
            setError('Impossible de charger les produits');
        } finally {
            setLoading(false);
        }
    }

    // Charger au montage
    useEffect(() => { loadProducts(); }, []);
    // Charger mouvements récents au montage
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/tenant/stock-movements?limit=5', { cache: 'no-store' });
                const data = await res.json();
                setRecentMoves((data || []).map((m: any) => ({
                    id: m.id,
                    type: m.type,
                    qty: Number(m.qty),
                    createdAt: m.createdAt,
                    createdBy: m.createdBy || null,
                    createdByName: m.createdByName || null,
                    createdByEmail: m.createdByEmail || null,
                    productName: m.productName || null,
                    productSku: m.productSku || null,
                })));
            } catch {
                setRecentMoves([]);
            }
        })();
    }, []);
    useEffect(() => {
        if (!createOpen) return;
        (async () => {
            try {
                const res = await fetch('/api/tenant/categories');
                const data = await res.json();
                setCategories(data || []);
            } catch {
                setCategories([]);
            }
        })();
    }, [createOpen]);

    async function createProduct(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        try {
            const res = await fetch('/api/tenant/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sku: form.sku.trim(),
                    name: form.name.trim(),
                    salePrice: Number(form.salePrice || 0),
                    purchasePrice: Number(form.purchasePrice || 0),
                    unit: 'unité',
                    active: true,
                    categoryId: form.categoryId || null,
                }),
            });
            if (!res.ok) throw new Error('create failed');
            setCreateOpen(false);
            setForm({ sku: "", name: "", salePrice: "", purchasePrice: "", categoryId: "" });
            await loadProducts();
        } catch {
            alert('Création impossible. Vérifiez les champs ou le SKU (unique).');
        }
    }

    const filtered = useMemo(() => {
        const source = products ?? [];
        return source.filter((p) => {
            const q = query.toLowerCase();
            const matches = [p.name, p.sku, p.category].some((s) => s.toLowerCase().includes(q));
            const matchesStatus = status === "all" ? true : status === "active" ? p.active : !p.active;
            return matches && matchesStatus;
        });
    }, [query, status, products]);

    return (
        <div className="space-y-6">

            {/* Fil d'Ariane + Titre */}
            <div>
                <nav className="flex" aria-label="Breadcrumb">
                    <ol className="inline-flex items-center space-x-1 md:space-x-3">
                        <li className="inline-flex items-center">
                            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <div className="flex items-center">
                                <span className="mx-2 text-gray-400">/</span>
                                <span className="text-gray-900 font-medium">Produits & Stocks</span>
                            </div>
                        </li>
                    </ol>
                </nav>
                <div className="mt-2 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Produits & Stocks</h1>
                        <p className="text-gray-600">Catalogue produits et niveaux de stock </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setExportOpen(true)}><FileDown className="h-4 w-4 mr-2" /> Export mouvements</Button>
                        <Button variant="outline" asChild>
                            <a href="/api/tenant/products/export"><FileDown className="h-4 w-4 mr-2" /> Export produits</a>
                        </Button>
                        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouveau produit</Button>
                    </div>
                </div>
            </div>
            {/* Charts: Mouvements de stock */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Mouvements mensuels</CardTitle>
                        <CardDescription>Entrées vs Sorties (mock)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="w-full h-40">
                            <svg viewBox="0 0 100 40" className="w-full h-full">
                                <g stroke="#e5e7eb" strokeWidth="0.2">
                                    <line x1="0" y1="39" x2="100" y2="39" />
                                    <line x1="0" y1="20" x2="100" y2="20" />
                                </g>
                                <polyline
                                    fill="rgba(16,185,129,0.15)"
                                    stroke="#10b981"
                                    strokeWidth="0.6"
                                    points={(() => {
                                        const max = Math.max(...MOVES_IN);
                                        const step = 100 / (MOVES_IN.length - 1);
                                        const pts = MOVES_IN.map((v, i) => `${i * step},${40 - (v / max) * 35}`);
                                        return `0,40 ${pts.join(" ")} 100,40`;
                                    })()}
                                />
                                <polyline
                                    fill="rgba(59,130,246,0.15)"
                                    stroke="#3b82f6"
                                    strokeWidth="0.6"
                                    points={(() => {
                                        const max = Math.max(...MOVES_OUT);
                                        const step = 100 / (MOVES_OUT.length - 1);
                                        const pts = MOVES_OUT.map((v, i) => `${i * step},${40 - (v / max) * 35}`);
                                        return `0,40 ${pts.join(" ")} 100,40`;
                                    })()}
                                />
                            </svg>
                            <div className="mt-2 flex justify-between text-xs text-gray-400">
                                {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'].map(m => (
                                    <span key={m} className="w-8 text-center hidden md:block">{m}</span>
                                ))}
                            </div>
                        </div>
                        <div className="mt-3 flex gap-4 text-xs">
                            <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Entrées</span>
                            <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" /> Sorties</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Mouvements récents</CardTitle>
                        <CardDescription>Dernières entrées/sorties</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentMoves.length === 0 ? (
                                <div className="text-sm text-gray-500">Aucun mouvement récent</div>
                            ) : recentMoves.slice(0, 6).map((m) => (
                                <div key={m.id} className="grid grid-cols-1 gap-1 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">{new Date(m.createdAt).toLocaleString('fr-FR')}</span>
                                        <span className={m.type === 'IN' ? 'text-emerald-700' : 'text-blue-700'}>{m.type === 'IN' ? '+ ' : '- '}{m.qty}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-gray-700">
                                        <span className="truncate">{m.productName ? `${m.productName}${m.productSku ? ` (${m.productSku})` : ''}` : (m.productSku || 'Produit')}</span>
                                        <span className="truncate text-gray-500">{m.createdByName || m.createdByEmail || '—'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Toolbar */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Filtres</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                        <div className="flex-1 flex items-center gap-2">
                            <Input placeholder="Rechercher (nom, SKU, catégorie)" value={query} onChange={(e) => setQuery(e.target.value)} />
                            <Button variant="outline" className="shrink-0"><Filter className="h-4 w-4 mr-2" />Filtres</Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant={status === "all" ? "default" : "outline"} onClick={() => setStatus("all")}>Tous</Button>
                            <Button variant={status === "active" ? "default" : "outline"} onClick={() => setStatus("active")}>Actifs</Button>
                            <Button variant={status === "inactive" ? "default" : "outline"} onClick={() => setStatus("inactive")}>Inactifs</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Liste */}
            <Card>
                <CardHeader>
                    <CardTitle>Liste des produits</CardTitle>
                    <CardDescription>
                        {loading ? 'Chargement…' : `${filtered.length} produit${filtered.length > 1 ? 's' : ''} affiché${filtered.length > 1 ? 's' : ''}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* On masque le message d'erreur pour ne pas perturber l'UX en mode mock */}
                    {(!loading && filtered.length === 0) ? (
                        <div className="text-center py-16">
                            <Package className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun produit</h3>
                            <p className="mt-1 text-sm text-gray-500">Ajoutez votre premier produit pour commencer.</p>
                            <div className="mt-6">
                                <Button><Plus className="h-4 w-4 mr-2" /> Nouveau produit</Button>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="py-8 text-sm text-gray-500">Chargement…</div>
                    ) : (
                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Produit</TableHead>
                                        <TableHead>Catégorie</TableHead>
                                        <TableHead className="text-right">Prix vente</TableHead>
                                        <TableHead className="text-right">Prix achat</TableHead>
                                        <TableHead className="text-right">Stock</TableHead>
                                        <TableHead className="text-center">Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((p) => (
                                        <TableRow key={p.id} className="hover:bg-gray-50">
                                            <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                                            <TableCell>{p.name}</TableCell>
                                            <TableCell>{p.category}</TableCell>
                                            <TableCell className="text-right">{nf.format(p.salePrice)} FCFA</TableCell>
                                            <TableCell className="text-right text-gray-500">{nf.format(p.purchasePrice)} FCFA</TableCell>
                                            <TableCell className="text-right">
                                                <span className={p.stock === 0 ? "text-red-600 font-medium" : p.stock < 10 ? "text-orange-600" : ""}>{p.stock}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Actif" : "Inactif"}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={async () => {
                                                            setHistoryOpen(true);
                                                            try {
                                                                const res = await fetch(`/api/tenant/stock-movements?productId=${p.id}&limit=25`, { cache: 'no-store' });
                                                                const data = await res.json();
                                                                setHistoryRows((data || []).map((m: any) => ({ id: m.id, type: m.type, qty: Number(m.qty), createdAt: m.createdAt, createdBy: m.createdBy || null, createdByName: m.createdByName || null, createdByEmail: m.createdByEmail || null, productName: m.productName || null, productSku: m.productSku || null })));
                                                            } catch {
                                                                setHistoryRows([]);
                                                            }
                                                        }}>Historique</DropdownMenuItem>
                                                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { setMoveProduct(p); setMoveType('IN'); setMoveQty(""); setMoveOpen(true); }}>Entrée stock</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { setMoveProduct(p); setMoveType('OUT'); setMoveQty(""); setMoveOpen(true); }}>Sortie stock</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600">Désactiver</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Dialog Création */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Nouveau produit</DialogTitle>
                        <DialogDescription>Créer un produit de catalogue (tenant)</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={createProduct} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-600">SKU</label>
                                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="PRD-0005" required />
                            </div>
                            <div className="space-y-2 md:col-span-1">
                                <label className="text-sm text-gray-600">Nom</label>
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du produit" required />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm text-gray-600">Catégorie</label>
                                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une catégorie (optionnel)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="pt-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => setCatOpen(true)}>Nouvelle catégorie</Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-600">Prix vente</label>
                                <Input type="number" inputMode="decimal" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} placeholder="0" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-600">Prix achat</label>
                                <Input type="number" inputMode="decimal" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} placeholder="0" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
                            <Button type="submit" disabled={!canSubmit}>Créer</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Nouvelle catégorie */}
            <Dialog open={catOpen} onOpenChange={setCatOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Nouvelle catégorie</DialogTitle>
                        <DialogDescription>Créer une catégorie pour organiser vos produits</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const name = catName.trim();
                        if (!name) return;
                        try {
                            const res = await fetch('/api/tenant/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
                            const data = await res.json();
                            if (res.ok) {
                                const next = [...categories, data];
                                setCategories(next);
                                setForm(prev => ({ ...prev, categoryId: data.id }));
                                setCatName("");
                                setCatOpen(false);
                            } else {
                                alert(data.error || 'Erreur lors de la création de la catégorie');
                            }
                        } catch {
                            alert('Erreur réseau');
                        }
                    }} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600">Nom de la catégorie</label>
                            <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Ex: Alimentaire" />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCatOpen(false)}>Annuler</Button>
                            <Button type="submit" disabled={!catName.trim()}>Créer</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Mouvement de stock */}
            <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>{moveType === 'IN' ? 'Entrée de stock' : 'Sortie de stock'}</DialogTitle>
                        <DialogDescription>
                            {moveProduct ? `${moveProduct.name} (${moveProduct.sku})` : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!moveProduct) return;
                        const qty = Number(moveQty);
                        if (!qty || qty <= 0) return;
                        try {
                            const res = await fetch('/api/tenant/stock-movements', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ productId: moveProduct.id, type: moveType, qty })
                            });
                            if (!res.ok) throw new Error('failed');
                            setMoveOpen(false);
                            setMoveProduct(null);
                            setMoveQty("");
                            await loadProducts();
                        } catch {
                            alert('Mouvement impossible');
                        }
                    }} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600">Quantité</label>
                            <Input type="number" inputMode="decimal" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} placeholder="0" required />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setMoveOpen(false)}>Annuler</Button>
                            <Button type="submit">Valider</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Historique */}
            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle className="inline-flex items-center gap-2"><History className="h-4 w-4" /> Historique des mouvements</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-80 overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Produit</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Qté</TableHead>
                                    <TableHead>Par</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {historyRows.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-gray-500">Aucun mouvement</TableCell></TableRow>
                                ) : historyRows.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{new Date(r.createdAt).toLocaleString('fr-FR')}</TableCell>
                                        <TableCell>{r.productName || r.productSku || '—'}</TableCell>
                                        <TableCell>{r.type === 'IN' ? 'Entrée' : 'Sortie'}</TableCell>
                                        <TableCell className="text-right">{r.qty}</TableCell>
                                        <TableCell>{r.createdByName || r.createdByEmail || r.createdBy || '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Export CSV mouvements */}
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Exporter les mouvements de stock</DialogTitle>
                        <DialogDescription>Choisissez une période à exporter</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600">Période</label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant={exportPreset === 'today' ? 'default' : 'outline'} onClick={() => setExportPreset('today')}>Aujourd'hui</Button>
                                <Button variant={exportPreset === 'last7' ? 'default' : 'outline'} onClick={() => setExportPreset('last7')}>7 derniers jours</Button>
                                <Button variant={exportPreset === 'thisMonth' ? 'default' : 'outline'} onClick={() => setExportPreset('thisMonth')}>Mois courant</Button>
                                <Button variant={exportPreset === 'custom' ? 'default' : 'outline'} onClick={() => setExportPreset('custom')}>Personnalisée</Button>
                            </div>
                        </div>
                        {exportPreset === 'custom' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-600">Du</label>
                                    <Input type="datetime-local" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-600">Au</label>
                                    <Input type="datetime-local" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExportOpen(false)}>Annuler</Button>
                        <Button onClick={() => {
                            const params = new URLSearchParams();
                            if (exportPreset !== 'custom') params.set('preset', exportPreset);
                            if (exportPreset === 'custom') {
                                if (exportFrom) params.set('from', new Date(exportFrom).toISOString());
                                if (exportTo) params.set('to', new Date(exportTo).toISOString());
                            }
                            const url = `/api/tenant/stock-movements/export?${params.toString()}`;
                            window.location.href = url;
                            setExportOpen(false);
                        }}>Télécharger</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


