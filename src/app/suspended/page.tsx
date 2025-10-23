
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SuspendedStandalonePage() {
    const router = useRouter();
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch('/api/tenant/status', { cache: 'no-store' });
                const data = await res.json();
                if (!mounted) return;
                if (data?.status !== 'inactive') {
                    // Si entreprise active et utilisateur connecté → /dashboard, sinon /auth/login
                    try {
                        const me = await fetch('/api/tenant/me', { cache: 'no-store' });
                        const meData = await me.json();
                        if (me.ok && meData?.role) {
                            router.replace('/dashboard');
                        } else {
                            router.replace('/auth/login');
                        }
                    } catch {
                        router.replace('/auth/login');
                    }
                    return;
                }
                setAllowed(true);
            } catch {
                // En cas d'erreur réseau, par défaut on laisse passer pour éviter une boucle
                setAllowed(true);
            }
        })();
        return () => { mounted = false; };
    }, [router]);

    if (!allowed) return null;
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <Card className="max-w-xl w-full text-center">
                <CardHeader>
                    <CardTitle>Compte désactivé</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-muted-foreground">
                        L'accès à cette organisation est temporairement suspendu, probablement pour un motif de paiement.
                        Si vous pensez qu'il s'agit d'une erreur, contactez le support.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <Button asChild>
                            <Link href="/">Revenir à l'accueil</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="mailto:contact@optima-erp.com">Contacter le support</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


