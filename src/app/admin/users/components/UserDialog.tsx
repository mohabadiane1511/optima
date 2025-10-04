"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    status: string;
}

interface User {
    id?: string;
    email: string;
    name: string;
    password?: string;
    tenantId: string;
    role: string;
}

interface UserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user?: User | null;
    onSaved: () => void;
}

export function UserDialog({ open, onOpenChange, user, onSaved }: UserDialogProps) {
    const [formData, setFormData] = useState<User>({
        email: '',
        name: '',
        password: '',
        tenantId: '',
        role: 'user',
    });
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Charger les tenants
    const loadTenants = async () => {
        try {
            const response = await fetch('/api/admin/tenants');
            if (response.ok) {
                const data = await response.json();
                setTenants(data.filter((tenant: Tenant) => tenant.status === 'active'));
            }
        } catch (error) {
            console.error('Erreur lors du chargement des tenants:', error);
        }
    };

    // Réinitialiser le formulaire quand le dialog s'ouvre
    useEffect(() => {
        if (open) {
            loadTenants();
            if (user) {
                setFormData(user);
            } else {
                setFormData({
                    email: '',
                    name: '',
                    password: '',
                    tenantId: '',
                    role: 'user',
                });
            }
            setError('');
        }
    }, [open, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const url = user ? `/api/admin/users/${user.id}` : '/api/admin/users';
            const method = user ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                onSaved();
                onOpenChange(false);
            } else {
                const data = await response.json();
                setError(data.error || 'Une erreur est survenue');
            }
        } catch (error) {
            setError('Erreur de connexion');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                    </DialogTitle>
                    <DialogDescription>
                        {user
                            ? 'Modifiez les informations de l\'utilisateur.'
                            : 'Créez un nouvel utilisateur et assignez-le à une entreprise.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">Nom complet *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex: Jean Dupont"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="jean.dupont@entreprise.com"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">
                            Mot de passe {user ? '(laisser vide pour ne pas changer)' : '*'}
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="••••••••"
                            required={!user}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tenantId">Entreprise *</Label>
                        <Select
                            value={formData.tenantId}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, tenantId: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une entreprise" />
                            </SelectTrigger>
                            <SelectContent>
                                {tenants.map((tenant) => (
                                    <SelectItem key={tenant.id} value={tenant.id}>
                                        {tenant.name} ({tenant.slug})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Rôle *</Label>
                        <Select
                            value={formData.role}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un rôle" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">Utilisateur</SelectItem>
                                <SelectItem value="admin">Administrateur</SelectItem>
                                <SelectItem value="owner">Propriétaire</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                            <strong>Utilisateur:</strong> Accès de base aux modules<br />
                            <strong>Administrateur:</strong> Gestion des utilisateurs<br />
                            <strong>Propriétaire:</strong> Accès complet à l'entreprise
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Enregistrement...' : (user ? 'Modifier' : 'Créer')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
