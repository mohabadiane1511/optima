'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setOk('');
        if (password !== confirm) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Erreur lors du changement');
            } else {
                setOk('Mot de passe mis à jour');
                setTimeout(() => router.push('/dashboard'), 800);
            }
        } catch (err) {
            setError('Erreur serveur');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-16">
            <Card>
                <CardHeader>
                    <CardTitle>Changer le mot de passe</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                    {ok && <Alert><AlertDescription>{ok}</AlertDescription></Alert>}
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Nouveau mot de passe</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm">Confirmer</Label>
                            <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                        </div>
                        <Button type="submit" disabled={loading}>{loading ? 'Modification...' : 'Changer'}</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}


