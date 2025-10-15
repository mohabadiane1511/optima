import { NextResponse } from 'next/server';
import { clearTenantSessionCookie } from '@/lib/tenant/cookies';
import { logAuditEvent } from '@/lib/audit';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Extraire contexte pour audit (si possible)
    const jar = await cookies();
    const raw = jar.get('tenant_session')?.value;
    let tenantId: string | null = null;
    let userId: string | null = null;
    if (raw) {
      try {
        const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as any;
        tenantId = p?.tenantId || null;
        userId = p?.userId || null;
      } catch {}
    }

    await clearTenantSessionCookie();
    if (tenantId) {
      try {
        const db = prisma as any;
        const user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;
        await logAuditEvent({ tenantId, action: 'auth.logout', entity: 'user', entityId: userId || undefined, actorId: userId || undefined, actorName: user?.name || null, actorEmail: user?.email || null }, request as any);
      } catch {}
    }
    // Réponse non mise en cache pour éviter tout effet de cache
    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return new NextResponse(JSON.stringify({ ok: false }), { status: 500 });
  }
}


