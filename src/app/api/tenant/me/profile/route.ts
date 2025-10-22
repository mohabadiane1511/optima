import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';

type SessionPayload = { userId?: string; tenantId?: string };

async function resolveTenantAndUser(request: NextRequest): Promise<{ tenantId: string | null; userId: string | null }> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  let tenantId: string | null = null;
  let userId: string | null = null;
  if (raw) {
    try {
      const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as SessionPayload;
      tenantId = p?.tenantId || null;
      userId = p?.userId || null;
    } catch {}
  }
  if (!tenantId) {
    let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
    if (!tenantSlug && process.env.NODE_ENV !== 'production') tenantSlug = (request.headers.get('x-tenant-slug') as any) || (process.env.DEFAULT_TENANT_SLUG as any) || null;
    if (tenantSlug) {
      const t = await (prisma as any).tenant.findUnique({ where: { slug: tenantSlug } });
      tenantId = t?.id || null;
    }
  }
  return { tenantId, userId };
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await resolveTenantAndUser(request);
    if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const db = prisma as any;
    const u = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    if (!u) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    // Découper name en first/last naive (si besoin, stocker séparément plus tard)
    let firstName = '';
    let lastName = '';
    if (u.name) {
      const parts = u.name.split(' ').filter(Boolean);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ');
    }
    return NextResponse.json({ firstName, lastName, email: u.email || '' });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT body: { firstName?: string, lastName?: string }
export async function PUT(request: NextRequest) {
  try {
    const { tenantId, userId } = await resolveTenantAndUser(request);
    if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const body = await (async () => { try { return await request.json(); } catch { return {}; } })() as any;
    const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : undefined;
    const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : undefined;
    if (firstName === undefined && lastName === undefined) return NextResponse.json({ error: 'Aucun champ fourni' }, { status: 400 });

    const db = prisma as any;
    const before = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (!before) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

    const newName = (() => {
      const names = (before.name || '').trim().split(' ').filter(Boolean);
      let f = firstName !== undefined ? firstName : (names[0] || '');
      let l = lastName !== undefined ? lastName : names.slice(1).join(' ');
      return [f, l].filter(Boolean).join(' ').trim();
    })();

    const updated = await db.user.update({ where: { id: userId }, data: { name: newName } });

    await logAuditEvent({ tenantId: tenantId || 'unknown', action: 'user.profile.updated', entity: 'user', entityId: userId, before, after: { name: updated.name } }, request);

    return NextResponse.json({ ok: true, name: updated.name });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


