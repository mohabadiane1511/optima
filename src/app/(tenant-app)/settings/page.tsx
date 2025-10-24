'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CldUploadWidget, CloudinaryUploadWidgetResults } from 'next-cloudinary';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';

type OrgData = {
    name: string;
    logoUrl: string | null;
    businessRegistration: string | null;
    ninea: string | null;
};

type ProfileData = {
    firstName: string;
    lastName: string;
    email: string;
};

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [org, setOrg] = useState<OrgData | null>(null);
    const [form, setForm] = useState<{ logoUrl?: string; businessRegistration?: string; ninea?: string }>({});
    const [editing, setEditing] = useState(false);
    const [myRole, setMyRole] = useState<string | null>(null);

    // Section profil utilisateur
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [profileForm, setProfileForm] = useState<{ firstName?: string; lastName?: string }>({});
    const [profileEditing, setProfileEditing] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Charger mon rôle pour gérer la visibilité des sections
                try {
                    const r = await fetch('/api/tenant/me', { cache: 'no-store' });
                    const rd = await r.json();
                    if (mounted) setMyRole(rd?.role || null);
                } catch { }

                const res = await fetch('/api/tenant/organization', { cache: 'no-store' });
                if (!res.ok) throw new Error('Impossible de charger les informations');
                const data = (await res.json()) as OrgData;
                if (!mounted) return;
                setOrg(data);
                setForm({
                    logoUrl: data.logoUrl || '',
                    businessRegistration: data.businessRegistration || '',
                    ninea: data.ninea || '',
                });
                setEditing(false);
            } catch (e: any) {
                toast.error(e?.message || 'Erreur de chargement');
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch('/api/tenant/me/profile', { cache: 'no-store' });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Impossible de charger le profil');
                if (!mounted) return;
                setProfile(data as ProfileData);
                setProfileForm({ firstName: data.firstName || '', lastName: data.lastName || '' });
                setProfileEditing(false);
            } catch (e: any) {
                toast.error(e?.message || 'Erreur de chargement du profil');
            } finally {
                if (mounted) setProfileLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    async function onSave(e?: React.FormEvent) {
        if (e?.preventDefault) e.preventDefault();
        setSaving(true);
        try {
            const payload: any = {};
            if (form.logoUrl !== undefined) payload.logoUrl = String(form.logoUrl || '').trim();
            if (form.businessRegistration !== undefined) payload.businessRegistration = String(form.businessRegistration || '').trim();
            if (form.ninea !== undefined) payload.ninea = String(form.ninea || '').trim();
            const res = await fetch('/api/tenant/organization', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Échec de la sauvegarde');
            toast.success('Paramètres mis à jour');
            setOrg((prev) => prev ? { ...prev, ...data } : data);
            setEditing(false);
        } catch (e: any) {
            toast.error(e?.message || 'Erreur');
        } finally {
            setSaving(false);
        }
    }

    async function onModifyClick() {
        if (!editing) {
            setEditing(true);
            return;
        }
        // En mode édition: enregistrer directement
        await onSave();
    }

    function onUpload(result: CloudinaryUploadWidgetResults) {
        try {
            const info: any = (result as any)?.info;
            const url: string | undefined = info?.secure_url || info?.url;
            if (url) {
                setForm((f) => ({ ...f, logoUrl: url }));
                toast.success('Logo téléchargé');
            }
        } catch {
            toast.error('Upload échoué');
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Paramètres</h1>
                <p className="text-sm text-gray-500">Gérez les informations de votre entreprise.</p>
            </div>

            <Separator />

            {myRole === 'admin' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Organisation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-9 w-full" />
                                <Skeleton className="h-9 w-full" />
                                <Skeleton className="h-9 w-full" />
                                <Skeleton className="h-10 w-48" />
                            </div>
                        ) : (
                            <form onSubmit={onSave} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Régistre de commerce</Label>
                                        <Input
                                            value={form.businessRegistration ?? ''}
                                            onChange={(e) => setForm((f) => ({ ...f, businessRegistration: e.target.value }))}
                                            readOnly={!editing}
                                            placeholder="Ex: SN-DKR-2024-XXXXX"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>NINEA</Label>
                                        <Input
                                            value={form.ninea ?? ''}
                                            onChange={(e) => setForm((f) => ({ ...f, ninea: e.target.value }))}
                                            readOnly={!editing}
                                            placeholder="Ex: 123456789"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Logo (URL)</Label>
                                        <Input
                                            value={form.logoUrl ?? ''}
                                            onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                                            readOnly={!editing}
                                            placeholder="https://…"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <CldUploadWidget uploadPreset="optima-logos" onSuccess={onUpload} options={{ folder: 'optima-logos', multiple: false }}>
                                        {({ open }) => (
                                            <Button type="button" variant="secondary" onClick={() => open?.()} disabled={!editing}>
                                                Télécharger un logo
                                            </Button>
                                        )}
                                    </CldUploadWidget>
                                    {form.logoUrl ? (
                                        <img src={form.logoUrl} alt="Logo" className="h-10 w-auto rounded border" />
                                    ) : null}
                                </div>

                                <div className="flex gap-3">
                                    <Button type="button" onClick={onModifyClick} disabled={saving}>
                                        {saving ? (
                                            <span className="inline-flex items-center gap-2"><Spinner /> Enregistrement…</span>
                                        ) : 'Modifier'}
                                    </Button>
                                    {editing && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => {
                                                // Réinitialiser aux valeurs d'origine et sortir du mode édition
                                                setForm({
                                                    logoUrl: org?.logoUrl || '',
                                                    businessRegistration: org?.businessRegistration || '',
                                                    ninea: org?.ninea || '',
                                                });
                                                setEditing(false);
                                                toast.info('Modifications annulées');
                                            }}
                                        >
                                            Annuler
                                        </Button>
                                    )}
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Mon compte</CardTitle>
                </CardHeader>
                <CardContent>
                    {profileLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Prénom</Label>
                                    <Input
                                        value={profileForm.firstName ?? ''}
                                        onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
                                        readOnly={!profileEditing}
                                        placeholder="Prénom"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nom</Label>
                                    <Input
                                        value={profileForm.lastName ?? ''}
                                        onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
                                        readOnly={!profileEditing}
                                        placeholder="Nom"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Email</Label>
                                    <Input value={profile?.email || ''} readOnly />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    disabled={profileSaving}
                                    onClick={async () => {
                                        if (!profileEditing) { setProfileEditing(true); return; }
                                        setProfileSaving(true);
                                        try {
                                            const payload: any = {};
                                            if (profileForm.firstName !== undefined) payload.firstName = String(profileForm.firstName || '').trim();
                                            if (profileForm.lastName !== undefined) payload.lastName = String(profileForm.lastName || '').trim();
                                            const res = await fetch('/api/tenant/me/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                                            const data = await res.json();
                                            if (!res.ok) throw new Error(data?.error || 'Échec de la sauvegarde');
                                            toast.success('Profil mis à jour');
                                            setProfile((prev) => prev ? { ...prev, firstName: payload.firstName ?? prev.firstName, lastName: payload.lastName ?? prev.lastName } : prev);
                                            setProfileEditing(false);
                                        } catch (e: any) {
                                            toast.error(e?.message || 'Erreur');
                                        } finally {
                                            setProfileSaving(false);
                                        }
                                    }}
                                >
                                    {profileSaving ? (
                                        <span className="inline-flex items-center gap-2"><Spinner /> Enregistrement…</span>
                                    ) : 'Modifier'}
                                </Button>
                                {profileEditing && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                            // Reset aux valeurs chargées
                                            setProfileForm({ firstName: profile?.firstName || '', lastName: profile?.lastName || '' });
                                            setProfileEditing(false);
                                            toast.info('Modifications annulées');
                                        }}
                                    >
                                        Annuler
                                    </Button>
                                )}
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


