"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, CircleDollarSign, Scale } from 'lucide-react';

export default function BillingPage() {
    const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
    const [tenantId, setTenantId] = useState('');
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [period, setPeriod] = useState(defaultMonth);
    const [frequency, setFrequency] = useState<'monthly' | 'annual'>('monthly');
    const [preview, setPreview] = useState<any>(null);

    useEffect(() => {
        (async () => {
            const res = await fetch('/api/admin/tenants');
            if (res.ok) {
                const data = await res.json();
                setTenants(data.map((t: any) => ({ id: t.id, name: t.name })));
                if (data.length) setTenantId(data[0].id);
            }
        })();
    }, []);

    // Synchroniser la fréquence/period sur le tenant sélectionné
    useEffect(() => {
        (async () => {
            if (!tenantId) return;
            try {
                const res = await fetch(`/api/admin/tenants/${tenantId}`, { cache: 'no-store' });
                if (!res.ok) return;
                const t = await res.json();
                if (t?.billingFrequency) {
                    const f = t.billingFrequency as 'monthly' | 'annual';
                    setFrequency(f);
                    if (f === 'annual') {
                        setPeriod(String(now.getFullYear()));
                    } else {
                        setPeriod(defaultMonth);
                    }
                }
            } catch { }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId]);

    async function loadPreview() {
        if (!tenantId || !period) return;
        const url = `/api/admin/billing/preview?tenantId=${tenantId}&period=${period}&frequency=${frequency}`;
        const res = await fetch(url);
        if (res.ok) setPreview(await res.json());
    }

    async function createInvoice() {
        if (!tenantId || !period) return;
        const res = await fetch('/api/admin/billing/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId, period, frequency }),
        });
        if (res.ok) {
            await loadInvoices();
        }
    }

    const [invoices, setInvoices] = useState<any[]>([]);
    async function loadInvoices() {
        if (!tenantId) return;
        const res = await fetch(`/api/admin/billing/invoices?tenantId=${tenantId}&limit=10`);
        if (res.ok) setInvoices(await res.json());
    }

    async function updateStatus(id: string, action: 'markPaid' | 'markCancelled' | 'markIssued') {
        await fetch(`/api/admin/billing/invoices/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
        });
        await loadInvoices();
    }

    useEffect(() => { loadInvoices(); }, [tenantId]);

    const money = (v: number) => new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' FCFA';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Facturation</h1>
                <p className="text-gray-600">Générez des factures de plan pour les entreprises</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Paramètres</CardTitle>
                    <CardDescription>Sélectionnez l’entreprise et la période</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm">Entreprise</label>
                            <Select value={tenantId} onValueChange={setTenantId}>
                                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                                <SelectContent>
                                    {tenants.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm">Fréquence</label>
                            <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Mensuelle</SelectItem>
                                    <SelectItem value="annual">Annuelle</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm">Période {frequency === 'annual' ? '(AAAA)' : '(AAAA-MM)'} </label>
                            {frequency === 'monthly' ? (
                                <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
                            ) : (
                                <Select value={period} onValueChange={setPeriod}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button onClick={loadPreview}>Aperçu</Button>
                        {preview && (
                            <a className="inline-flex" href={`/api/admin/billing/pdf?tenantId=${tenantId}&period=${period}&frequency=${frequency}`} target="_blank" rel="noreferrer">
                                <Button variant="outline">Télécharger PDF</Button>
                            </a>
                        )}
                        {preview && (
                            <Button variant="secondary" onClick={createInvoice}>Créer facture</Button>
                        )}
                    </div>

                    {preview && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-gray-500">Plan</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-lg font-semibold">{preview.plan.name} [{preview.plan.code}]</CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-gray-500">Période</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-lg font-semibold">{preview.period} ({preview.frequency === 'annual' ? 'Annuel' : 'Mensuel'})</CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-gray-500 flex items-center gap-2"><Users className="h-4 w-4" /> Utilisateurs</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-gray-700">Actifs: <b>{preview.numbers.activeUsers}</b> — Inclus: <b>{preview.numbers.includedUsers}</b> — Extras: <b>{preview.numbers.extrasCount}</b></CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader className="pb-1">
                                        <CardTitle className="text-sm text-gray-500 flex items-center gap-2"><CircleDollarSign className="h-4 w-4" /> Base</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-2xl font-bold">{money(preview.amounts.base)}</CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-1">
                                        <CardTitle className="text-sm text-gray-500 flex items-center gap-2"><Scale className="h-4 w-4" /> Extras</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-2xl font-bold">{money(preview.amounts.extras)}</CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-1">
                                        <CardTitle className="text-sm text-gray-500">Total</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-3xl font-extrabold text-gray-900">{money(preview.amounts.total)}</CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Factures récentes</CardTitle>
                    <CardDescription>Dernières factures pour l’entreprise sélectionnée</CardDescription>
                </CardHeader>
                <CardContent>
                    {invoices.length === 0 ? (
                        <div className="text-sm text-gray-500">Aucune facture.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left text-gray-500">
                                    <tr>
                                        <th className="py-2">Période</th>
                                        <th className="py-2">Fréquence</th>
                                        <th className="py-2">Base</th>
                                        <th className="py-2">Extras</th>
                                        <th className="py-2">Total</th>
                                        <th className="py-2">Statut</th>
                                        <th className="py-2">Émise le</th>
                                        <th className="py-2"></th>
                                        <th className="py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((inv) => (
                                        <tr key={inv.id} className="border-t">
                                            <td className="py-2">{inv.period}</td>
                                            <td className="py-2">{inv.frequency === 'annual' ? 'Annuel' : 'Mensuel'}</td>
                                            <td className="py-2">{money(inv.baseAmount)}</td>
                                            <td className="py-2">{money(inv.extrasAmount)}</td>
                                            <td className="py-2 font-semibold">{money(inv.totalAmount)}</td>
                                            <td className="py-2">{inv.status}</td>
                                            <td className="py-2">{new Date(inv.issuedAt).toLocaleDateString('fr-FR')}</td>
                                            <td className="py-2"><a className="text-blue-600" href={`/api/admin/billing/pdf?tenantId=${tenantId}&period=${inv.period}&frequency=${inv.frequency}`} target="_blank" rel="noreferrer">PDF</a></td>
                                            <td className="py-2 space-x-2">
                                                <button className="text-green-700" onClick={() => updateStatus(inv.id, 'markPaid')}>Marquer payé</button>
                                                <button className="text-red-700" onClick={() => updateStatus(inv.id, 'markCancelled')}>Annuler</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


