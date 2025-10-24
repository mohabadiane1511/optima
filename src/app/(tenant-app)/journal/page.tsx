"use client";

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type LogItem = {
    id: string;
    createdAt: string;
    action: string;
    entity: string;
    entityId?: string | null;
    actorName?: string | null;
    actorEmail?: string | null;
    route?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: any;
};

export default function JournalPage() {
    const [items, setItems] = useState<LogItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    // Utiliser une valeur sentinelle 'all' plutôt que chaîne vide
    const [action, setAction] = useState<string>('all');
    const [entity, setEntity] = useState<string>('all');
    const [retentionCount, setRetentionCount] = useState<number>(0);
    const [retentionCutoff, setRetentionCutoff] = useState<string>('');
    const [purging, setPurging] = useState(false);

    const [loading, setLoading] = useState(false);
    const load = async () => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        if (action !== 'all') params.set('action', action);
        if (entity !== 'all') params.set('entity', entity);
        setLoading(true);
        try {
            const res = await fetch(`/api/tenant/audit-logs?${params.toString()}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
                setTotalPages(data.pagination?.totalPages || 1);
            } else {
                setItems([]);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [page, action, entity]);

    // Charger les stats de rétention (30 jours)
    const loadRetention = async () => {
        const res = await fetch('/api/tenant/audit-logs/stats', { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            setRetentionCount((data.count || 0) + (data.countSoon || 0));
            setRetentionCutoff(data.purgeAt ? new Date(data.purgeAt).toLocaleDateString('fr-FR') : (data.cutoff ? new Date(data.cutoff).toLocaleDateString('fr-FR') : ''));
        }
    };
    useEffect(() => { loadRetention(); }, []);

    const purgeOld = async () => {
        if (!confirm('Supprimer définitivement les événements plus vieux que 30 jours ?')) return;
        setPurging(true);
        try {
            const res = await fetch('/api/tenant/audit-logs/purge', { method: 'POST' });
            if (res.ok) {
                await load();
                await loadRetention();
                alert('Purge effectuée.');
            } else {
                alert("Erreur lors de la purge");
            }
        } finally {
            setPurging(false);
        }
    };

    const actorLabel = (l: LogItem) => l.actorName || l.actorEmail || 'Un utilisateur';
    const money = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
    const sentence = (l: LogItem) => {
        const actor = actorLabel(l);
        switch (l.action) {
            case 'auth.login.success':
                return `${actor} s’est connecté.`;
            case 'auth.login.failed':
                return `Échec de connexion pour ${actor}.`;
            case 'auth.logout':
                return `${actor} s’est déconnecté.`;
            case 'invoice.created':
                return `${actor} a créé une facture (ID ${l.entityId}).`;
            case 'invoice.issued': {
                const num = l.metadata?.number || l.entityId;
                return `${actor} a émis la facture ${num}.`;
            }
            case 'invoice.cancelled':
                return `${actor} a annulé la facture ${l.metadata?.number || l.entityId}.`;
            case 'payment.recorded': {
                const amt = l.metadata?.amount ? money(Number(l.metadata.amount)) : '—';
                const method = l.metadata?.method || '—';
                const num = l.metadata?.invoiceNumber || l.metadata?.invoiceId || l.entityId;
                return `${actor} a enregistré un paiement de ${amt} (${method}) sur la facture ${num}.`;
            }
            case 'stock.incremented':
                return `${actor} a ajouté ${l.metadata?.qty ?? '—'} au stock du produit ${l.metadata?.productName || l.metadata?.productId || '—'}.`;
            case 'stock.decremented':
                return `${actor} a retiré ${l.metadata?.qty ?? '—'} du stock du produit ${l.metadata?.productName || l.metadata?.productId || '—'}.`;
            case 'product.created':
                return `${actor} a créé le produit ${l.metadata?.sku || ''} ${l.metadata?.name || ''}.`.trim();
            default:
                return `${actor} a effectué l’action ${l.action} (${l.entity}${l.entityId ? `#${l.entityId}` : ''}).`;
        }
    };

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold">Journal</h1>
            {retentionCount > 0 && (
                <Card className="p-4 bg-amber-50 border-amber-200">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-amber-900">
                            {retentionCount} événement(s) seront supprimés automatiquement le {retentionCutoff}.
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => window.open('/api/tenant/audit-logs/export?olderThan=30d', '_blank')}>Exporter avant suppression totale</Button>
                        </div>
                    </div>
                </Card>
            )}
            <div className="flex gap-2">
                <Select value={action} onValueChange={(v) => setAction(v)}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Action" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value="invoice.created">invoice.created</SelectItem>
                        <SelectItem value="invoice.issued">invoice.issued</SelectItem>
                        <SelectItem value="invoice.cancelled">invoice.cancelled</SelectItem>
                        <SelectItem value="payment.recorded">payment.recorded</SelectItem>
                        <SelectItem value="stock.incremented">stock.incremented</SelectItem>
                        <SelectItem value="stock.decremented">stock.decremented</SelectItem>
                        <SelectItem value="product.created">product.created</SelectItem>
                        <SelectItem value="auth.login.success">auth.login.success</SelectItem>
                        <SelectItem value="auth.login.failed">auth.login.failed</SelectItem>
                        <SelectItem value="auth.logout">auth.logout</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={entity} onValueChange={(v) => setEntity(v)}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Entité" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value="invoice">invoice</SelectItem>
                        <SelectItem value="payment">payment</SelectItem>
                        <SelectItem value="stock_movement">stock_movement</SelectItem>
                        <SelectItem value="product">product</SelectItem>
                        <SelectItem value="user">user</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card className="p-4">
                <div className="divide-y">
                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-4/6" />
                        </div>
                    ) : items.map((l) => (
                        <div key={l.id} className="py-3 text-sm">
                            <div className="flex justify-between">
                                <div className="font-medium">{sentence(l)}</div>
                                <div className="text-gray-500">{new Date(l.createdAt).toLocaleString('fr-FR')}</div>
                            </div>
                            <div className="text-gray-600">
                                {l.route ? (<span>Route {l.route}. </span>) : null}
                                {l.ip ? (<span>IP {l.ip}. </span>) : null}
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (<div className="py-6 text-gray-500">Aucun événement.</div>)}
                </div>
            </Card>

            <div className="flex justify-between items-center">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</Button>
                <div className="text-sm text-gray-600">Page {page} / {totalPages}</div>
                <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Suivant</Button>
            </div>
        </div>
    );
}


