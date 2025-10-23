'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2, MoreHorizontal, ToggleLeft, ToggleRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Member = { id: string; userId: string; name: string | null; email: string; role: string; joinedAt: string; mustChangePassword?: boolean, active?: boolean };

export default function MembersPage() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<Member[]>([]);
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Member | null>(null);
    const [form, setForm] = useState<{ name: string; email: string; role: string }>({ name: '', email: '', role: 'viewer' });
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [me, setMe] = useState<{ role: string | null; userId: string | null }>({ role: null, userId: null });

    async function load() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', '10');
            if (q.trim()) params.set('q', q.trim());
            if (roleFilter) params.set('role', roleFilter);
            if (statusFilter) params.set('status', statusFilter);
            const res = await fetch(`/api/tenant/members?${params.toString()}`, { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Erreur de chargement');
            setItems(data.items || []);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch (e: any) {
            toast.error(e?.message || 'Erreur');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, roleFilter, statusFilter]);

    // Recherche instantanée (debounce 300ms)
    useEffect(() => {
        const id = setTimeout(() => { setPage(1); load(); }, 300);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    // Charger mon identité (pour masquer mes propres actions si admin)
    useEffect(() => {
        (async () => {
            try { const res = await fetch('/api/tenant/me', { cache: 'no-store' }); const data = await res.json(); setMe({ role: data?.role || null, userId: data?.userId || null }); } catch { }
        })();
    }, []);

    const filtered = useMemo(() => items, [items]);

    function openCreate() {
        setEditing(null);
        setForm({ name: '', email: '', role: 'viewer' });
        setDialogOpen(true);
    }

    // Plus d'édition de rôle: seul 'viewer' est utilisé

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (!editing) {
                const res = await fetch('/api/tenant/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email, name: form.name, role: form.role }) });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Échec de création');
                toast.success('Utilisateur créé. Un email d\'invitation a été envoyé.');
            } else {
                const res = await fetch(`/api/tenant/members/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: form.role }) });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Échec de mise à jour');
                toast.success('Utilisateur mis à jour');
            }
            setDialogOpen(false);
            load();
        } catch (e: any) {
            toast.error(e?.message || 'Erreur');
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Utilisateurs</h1>
                <p className="text-sm text-gray-500">Gérez les membres de votre organisation.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Membres</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Input placeholder="Recherche nom ou email" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
                        <Select value={roleFilter || undefined} onValueChange={(v) => { setRoleFilter(v === 'all' ? '' : v); setPage(1); }}>
                            <SelectTrigger className="w-40"><SelectValue placeholder="Rôle" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les rôles</SelectItem>
                                <SelectItem value="viewer">Lecteur</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter || undefined} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
                            <SelectTrigger className="w-44"><SelectValue placeholder="Statut" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les statuts</SelectItem>
                                <SelectItem value="active">Actif</SelectItem>
                                <SelectItem value="init">À initialiser</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="ml-auto">
                            <Button onClick={openCreate}><Plus className="h-4 w-4" />Créer</Button>
                        </div>
                    </div>

                    <div className="border rounded-md overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Rôle</TableHead>
                                    <TableHead>État</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!loading && filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-sm text-gray-500">Aucun membre</TableCell>
                                    </TableRow>
                                )}
                                {filtered.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell>{m.name || '—'}</TableCell>
                                        <TableCell>{m.email}</TableCell>
                                        <TableCell className="capitalize">{m.role}</TableCell>
                                        <TableCell>
                                            {m.active ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Actif</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">Inactif</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {/* Empêcher l'admin d'agir sur lui-même */}
                                            {me.userId === m.userId ? (
                                                <span className="text-xs text-gray-400">—</span>
                                            ) : (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="icon" aria-label="Actions"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={async () => {
                                                            try {
                                                                const res = await fetch(`/api/tenant/members/${m.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !m.active }) });
                                                                const data = await res.json();
                                                                if (!res.ok) throw new Error(data?.error || 'Erreur statut');
                                                                toast.success(data.active ? 'Membre activé' : 'Membre désactivé');
                                                                load();
                                                            } catch (e: any) { toast.error(e?.message || 'Erreur'); }
                                                        }}>
                                                            {m.active ? <><ToggleLeft className="h-4 w-4 mr-2" />Désactiver</> : <><ToggleRight className="h-4 w-4 mr-2" />Activer</>}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem disabled={m.active} onClick={async () => {
                                                            if (!confirm('Supprimer ce membre ?')) return;
                                                            try {
                                                                const res = await fetch(`/api/tenant/members/${m.id}`, { method: 'DELETE' });
                                                                const data = await res.json();
                                                                if (!res.ok) throw new Error(data?.error || 'Erreur suppression');
                                                                toast.success('Membre supprimé');
                                                                load();
                                                            } catch (e: any) { toast.error(e?.message || 'Erreur'); }
                                                        }}>
                                                            <Trash2 className="h-4 w-4 mr-2" />Supprimer
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">Page {page} / {totalPages}</div>
                        <div className="flex gap-2">
                            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</Button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), Math.max(0, page - 3) + 5).map(n => (
                                <Button key={n} variant={n === page ? 'default' : 'outline'} onClick={() => setPage(n)}>{n}</Button>
                            ))}
                            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Suivant</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Modifier utilisateur' : 'Créer un utilisateur'}</DialogTitle>
                        <DialogDescription>
                            {editing ? 'Ajustez le rôle du membre.' : 'Renseignez les informations de base; un mot de passe temporaire sera généré.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="space-y-4">
                        {!editing && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nom</label>
                                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nom (optionnel)" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@exemple.com" required />
                                </div>
                            </>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Rôle</label>
                            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un rôle" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="viewer">Lecteur</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                            <Button type="submit">{editing ? 'Enregistrer' : 'Créer'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}


