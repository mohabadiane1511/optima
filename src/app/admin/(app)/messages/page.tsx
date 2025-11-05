import { prisma } from '@/lib/prisma';
import MessagesList from './MessagesList';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminMessagesPage() {
    const messages = await (prisma as any).message.findMany({ orderBy: { createdAt: 'desc' } });
    // Préformater la date côté serveur avec un fuseau fixe pour éviter les divergences SSR/CSR
    const items = messages.map((m: any) => ({
        ...m,
        createdAtText: new Date(m.createdAt).toLocaleString('fr-FR', { timeZone: 'UTC' }),
    }));
    return <div className="p-6"><MessagesList items={items} /></div>;
}


