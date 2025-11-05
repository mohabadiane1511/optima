"use client";

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

export default function StatusSelect({ id, value }: { id: string; value: string }) {
    const initial = value && value.length > 0 ? value : 'new';
    const [status, setStatus] = useState(initial);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    async function update(next: string) {
        try {
            setSaving(true);
            setStatus(next);
            const res = await fetch(`/api/admin/messages/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: next }),
            });
            if (!res.ok) throw new Error('failed');
            router.refresh();
        } catch {
            setStatus(value);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Select value={status} onValueChange={update} disabled={saving}>
            <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="new">Nouveau</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="closed">Clôturé</SelectItem>
            </SelectContent>
        </Select>
    );
}


