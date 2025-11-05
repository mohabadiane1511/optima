"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Building2,
    Plus,
    Users,
    Globe,
    MoreHorizontal,
    Edit,
    Trash2,
    Eye,
    Power,
    PowerOff
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { TenantDialog } from '../../tenants/components/TenantDialog';
import Link from 'next/link';
import { toast } from 'sonner';
import { Minus, Plus as PlusIcon } from 'lucide-react';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
    maxUsers?: number | null;
    plan?: { code: string; name: string } | null;
    _count: {
        memberships: number;
        domains: number;
    };
}

export default function TenantsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    // Filtres & pagination (client-side)
    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [planFilter, setPlanFilter] = useState<'all' | 'ESSENTIEL' | 'CROISSANCE' | 'SERENITE' | 'PREMIUM'>('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Charger les tenants
    const loadTenants = async () => {
        try {
            const response = await fetch('/api/admin/tenants');
            if (response.ok) {
                const data = await response.json();
                setTenants(data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des tenants:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTenants();
    }, []);

    // Reset page when filters change
    useEffect(() => { setPage(1); }, [q, statusFilter, planFilter]);

    const handleCreateTenant = () => {
        setSelectedTenant(null);
        setDialogOpen(true);
    };

    const handleEditTenant = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setDialogOpen(true);
    };

    const handleTenantSaved = () => {
        loadTenants();
        toast.success(selectedTenant ? 'Entreprise modifiée' : 'Entreprise créée');
    };

    const handleDeactivateTenant = async (tenantId: string) => {
        if (confirm('Êtes-vous sûr de vouloir désactiver cette entreprise ?')) {
            try {
                const response = await fetch(`/api/admin/tenants/${tenantId}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    loadTenants();
                    toast.success('Entreprise désactivée');
                } else {
                    const data = await response.json();
                    toast.error(data.error || 'Erreur lors de la désactivation');
                }
            } catch (error) {
                toast.error('Erreur lors de la désactivation');
            }
        }
    };

    const handleReactivateTenant = async (tenantId: string) => {
        try {
            const response = await fetch(`/api/admin/tenants/${tenantId}`, {
                method: 'PATCH',
            });

            if (response.ok) {
                loadTenants();
                toast.success('Entreprise réactivée');
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erreur lors de la réactivation');
            }
        } catch (error) {
            toast.error('Erreur lors de la réactivation');
        }
    };

    const handlePermanentDeleteTenant = async (tenantId: string) => {
        if (confirm('⚠️ ATTENTION: Cette action est irréversible !\n\nÊtes-vous sûr de vouloir supprimer définitivement cette entreprise ?\n\nToutes les données seront perdues.')) {
            try {
                const response = await fetch(`/api/admin/tenants/${tenantId}/permanent`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    loadTenants();
                    toast.success('Entreprise supprimée définitivement');
                } else {
                    const data = await response.json();
                    toast.error(data.error || 'Erreur lors de la suppression définitive');
                }
            } catch (error) {
                toast.error('Erreur lors de la suppression définitive');
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb et titre */}
            <div>
                <nav className="flex" aria-label="Breadcrumb">
                    <ol className="inline-flex items-center space-x-1 md:space-x-3">
                        <li className="inline-flex items-center">
                            <Link href="/admin/(app)/dashboard" className="text-gray-500 hover:text-gray-700">
                                Super Admin
                            </Link>
                        </li>
                        <li>
                            <div className="flex items-center">
                                <span className="mx-2 text-gray-400">/</span>
                                <span className="text-gray-900 font-medium">Entreprises</span>
                            </div>
                        </li>
                    </ol>
                </nav>
                <div className="mt-2 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestion des Entreprises</h1>
                        <p className="text-gray-600">Créer et gérer les entreprises utilisant Optima ERP</p>
                    </div>
                    <Button onClick={handleCreateTenant}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nouvelle entreprise
                    </Button>
                </div>
            </div>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Entreprises</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tenants.length}</div>
                        <p className="text-xs text-muted-foreground">
                            +0% depuis le mois dernier
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Entreprises Actives</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {tenants.filter(t => t.status === 'active').length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {Math.round((tenants.filter(t => t.status === 'active').length / Math.max(tenants.length, 1)) * 100)}% du total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Utilisateurs Total</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {tenants.reduce((acc, t) => acc + t._count.memberships, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Répartis sur {tenants.length} entreprises
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Liste des tenants */}
            <Card>
                <CardHeader>
                    <CardTitle>Liste des Entreprises</CardTitle>
                    <CardDescription>
                        Gérez les entreprises et leurs configurations
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Filtres */}
                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                        <div className="flex-1">
                            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, slug, email, téléphone)" className="h-9" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                                <SelectTrigger className="w-44 h-9">
                                    <SelectValue placeholder="Tous les statuts" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les statuts</SelectItem>
                                    <SelectItem value="active">Actif</SelectItem>
                                    <SelectItem value="inactive">Inactif</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={planFilter} onValueChange={(v: any) => setPlanFilter(v)}>
                                <SelectTrigger className="w-48 h-9">
                                    <SelectValue placeholder="Tous les plans" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les plans</SelectItem>
                                    <SelectItem value="ESSENTIEL">Essentiel</SelectItem>
                                    <SelectItem value="CROISSANCE">Croissance</SelectItem>
                                    <SelectItem value="SERENITE">Sérénité</SelectItem>
                                    <SelectItem value="PREMIUM">Premium</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={String(pageSize)} onValueChange={(v: any) => { setPage(1); setPageSize(Number(v)); }}>
                                <SelectTrigger className="w-24 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Calcul filtrage/pagination */}
                    {(() => {
                        const lower = q.trim().toLowerCase();
                        const filtered = tenants.filter(t => {
                            const matchesQ = !lower || [t.name, t.slug, t.contactEmail, t.contactPhone].some(v => (v || '').toLowerCase().includes(lower));
                            const matchesStatus = statusFilter === 'all' ? true : t.status === statusFilter;
                            const matchesPlan = planFilter === 'all' ? true : (t.plan?.code === planFilter);
                            return matchesQ && matchesStatus && matchesPlan;
                        });
                        const total = filtered.length;
                        const totalPages = Math.max(1, Math.ceil(total / pageSize));
                        const safePage = Math.min(page, totalPages);
                        const start = (safePage - 1) * pageSize;
                        const slice = filtered.slice(start, start + pageSize);

                        return (
                            <>
                                {slice.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune entreprise</h3>
                                        <p className="mt-1 text-sm text-gray-500">Aucun résultat pour ces filtres.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {slice.map((tenant) => (
                                            <div key={tenant.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        <Building2 className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-medium text-gray-900">{tenant.name}</h3>
                                                        <p className="text-sm text-gray-500">{tenant.slug}</p>
                                                        {tenant.description && (<p className="text-xs text-gray-400 mt-1">{tenant.description}</p>)}
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-4">
                                                    <div className="text-right">
                                                        <div className="flex items-center space-x-2">
                                                            <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>{tenant.status === 'active' ? 'Actif' : 'Inactif'}</Badge>
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {tenant._count.memberships} utilisateur{tenant._count.memberships > 1 ? 's' : ''}
                                                            {typeof tenant.maxUsers === 'number' && (<> — capacité {tenant.maxUsers}</>)}
                                                        </div>
                                                        {tenant.plan?.code && (<div className="text-xs text-gray-400">Plan: {tenant.plan.code}</div>)}
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEditTenant(tenant)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                                                            {tenant.status === 'active' ? (
                                                                <DropdownMenuItem onClick={() => handleDeactivateTenant(tenant.id)} className="text-orange-600"><PowerOff className="mr-2 h-4 w-4" />Désactiver</DropdownMenuItem>
                                                            ) : (
                                                                <>
                                                                    <DropdownMenuItem onClick={() => handleReactivateTenant(tenant.id)} className="text-green-600"><Power className="mr-2 h-4 w-4" />Réactiver</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handlePermanentDeleteTenant(tenant.id)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Supprimer définitivement</DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Pagination */}
                                <div className="flex items-center justify-between mt-4 text-sm">
                                    <div className="text-gray-600">Page {safePage} / {totalPages} • {total} éléments</div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>Précédent</Button>
                                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>Suivant</Button>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                    {tenants.length === 0 ? (
                        <div className="text-center py-12">
                            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune entreprise</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Commencez par créer votre première entreprise.
                            </p>
                            <div className="mt-6">
                                <Button onClick={handleCreateTenant}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nouvelle entreprise
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tenants.map((tenant) => (
                                <div
                                    key={tenant.id}
                                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-900">{tenant.name}</h3>
                                            <p className="text-sm text-gray-500">{tenant.slug}</p>
                                            {tenant.description && (
                                                <p className="text-xs text-gray-400 mt-1">{tenant.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                            <div className="flex items-center space-x-2">
                                                <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                                                    {tenant.status === 'active' ? 'Actif' : 'Inactif'}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {tenant._count.memberships} utilisateur{tenant._count.memberships > 1 ? 's' : ''}
                                                {typeof tenant.maxUsers === 'number' && (
                                                    <> — capacité {tenant.maxUsers}</>
                                                )}
                                            </div>
                                            {tenant.plan?.code && (
                                                <div className="text-xs text-gray-400">Plan: {tenant.plan.code}</div>
                                            )}
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={async () => {
                                                    try {
                                                        const res = await fetch(`/api/admin/tenants/${tenant.id}/capacity`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta: 1 }) });
                                                        const data = await res.json();
                                                        if (!res.ok) throw new Error(data?.error || 'Erreur capacité');
                                                        toast.success('Capacité augmentée à ' + data.maxUsers);
                                                    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
                                                }}>
                                                    <PlusIcon className="mr-2 h-4 w-4" />Augmenter capacité (+1)
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={async () => {
                                                    try {
                                                        const res = await fetch(`/api/admin/tenants/${tenant.id}/capacity`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta: -1 }) });
                                                        const data = await res.json();
                                                        if (!res.ok) throw new Error(data?.error || 'Action refusée: ' + (data?.error || ''));
                                                        toast.success('Capacité réduite à ' + data.maxUsers);
                                                    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
                                                }}>
                                                    <Minus className="mr-2 h-4 w-4" />Réduire capacité (−1)
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Voir détails
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={async () => {
                                                    try {
                                                        const res = await fetch(`/api/admin/tenants/${tenant.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reapplyPlan' }) });
                                                        const data = await res.json();
                                                        if (!res.ok) throw new Error(data?.error || 'Erreur réapplication');
                                                        toast.success('Plan réappliqué');
                                                        loadTenants();
                                                    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
                                                }}>
                                                    <Edit className="mr-2 h-4 w-4" />Réappliquer le plan
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEditTenant(tenant)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Modifier
                                                </DropdownMenuItem>
                                                {tenant.status === 'active' ? (
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeactivateTenant(tenant.id)}
                                                        className="text-orange-600"
                                                    >
                                                        <PowerOff className="mr-2 h-4 w-4" />
                                                        Désactiver
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <>
                                                        <DropdownMenuItem
                                                            onClick={() => handleReactivateTenant(tenant.id)}
                                                            className="text-green-600"
                                                        >
                                                            <Power className="mr-2 h-4 w-4" />
                                                            Réactiver
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handlePermanentDeleteTenant(tenant.id)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Supprimer définitivement
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog de création/modification */}
            <TenantDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                tenant={selectedTenant}
                onSaved={handleTenantSaved}
            />
        </div>
    );
}

