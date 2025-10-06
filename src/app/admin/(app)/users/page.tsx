"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Plus,
    MoreHorizontal,
    Edit,
    Trash2,
    Eye,
    Mail,
    Building2,
    Shield
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserDialog } from '../../users/components/UserDialog';
import Link from 'next/link';

interface User {
    id: string;
    email: string;
    name: string | null;
    createdAt: Date;
    updatedAt: Date;
    memberships: {
        id: string;
        role: string;
        tenant: {
            id: string;
            name: string;
            slug: string;
            status: string;
        };
    }[];
}

const roleLabels = {
    owner: 'Propriétaire',
    admin: 'Administrateur',
    user: 'Utilisateur',
};

const roleColors = {
    owner: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    user: 'bg-gray-100 text-gray-800',
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Charger les utilisateurs
    const loadUsers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des utilisateurs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleCreateUser = () => {
        setSelectedUser(null);
        setDialogOpen(true);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setDialogOpen(true);
    };

    const handleUserSaved = () => {
        loadUsers();
    };

    const handleDeleteUser = async (userId: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
            try {
                const response = await fetch(`/api/admin/users/${userId}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    loadUsers();
                } else {
                    const data = await response.json();
                    alert(data.error || 'Erreur lors de la suppression');
                }
            } catch (error) {
                alert('Erreur lors de la suppression');
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
                                <span className="text-gray-900 font-medium">Utilisateurs</span>
                            </div>
                        </li>
                    </ol>
                </nav>
                <div className="mt-2 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
                        <p className="text-gray-600">Gérer les utilisateurs et leurs accès aux entreprises</p>
                    </div>
                    <Button onClick={handleCreateUser}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nouvel utilisateur
                    </Button>
                </div>
            </div>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.length}</div>
                        <p className="text-xs text-muted-foreground">
                            +0% depuis le mois dernier
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Propriétaires</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {users.filter(u => u.memberships.some(m => m.role === 'owner')).length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Accès complet aux entreprises
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Administrateurs</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {users.filter(u => u.memberships.some(m => m.role === 'admin')).length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Gestion des utilisateurs
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Liste des utilisateurs */}
            <Card>
                <CardHeader>
                    <CardTitle>Liste des Utilisateurs</CardTitle>
                    <CardDescription>
                        Gérez les utilisateurs et leurs rôles dans les entreprises
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {users.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun utilisateur</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Commencez par créer votre premier utilisateur.
                            </p>
                            <div className="mt-6">
                                <Button onClick={handleCreateUser}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nouvel utilisateur
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <Users className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-900">
                                                {user.name || 'Nom non défini'}
                                            </h3>
                                            <p className="text-sm text-gray-500 flex items-center">
                                                <Mail className="h-3 w-3 mr-1" />
                                                {user.email}
                                            </p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                {user.memberships.map((membership) => (
                                                    <div key={membership.id} className="flex items-center space-x-1">
                                                        <Badge className={roleColors[membership.role as keyof typeof roleColors]}>
                                                            {roleLabels[membership.role as keyof typeof roleLabels]}
                                                        </Badge>
                                                        <span className="text-xs text-gray-500">
                                                            @ {membership.tenant.name}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500">
                                                {user.memberships.length} entreprise{user.memberships.length > 1 ? 's' : ''}
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
                                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Modifier
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Supprimer
                                                </DropdownMenuItem>
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
            <UserDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                user={selectedUser}
                onSaved={handleUserSaved}
            />
        </div>
    );
}

