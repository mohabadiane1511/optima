"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    };

    const handleDeactivateTenant = async (tenantId: string) => {
        if (confirm('Êtes-vous sûr de vouloir désactiver cette entreprise ?')) {
            try {
                const response = await fetch(`/api/admin/tenants/${tenantId}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    loadTenants();
                } else {
                    const data = await response.json();
                    alert(data.error || 'Erreur lors de la désactivation');
                }
            } catch (error) {
                alert('Erreur lors de la désactivation');
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
            } else {
                const data = await response.json();
                alert(data.error || 'Erreur lors de la réactivation');
            }
        } catch (error) {
            alert('Erreur lors de la réactivation');
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
                } else {
                    const data = await response.json();
                    alert(data.error || 'Erreur lors de la suppression définitive');
                }
            } catch (error) {
                alert('Erreur lors de la suppression définitive');
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
                                            </div>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Voir détails
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

