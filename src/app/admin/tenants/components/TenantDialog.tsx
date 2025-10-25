"use client";

import { useState, useEffect, useRef } from 'react';
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
import { CldUploadWidget } from 'next-cloudinary';

interface Tenant {
    id?: string;
    name: string;
    slug: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
    // Informations légales et commerciales
    businessRegistration?: string; // Registre de commerce
    ninea?: string; // NINEA
    address?: string; // Adresse complète
    website?: string; // Site web
    logoUrl?: string; // URL du logo
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
        businessRegistration: '',
        ninea: '',
        address: '',
        website: '',
        logoUrl: '',
        status: 'active',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [adminCredentials, setAdminCredentials] = useState<{ email: string; password: string } | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');
    const uploadWidgetRef = useRef<any>(null);
    const [widgetReady, setWidgetReady] = useState(false);
    // ID stable pour le conteneur inline du widget Cloudinary
    const inlineContainerIdRef = useRef<string>('cld-widget-' + Math.random().toString(36).slice(2));

    // Plans (sélection du plan à la création/modification)
    type Plan = { id: string; code: string; name: string; includedUsers: number; modules: string[] };
    const [plans, setPlans] = useState<Plan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');

    // Réinitialiser le formulaire quand le dialog s'ouvre
    useEffect(() => {
        console.log('[TenantDialog] onOpenChange', { open });
        if (open) {
            // Charger la liste des plans pour la sélection
            (async () => {
                try {
                    const res = await fetch('/api/admin/plans', { cache: 'no-store' });
                    if (res.ok) {
                        const data = await res.json();
                        setPlans(Array.isArray(data) ? data : []);
                        if (!tenant && Array.isArray(data) && data.length) {
                            setSelectedPlanId(data[0].id);
                        }
                    }
                } catch { }
            })();
            if (tenant) {
                // S'assurer que toutes les valeurs sont des chaînes vides au lieu de null
                setFormData({
                    ...tenant,
                    description: tenant.description || '',
                    contactEmail: tenant.contactEmail || '',
                    contactPhone: tenant.contactPhone || '',
                    businessRegistration: tenant.businessRegistration || '',
                    ninea: tenant.ninea || '',
                    address: tenant.address || '',
                    website: tenant.website || '',
                    logoUrl: tenant.logoUrl || '',
                });
                setLogoPreview(tenant.logoUrl || '');
                // Récupérer planId courant si possible
                if (tenant.id) {
                    (async () => {
                        try {
                            const res = await fetch(`/api/admin/tenants/${tenant.id}`);
                            if (res.ok) {
                                const t = await res.json();
                                if (t?.planId) setSelectedPlanId(t.planId);
                            }
                        } catch { }
                    })();
                }
            } else {
                setFormData({
                    name: '',
                    slug: '',
                    description: '',
                    contactEmail: '',
                    contactPhone: '',
                    businessRegistration: '',
                    ninea: '',
                    address: '',
                    website: '',
                    logoUrl: '',
                    status: 'active',
                });
                setLogoPreview('');
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

    // Vérifier la configuration Cloudinary
    useEffect(() => {
        console.log('[TenantDialog] Variables Cloudinary (flags):', {
            cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
            hasApiKey: !!process.env.CLOUDINARY_API_KEY,
            hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
        });
    }, []);

    // Initialiser le widget quand le dialog s'ouvre
    useEffect(() => {
        const ready = !!(open && process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
        console.log('[TenantDialog] compute widgetReady', { open, cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, ready });
        if (ready) {
            setWidgetReady(true);
        } else {
            setWidgetReady(false);
        }
    }, [open]);

    // (Supprimé) Hacks z-index et listeners sur éléments Cloudinary

    // (Supprimé) MutationObserver qui déclenchait des fermetures imprévues

    // Gérer l'upload Cloudinary (signature next-cloudinary v5: (result, { widget }))
    const handleLogoUpload = (result: any, context?: { widget?: any }) => {
        console.log('[TenantDialog] onUpload callback fired', {
            event: result?.event,
            hasInfo: !!result?.info,
            infoKeys: result?.info ? Object.keys(result.info) : [],
            url: result?.info?.secure_url || result?.info?.url
        });

        const applyPreview = (url?: string) => {
            if (!url) return;
            setFormData(prev => ({ ...prev, logoUrl: url }));
            setLogoPreview(url);
            setError('');
            console.log('[TenantDialog] preview updated', { url });
        };

        // Cas 1: événement success
        if (result?.event === 'success') {
            const url = result?.info?.secure_url || result?.info?.url;
            applyPreview(url);
        }

        // Cas 2: fin de queue (widget inline)
        if (result?.event === 'queues-end' && Array.isArray(result?.info?.files)) {
            const files: any[] = result.info.files;
            const last = files[files.length - 1];
            const url = last?.uploadInfo?.secure_url || last?.uploadInfo?.url;
            applyPreview(url);
        }

        // Fermer le widget si présent (optionnel en inline)
        const widget = context?.widget;
        if (widget && typeof widget.close === 'function') {
            try { widget.close(); } catch { }
        }
    };

    // Ouvrir le widget d'upload
    const openUploadWidget = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const active = document.activeElement as HTMLElement | null;
        console.log('[TenantDialog] openUploadWidget click', {
            activeTag: active?.tagName,
            activeClasses: active?.className,
            widgetReady,
            hasRef: !!uploadWidgetRef.current,
            hasOpen: !!uploadWidgetRef.current?.open
        });

        try {
            if (uploadWidgetRef.current && uploadWidgetRef.current.open) {
                uploadWidgetRef.current.open();
                console.log('[TenantDialog] called widget.open()');
            } else {
                console.warn('[TenantDialog] widget.open not available yet');
            }
        } catch (err) {
            console.error('[TenantDialog] error calling widget.open()', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const url = tenant ? `/api/admin/tenants/${tenant.id}` : '/api/admin/tenants';
            const method = tenant ? 'PUT' : 'POST';

            const payload: any = { ...formData };
            if (selectedPlanId) payload.planId = selectedPlanId;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.adminEmail && result.tempPassword) {
                    setAdminCredentials({
                        email: result.adminEmail,
                        password: result.tempPassword
                    });
                } else {
                    onSaved();
                    onOpenChange(false);
                }
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
        <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
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
                            value={formData.description || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Description de l'entreprise..."
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contactEmail">Email de contact *</Label>
                            <Input
                                id="contactEmail"
                                type="email"
                                value={formData.contactEmail || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                                placeholder="contact@entreprise.com"
                                required
                            />
                            <p className="text-xs text-gray-500">
                                Cet email sera utilisé pour créer le compte administrateur de l'entreprise
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contactPhone">Téléphone</Label>
                            <Input
                                id="contactPhone"
                                value={formData.contactPhone || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                                placeholder="+221 XX XXX XX XX"
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label>Plan</Label>
                            <Select value={selectedPlanId} onValueChange={(v) => setSelectedPlanId(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.name} — {p.includedUsers} utilisateurs</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">Modules: {(plans.find(p => p.id === selectedPlanId)?.modules || []).join(', ')}</p>
                        </div>
                    </div>

                    {/* Section Informations légales et commerciales */}
                    <div className="space-y-4">
                        <div className="border-t pt-4">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations légales et commerciales</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="businessRegistration">Registre de commerce</Label>
                                    <Input
                                        id="businessRegistration"
                                        value={formData.businessRegistration || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, businessRegistration: e.target.value }))}
                                        placeholder="Ex: RC-DKR-2023-A-12345"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="ninea">NINEA</Label>
                                    <Input
                                        id="ninea"
                                        value={formData.ninea || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, ninea: e.target.value }))}
                                        placeholder="Ex: 1234567890"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Adresse complète</Label>
                                <Textarea
                                    id="address"
                                    value={formData.address || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="Adresse complète de l'entreprise..."
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="website">Site web</Label>
                                    <Input
                                        id="website"
                                        value={formData.website || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                                        placeholder="https://www.entreprise.com"
                                        type="url"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Logo de l'entreprise</Label>

                                    {/* Prévisualisation du logo */}
                                    {logoPreview && (
                                        <div className="mb-3">
                                            <img
                                                src={logoPreview}
                                                alt="Aperçu du logo"
                                                className="w-20 h-20 object-contain border border-gray-200 rounded"
                                            />
                                        </div>
                                    )}

                                    {/* Bouton d'upload Cloudinary */}
                                    {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={openUploadWidget}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onMouseUp={(e) => e.stopPropagation()}
                                                className="flex items-center justify-center w-full h-10 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                                            >
                                                <span className="text-sm text-gray-600">
                                                    {logoPreview ? 'Changer le logo' : 'Choisir un logo'}
                                                </span>
                                            </button>

                                            {/* Widget Cloudinary - Rendu conditionnel */}
                                            {widgetReady && (
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onMouseUp={(e) => e.stopPropagation()}
                                                    style={{
                                                        position: 'relative',
                                                        zIndex: 9999
                                                    }}
                                                >
                                                    {/* Conteneur inline pour afficher le widget à l'intérieur du Dialog */}
                                                    <div id={inlineContainerIdRef.current} />
                                                    <CldUploadWidget
                                                        onUpload={handleLogoUpload}
                                                        onSuccess={handleLogoUpload}
                                                        onQueuesEnd={handleLogoUpload}
                                                        onError={(error: any) => {
                                                            console.error('[TenantDialog] upload error', error);
                                                            setError("Erreur lors de l'upload du logo");
                                                        }}
                                                        uploadPreset="optima-logos"
                                                        options={{
                                                            folder: 'optima-logos',
                                                            resourceType: 'image',
                                                            maxFileSize: 5000000, // 5MB
                                                            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
                                                            theme: 'minimal',
                                                            styles: {
                                                                palette: {
                                                                    window: '#FFFFFF',
                                                                    sourceBg: '#F4F4F5',
                                                                    windowBorder: '#90A0B3',
                                                                    tabIcon: '#000000',
                                                                    inactiveTabIcon: '#555A5F',
                                                                    menuIcons: '#555A5F',
                                                                    link: '#0433FF',
                                                                    action: '#3399FF',
                                                                    inProgress: '#0433FF',
                                                                    complete: '#20B832',
                                                                    error: '#EA2727',
                                                                    textDark: '#000000',
                                                                    textLight: '#FFFFFF'
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        {({ open }: { open: any }) => {
                                                            // Stocker la fonction open dans la ref
                                                            uploadWidgetRef.current = { open };
                                                            console.log('[TenantDialog] CldUploadWidget child render, open assigned');
                                                            return null;
                                                        }}
                                                    </CldUploadWidget>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-10 border-2 border-dashed border-red-300 rounded-lg bg-red-50">
                                            <span className="text-sm text-red-600">
                                                Cloudinary non configuré
                                            </span>
                                        </div>
                                    )}

                                    <p className="text-xs text-gray-500">
                                        Formats acceptés: JPG, PNG, GIF, WebP. Taille max: 5MB
                                    </p>

                                    {/* URL manuelle (optionnel) */}
                                    <div className="mt-2">
                                        <Label htmlFor="logoUrl" className="text-sm text-gray-600">
                                            Ou URL directe (optionnel)
                                        </Label>
                                        <Input
                                            id="logoUrl"
                                            value={formData.logoUrl || ''}
                                            onChange={(e) => {
                                                setFormData(prev => ({ ...prev, logoUrl: e.target.value }));
                                                setLogoPreview(e.target.value);
                                            }}
                                            placeholder="https://exemple.com/logo.png"
                                            type="url"
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            </div>
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

                    {adminCredentials ? (
                        <div className="space-y-4">
                            <Alert className="bg-green-50 border-green-200">
                                <AlertDescription>
                                    <div className="space-y-2">
                                        <p className="font-medium text-green-800">
                                            L'entreprise a été créée avec succès !
                                        </p>
                                        <p className="text-sm text-green-700">
                                            Un compte administrateur a été créé avec les identifiants suivants :
                                        </p>
                                        <div className="bg-white p-4 rounded-md border border-green-200">
                                            <p><strong>Email :</strong> {adminCredentials.email}</p>
                                            <p><strong>Mot de passe temporaire :</strong> {adminCredentials.password}</p>
                                        </div>
                                        <p className="text-xs text-green-700">
                                            ⚠️ Notez bien ce mot de passe, il ne sera plus affiché par la suite.
                                        </p>
                                    </div>
                                </AlertDescription>
                            </Alert>
                            <DialogFooter>
                                <Button
                                    onClick={() => {
                                        setAdminCredentials(null);
                                        onSaved();
                                        onOpenChange(false);
                                    }}
                                >
                                    J'ai noté les identifiants
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
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
                    )}
                </form>
            </DialogContent>
        </Dialog>
    );
}
