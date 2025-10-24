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
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type Product = {
    id: string;
    sku: string;
    name: string;
    category: string;
    categoryId?: string | null;
    salePrice: number;
    purchasePrice: number;
    stock: number;
    active: boolean;
};

export default function ProductsPage() {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
    const nf = useMemo(() => new Intl.NumberFormat('fr-FR'), []);

    // Données mock pour graphiques (12 mois)
    // Chart dynamique: séries IN/OUT issues de l'API summary
    const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
    const [chartProductId, setChartProductId] = useState<string>('ALL');
    const [series, setSeries] = useState<{ date: string; in: number; out: number }[]>([]);
    const [chartLoading, setChartLoading] = useState(false);
    const MONTHS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    // Etat produits (dynamique)
    const [products, setProducts] = useState<Product[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [editForm, setEditForm] = useState({ sku: "", name: "", salePrice: "", purchasePrice: "", categoryId: "" });
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
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
    const [moving, setMoving] = useState(false);
    const [historyRows, setHistoryRows] = useState<{ id: string; type: string; qty: number; createdAt: string; createdBy: string | null; createdByName?: string | null; createdByEmail?: string | null; productName?: string | null; productSku?: string | null }[]>([]);
    const [recentMoves, setRecentMoves] = useState<typeof historyRows>([]);
    const [recentMovesLoading, setRecentMovesLoading] = useState(true);
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
                categoryId: p.categoryId || null,
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
    // Charger catégories une fois (pour création et édition)
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/tenant/categories', { cache: 'no-store' });
                const data = await res.json();
                setCategories(Array.isArray(data) ? data : []);
            } catch { setCategories([]); }
        })();
    }, []);
    // Charger séries du chart selon granularité
    useEffect(() => {
        (async () => {
            setChartLoading(true);
            try {
                const params = new URLSearchParams({ granularity, window: (granularity === 'daily' ? 7 : granularity === 'weekly' ? 12 : 12).toString() });
                if (chartProductId && chartProductId !== 'ALL') params.set('productId', chartProductId);
                const res = await fetch(`/api/tenant/stock-movements/summary?${params.toString()}`, { cache: 'no-store' });
                const data = await res.json();
                setSeries(data?.data || []);
            } catch {
                setSeries([]);
            } finally {
                setChartLoading(false);
            }
        })();
    }, [granularity, chartProductId]);
    // Charger mouvements récents au montage
    useEffect(() => {
        (async () => {
            try {
                setRecentMovesLoading(true);
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
            } finally {
                setRecentMovesLoading(false);
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

    const [creating, setCreating] = useState(false);
    async function createProduct(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        try {
            setCreating(true);
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
            try { toast.success('Produit créé'); } catch { }
        } catch {
            try { toast.error('Création impossible. Vérifiez les champs ou le SKU (unique).'); } catch { }
        } finally { setCreating(false); }
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
                <div className="mt-2 flex items-start md:items-center justify-between flex-col md:flex-row gap-3">
                    <div className="w-full md:w-auto">
                        <h1 className="text-2xl font-bold text-gray-900">Produits & Stocks</h1>
                        <p className="text-gray-600">Catalogue produits et niveaux de stock </p>
                    </div>
                    <div className="w-full md:w-auto flex flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={() => setExportOpen(true)} className="w-full sm:w-auto"><FileDown className="h-4 w-4 mr-2" /> Export mouvements</Button>
                        <Button variant="outline" asChild className="w-full sm:w-auto">
                            <a href="/api/tenant/products/export"><FileDown className="h-4 w-4 mr-2" /> Export produits</a>
                        </Button>
                        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Nouveau produit</Button>
                    </div>
                </div>
            </div>
            {/* Charts: Mouvements de stock */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Mouvements ({granularity})</CardTitle>
                        <CardDescription>Entrées vs Sorties</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
                            <Button size="sm" variant={granularity === 'daily' ? 'default' : 'outline'} onClick={() => setGranularity('daily')}>Jours</Button>
                            <Button size="sm" variant={granularity === 'weekly' ? 'default' : 'outline'} onClick={() => setGranularity('weekly')}>Semaines</Button>
                            <Button size="sm" variant={granularity === 'monthly' ? 'default' : 'outline'} onClick={() => setGranularity('monthly')}>Mois</Button>
                            <Button size="sm" variant={granularity === 'yearly' ? 'default' : 'outline'} onClick={() => setGranularity('yearly')}>Années</Button>
                            <div className="md:ml-auto w-full md:w-64">
                                <Select value={chartProductId} onValueChange={setChartProductId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tous les produits" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Tous les produits</SelectItem>
                                        {(products ?? []).map((p) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="w-full h-56">
                            {chartLoading || series.length === 0 ? (
                                <Skeleton className="h-full w-full" />
                            ) : (
                                <svg viewBox="0 0 100 56" className="w-full h-full">
                                    {(() => {
                                        const maxVal = Math.max(1, ...series.map(s => Math.max(s.in, s.out)));
                                        const n = Math.max(1, series.length);
                                        const groupWidth = 100 / n; // largeur d'un groupe
                                        const barWidth = Math.max(1.5, (groupWidth * 0.8) / 2); // deux barres par groupe
                                        const yScale = (v: number) => 50 - (v / maxVal) * 45; // marge haute 6, basse 6

                                        // Grille + ticks
                                        const ticks = 5;
                                        const grid: React.JSX.Element[] = [];
                                        for (let i = 0; i <= ticks; i++) {
                                            const y = 50 - (i / ticks) * 45;
                                            const val = Math.round((i / ticks) * maxVal);
                                            grid.push(
                                                <g key={i}>
                                                    <line x1="0" y1={y} x2="100" y2={y} stroke="#e5e7eb" strokeWidth="0.2" />
                                                    <text x="0" y={y - 0.5} fontSize="2" fill="#9ca3af">{val}</text>
                                                </g>
                                            );
                                        }

                                        const bars = series.map((s, i) => {
                                            const groupX = i * groupWidth + groupWidth / 2;
                                            const inY = yScale(s.in);
                                            const outY = yScale(s.out);
                                            const baseY = 50;
                                            return (
                                                <g key={i}>
                                                    {/* IN (vert) */}
                                                    <rect x={groupX - barWidth - 0.5} y={inY} width={barWidth} height={baseY - inY} fill="#10b981" fillOpacity="0.6">
                                                        <title>{`${new Date(s.date).toLocaleDateString('fr-FR')}\nEntrées: ${s.in}`}</title>
                                                    </rect>
                                                    {/* OUT (bleu) */}
                                                    <rect x={groupX + 0.5} y={outY} width={barWidth} height={baseY - outY} fill="#3b82f6" fillOpacity="0.6">
                                                        <title>{`${new Date(s.date).toLocaleDateString('fr-FR')}\nSorties: ${s.out}`}</title>
                                                    </rect>
                                                    {/* Label X */}
                                                    <text x={groupX} y={54} fontSize="2" textAnchor="middle" fill="#9ca3af">
                                                        {granularity === 'monthly' ? MONTHS_LABELS[new Date(s.date).getMonth()] : new Date(s.date).toLocaleDateString('fr-FR')}
                                                    </text>
                                                </g>
                                            );
                                        });

                                        return (
                                            <g>
                                                {grid}
                                                {bars}
                                            </g>
                                        );
                                    })()}
                                </svg>
                            )}
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
                            {recentMovesLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-5/6" />
                                    <Skeleton className="h-4 w-4/6" />
                                </div>
                            ) : recentMoves.length === 0 ? (
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
                        <div className="space-y-2">
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Produit</TableHead>
                                        <TableHead className="hidden sm:table-cell">Catégorie</TableHead>
                                        <TableHead className="text-right">Prix vente</TableHead>
                                        <TableHead className="text-right hidden md:table-cell">Prix achat</TableHead>
                                        <TableHead className="text-right hidden md:table-cell">Stock</TableHead>
                                        <TableHead className="text-center hidden sm:table-cell">Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((p) => (
                                        <TableRow key={p.id} className="hover:bg-gray-50">
                                            <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                                            <TableCell className="max-w-[220px] truncate" title={p.name}>{p.name}</TableCell>
                                            <TableCell className="hidden sm:table-cell">{p.category}</TableCell>
                                            <TableCell className="text-right">{nf.format(p.salePrice)} FCFA</TableCell>
                                            <TableCell className="text-right text-gray-500 hidden md:table-cell">{nf.format(p.purchasePrice)} FCFA</TableCell>
                                            <TableCell className="text-right hidden md:table-cell">
                                                <span className={p.stock === 0 ? "text-red-600 font-medium" : p.stock < 10 ? "text-orange-600" : ""}>{p.stock}</span>
                                            </TableCell>
                                            <TableCell className="text-center hidden sm:table-cell">
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
                                                        <DropdownMenuItem onClick={() => {
                                                            setEditProduct(p);
                                                            setEditForm({ sku: p.sku, name: p.name, salePrice: String(p.salePrice ?? ''), purchasePrice: String(p.purchasePrice ?? ''), categoryId: p.categoryId || '' });
                                                            setEditOpen(true);
                                                        }}>Modifier</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { setMoveProduct(p); setMoveType('IN'); setMoveQty(""); setMoveOpen(true); }}>Entrée stock</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { setMoveProduct(p); setMoveType('OUT'); setMoveQty(""); setMoveOpen(true); }}>Sortie stock</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={async () => {
                                                            try {
                                                                const res = await fetch(`/api/tenant/products/${p.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !p.active }) });
                                                                const data = await res.json().catch(() => ({} as any));
                                                                if (!res.ok) { toast.error(data?.error || 'Action impossible'); return; }
                                                                await loadProducts();
                                                                toast.success(p.active ? 'Produit désactivé' : 'Produit activé');
                                                            } catch { toast.error('Erreur réseau'); }
                                                        }}>{p.active ? 'Désactiver' : 'Activer'}</DropdownMenuItem>
                                                        <DropdownMenuItem className={p.active ? 'text-gray-400 pointer-events-none' : 'text-red-600'} onClick={async () => {
                                                            if (p.active) return;
                                                            if (!confirm('Supprimer définitivement ce produit ?')) return;
                                                            try {
                                                                setDeleting(p.id);
                                                                const res = await fetch(`/api/tenant/products/${p.id}`, { method: 'DELETE' });
                                                                const data = await res.json().catch(() => ({} as any));
                                                                if (!res.ok) { toast.error(data?.error || 'Suppression impossible'); return; }
                                                                await loadProducts();
                                                                toast.success('Produit supprimé');
                                                            } catch { toast.error('Erreur réseau'); }
                                                            finally { setDeleting(null); }
                                                        }}>Supprimer</DropdownMenuItem>
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
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Annuler</Button>
                            <Button type="submit" disabled={!canSubmit || creating}>{creating ? (<><Spinner className="mr-2" />Création…</>) : 'Créer'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Édition */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Modifier le produit</DialogTitle>
                        <DialogDescription>Mettre à jour les informations du produit</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!editProduct) return;
                        try {
                            setUpdating(true);
                            const payload: any = {
                                sku: editForm.sku.trim(),
                                name: editForm.name.trim(),
                                purchasePrice: Number(editForm.purchasePrice || 0),
                                salePrice: Number(editForm.salePrice || 0),
                                unit: 'unité',
                                categoryId: editForm.categoryId || null,
                            };
                            const res = await fetch(`/api/tenant/products/${editProduct.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                            const data = await res.json();
                            if (!res.ok) { toast.error(data?.error || 'Mise à jour impossible'); return; }
                            setEditOpen(false);
                            setEditProduct(null);
                            await loadProducts();
                            toast.success('Produit mis à jour');
                        } catch { toast.error('Erreur réseau'); }
                        finally { setUpdating(false); }
                    }} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-600">SKU</label>
                                <Input value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} placeholder="PRD-0005" required />
                            </div>
                            <div className="space-y-2 md:col-span-1">
                                <label className="text-sm text-gray-600">Nom</label>
                                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nom du produit" required />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm text-gray-600">Catégorie</label>
                                <Select value={editForm.categoryId} onValueChange={(v) => setEditForm({ ...editForm, categoryId: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une catégorie (optionnel)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-600">Prix vente</label>
                                <Input type="number" inputMode="decimal" value={editForm.salePrice} onChange={(e) => setEditForm({ ...editForm, salePrice: e.target.value })} placeholder="0" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-600">Prix achat</label>
                                <Input type="number" inputMode="decimal" value={editForm.purchasePrice} onChange={(e) => setEditForm({ ...editForm, purchasePrice: e.target.value })} placeholder="0" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={updating}>Annuler</Button>
                            <Button type="submit" disabled={updating}>{updating ? (<><Spinner className="mr-2" />Mise à jour…</>) : 'Enregistrer'}</Button>
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
                                try { toast.success('Catégorie créée'); } catch { }
                            } else {
                                try { toast.error(data.error || 'Erreur lors de la création de la catégorie'); } catch { }
                            }
                        } catch {
                            try { toast.error('Erreur réseau'); } catch { }
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
                            setMoving(true);
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
                            try { toast.success('Mouvement enregistré'); } catch { }
                        } catch {
                            try { toast.error('Mouvement impossible'); } catch { }
                        } finally { setMoving(false); }
                    }} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600">Quantité</label>
                            <Input type="number" inputMode="decimal" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} placeholder="0" required />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setMoveOpen(false)} disabled={moving}>Annuler</Button>
                            <Button type="submit" disabled={moving}>{moving ? (<><Spinner className="mr-2" />Validation…</>) : 'Valider'}</Button>
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


