"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusSelect from './StatusSelect';

export default function MessagesList({ items }: { items: any[] }) {
    const [status, setStatus] = useState<'all' | 'new' | 'in_progress' | 'closed'>('all');
    const [intent, setIntent] = useState<'all' | 'trial' | 'demo' | 'quote' | 'support' | 'partnership' | 'other'>('all');

    const filtered = useMemo(() => {
        return items.filter((m) => (status === 'all' ? true : m.status === status) && (intent === 'all' ? true : m.intent === intent));
    }, [items, status, intent]);

    const intentLabel: Record<string, string> = { trial: 'Essai', demo: 'Démo', quote: 'Devis', support: 'Support', partnership: 'Partenariat', other: 'Autre' } as any;
    const statusColor: Record<string, string> = { new: 'bg-blue-600', in_progress: 'bg-amber-600', closed: 'bg-gray-600' } as any;

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Messages</h1>
                    <p className="text-gray-600">Demandes reçues depuis la landing page</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Statut</span>
                        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous</SelectItem>
                                <SelectItem value="new">Nouveau</SelectItem>
                                <SelectItem value="in_progress">En cours</SelectItem>
                                <SelectItem value="closed">Clôturé</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Objet</span>
                        <Select value={intent} onValueChange={(v: any) => setIntent(v)}>
                            <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous</SelectItem>
                                <SelectItem value="trial">Essai</SelectItem>
                                <SelectItem value="demo">Démo</SelectItem>
                                <SelectItem value="quote">Devis</SelectItem>
                                <SelectItem value="support">Support</SelectItem>
                                <SelectItem value="partnership">Partenariat</SelectItem>
                                <SelectItem value="other">Autre</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {filtered.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Aucun message</CardTitle>
                        <CardDescription>Les nouveaux messages apparaîtront ici.</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((m: any) => (
                        <Card key={m.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">{m.fullName}</CardTitle>
                                    <Badge className={`${statusColor[m.status] || 'bg-blue-600'}`}>{m.status}</Badge>
                                </div>
                                <CardDescription>
                                    {m.createdAtText || new Date(m.createdAt).toISOString()} • {m.email}{m.phone ? ` • ${m.phone}` : ''}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <Badge variant="secondary">{intentLabel[m.intent] || m.intent}</Badge>
                                    <Badge variant="secondary">{m.profileType === 'individual' ? 'Particulier' : 'Entreprise'}</Badge>
                                    {m.company ? (<Badge variant="secondary" className="text-blue-600">{m.company}</Badge>) : null}
                                    {Array.isArray(m.modules) && m.modules.slice(0, 3).map((mod: string, i: number) => (
                                        <Badge key={i} variant="outline">{mod}</Badge>
                                    ))}
                                </div>
                                <div className="text-sm text-gray-700 leading-relaxed line-clamp-6 whitespace-pre-wrap">
                                    {m.message}
                                </div>
                                <div className="pt-3">
                                    <StatusSelect id={m.id} value={m.status} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}


