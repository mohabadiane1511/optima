"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function FiltersBar() {
    const router = useRouter();
    const sp = useSearchParams();
    const status = sp.get('status') || 'all';
    const intent = sp.get('intent') || 'all';

    function setParam(key: string, value: string) {
        const params = new URLSearchParams(sp.toString());
        if (value && value !== 'all') params.set(key, value); else params.delete(key);
        const search = params.toString();
        router.push(search ? `?${search}` : '?');
    }

    return (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Statut</span>
                <Select value={status} onValueChange={(v) => setParam('status', v)}>
                    <SelectTrigger className="w-44 h-9">
                        <SelectValue />
                    </SelectTrigger>
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
                <Select value={intent} onValueChange={(v) => setParam('intent', v)}>
                    <SelectTrigger className="w-56 h-9">
                        <SelectValue />
                    </SelectTrigger>
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
    );
}


