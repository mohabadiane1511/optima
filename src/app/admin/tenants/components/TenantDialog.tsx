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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Tenant {
    id?: string;
    name: string;
    slug: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
    status: 'active' | 'inactive';
}

interface TenantDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenant?: Tenant | null;
    onSaved: () => void;
}

export function TenantDialog({ open, onOpenChange, tenant, onSaved }: TenantDialogProps) {
    const [formData, setFormData] = useState<Tenant>({
        name: '',
        slug: '',
        description: '',
        contactEmail: '',
        contactPhone: '',
        status: 'active',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Réinitialiser le formulaire quand le dialog s'ouvre
    useEffect(() => {
        if (open) {
            if (tenant) {
                setFormData(tenant);
            } else {
                setFormData({
                    name: '',
                    slug: '',
                    description: '',
                    contactEmail: '',
                    contactPhone: '',
                    status: 'active',
                });
            }
            setError('');
        }
    }, [open, tenant]);

    // Générer le slug automatiquement à partir du nom
    const handleNameChange = (name: string) => {
        setFormData(prev => ({
            ...prev,
            name,
            slug: name.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim()
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const url = tenant ? `/api/admin/tenants/${tenant.id}` : '/api/admin/tenants';
            const method = tenant ? 'PUT' : 'POST';

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
                        {tenant ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}
                    </DialogTitle>
                    <DialogDescription>
                        {tenant
                            ? 'Modifiez les informations de l\'entreprise.'
                            : 'Créez une nouvelle entreprise pour utiliser Optima ERP.'
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
                        <Label htmlFor="name">Nom de l'entreprise *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="Ex: Entreprise ABC"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="slug">Slug (URL) *</Label>
                        <Input
                            id="slug"
                            value={formData.slug}
                            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                            placeholder="ex: entreprise-abc"
                            required
                        />
                        <p className="text-xs text-gray-500">
                            Utilisé pour l'URL: {formData.slug}.optima.com
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Description de l'entreprise..."
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contactEmail">Email de contact</Label>
                            <Input
                                id="contactEmail"
                                type="email"
                                value={formData.contactEmail}
                                onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                                placeholder="contact@entreprise.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contactPhone">Téléphone</Label>
                            <Input
                                id="contactPhone"
                                value={formData.contactPhone}
                                onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                                placeholder="+221 XX XXX XX XX"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Statut</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value: 'active' | 'inactive') =>
                                setFormData(prev => ({ ...prev, status: value }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Actif</SelectItem>
                                <SelectItem value="inactive">Inactif</SelectItem>
                            </SelectContent>
                        </Select>
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
                            {isLoading ? 'Enregistrement...' : (tenant ? 'Modifier' : 'Créer')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
