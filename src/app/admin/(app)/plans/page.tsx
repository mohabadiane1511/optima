"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PencilIcon, Trash2Icon } from 'lucide-react';

type Plan = {
    id: string;
    code: string;
    name: string;
    priceMonthlyFCFA: string | number;
    priceYearlyFCFA: string | number;
    includedUsers: number;
    extraUserCreationFeeFCFA: string | number;
    extraUserMonthlyFeeFCFA: string | number;
    modules: string[];
};

export default function AdminPlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Plan | null>(null);
    const [form, setForm] = useState<Partial<Plan>>({ code: '', name: '', priceMonthlyFCFA: 0, priceYearlyFCFA: 0, includedUsers: 0, extraUserCreationFeeFCFA: 0, extraUserMonthlyFeeFCFA: 0, modules: [] });

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/admin/plans', { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    setPlans(data);
                }
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const openCreate = () => { setEditing(null); setForm({ code: '', name: '', priceMonthlyFCFA: 0, priceYearlyFCFA: 0, includedUsers: 0, extraUserCreationFeeFCFA: 0, extraUserMonthlyFeeFCFA: 0, modules: [] }); setDialogOpen(true); };
    const openEdit = (p: Plan) => { setEditing(p); setForm(p); setDialogOpen(true); };

    const moduleOptions = [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'produits_stocks', label: 'Produits & Stocks' },
        { key: 'ventes', label: 'Ventes' },
        { key: 'achats', label: 'Achats' },
        { key: 'caisses', label: 'Caisses' },
        { key: 'rh', label: 'RH' },
        { key: 'etat_financier_pdf', label: 'Etat financier (PDF)' },
    ];

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            const payload = { ...form, modules: form.modules || [] } as any;
            const res = await fetch(editing ? `/api/admin/plans/${editing.id}` : '/api/admin/plans', {
                method: editing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Erreur');
            toast.success(editing ? 'Plan modifié' : 'Plan créé');
            setDialogOpen(false);
            setEditing(null);
            setForm({ code: '', name: '', priceMonthlyFCFA: 0, priceYearlyFCFA: 0, includedUsers: 0, extraUserCreationFeeFCFA: 0, extraUserMonthlyFeeFCFA: 0, modules: [] });
            // reload
            const all = await fetch('/api/admin/plans');
            setPlans(await all.json());
        } catch (e: any) {
            toast.error(e?.message || 'Erreur');
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
                <p className="text-gray-600">Liste des offres disponibles et modules inclus</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Plans tarifaires</CardTitle>
                    <CardDescription>Ces plans peuvent être assignés aux entreprises</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <Button onClick={openCreate}>Nouveau plan</Button>
                    </div>
                    <div className="border rounded-md overflow-hidden w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Mensuel</TableHead>
                                    <TableHead>Annuel</TableHead>
                                    <TableHead>Utilisateurs inclus</TableHead>
                                    <TableHead>Frais création extra</TableHead>
                                    <TableHead>Frais mensuel extra</TableHead>
                                    <TableHead>Modules</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!loading && plans.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-sm text-gray-500">Aucun plan</TableCell>
                                    </TableRow>
                                )}
                                {plans.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>{Number(p.priceMonthlyFCFA).toLocaleString()} FCFA</TableCell>
                                        <TableCell>{Number(p.priceYearlyFCFA).toLocaleString()} FCFA</TableCell>
                                        <TableCell>{p.includedUsers}</TableCell>
                                        <TableCell>{Number(p.extraUserCreationFeeFCFA).toLocaleString()} FCFA</TableCell>
                                        <TableCell>{Number(p.extraUserMonthlyFeeFCFA).toLocaleString()} FCFA</TableCell>
                                        <TableCell className="text-xs">{(p.modules || []).join(', ')}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" onClick={() => openEdit(p)}><PencilIcon className="w-2 h-2"/></Button>
                                            <Button variant="destructive" onClick={async () => {
                                                if (!confirm('Supprimer ce plan ?')) return;
                                                try {
                                                    const res = await fetch(`/api/admin/plans/${p.id}`, { method: 'DELETE' });
                                                    if (!res.ok) { const d = await res.json(); throw new Error(d?.error || 'Erreur'); }
                                                    toast.success('Plan supprimé');
                                                    const all = await fetch('/api/admin/plans'); setPlans(await all.json());
                                                } catch (e: any) { toast.error(e?.message || 'Erreur'); }
                                            }}><Trash2Icon className="w-2 h-2"/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Modifier un plan' : 'Nouveau plan'}</DialogTitle>
                        <DialogDescription>Définissez les tarifs, capacités et modules inclus</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm">Code</label>
                                <Input value={form.code as any} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required disabled={!!editing} />
                            </div>
                            <div>
                                <label className="text-sm">Nom</label>
                                <Input value={form.name as any} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                            </div>
                            <div>
                                <label className="text-sm">Mensuel (FCFA)</label>
                                <Input type="number" value={Number(form.priceMonthlyFCFA || 0)} onChange={(e) => setForm((f) => ({ ...f, priceMonthlyFCFA: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <label className="text-sm">Annuel (FCFA)</label>
                                <Input type="number" value={Number(form.priceYearlyFCFA || 0)} onChange={(e) => setForm((f) => ({ ...f, priceYearlyFCFA: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <label className="text-sm">Utilisateurs inclus</label>
                                <Input type="number" value={Number(form.includedUsers || 0)} onChange={(e) => setForm((f) => ({ ...f, includedUsers: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <label className="text-sm">Frais création extra (FCFA)</label>
                                <Input type="number" value={Number(form.extraUserCreationFeeFCFA || 0)} onChange={(e) => setForm((f) => ({ ...f, extraUserCreationFeeFCFA: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <label className="text-sm">Frais mensuel extra (FCFA)</label>
                                <Input type="number" value={Number(form.extraUserMonthlyFeeFCFA || 0)} onChange={(e) => setForm((f) => ({ ...f, extraUserMonthlyFeeFCFA: Number(e.target.value) }))} />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm">Modules inclus</label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {moduleOptions.map((m) => {
                                    const checked = Array.isArray(form.modules) && (form.modules as string[]).includes(m.key);
                                    return (
                                        <label key={m.key} className="flex items-center gap-2 text-sm">
                                            <input type="checkbox" checked={checked} onChange={(e) => {
                                                setForm((f) => {
                                                    const set = new Set<string>(Array.isArray(f.modules) ? (f.modules as string[]) : []);
                                                    if (e.target.checked) set.add(m.key); else set.delete(m.key);
                                                    return { ...f, modules: Array.from(set) };
                                                });
                                            }} />
                                            {m.label}
                                        </label>
                                    );
                                })}
                            </div>
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


