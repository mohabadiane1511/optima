import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';

const db = prisma as any;

async function resolveTenantAndActor(request: NextRequest): Promise<{ tenantId: string | null; userId: string | null; role: string | null }> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  let tenantId: string | null = null;
  let userId: string | null = null;
  try { if (raw) { const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as { tenantId?: string; userId?: string }; tenantId = p?.tenantId || null; userId = p?.userId || null; } } catch {}
  if (!tenantId) { let { tenantSlug } = resolveTenantFromHost(request.headers.get('host')); if (!tenantSlug && process.env.NODE_ENV !== 'production') tenantSlug = request.headers.get('x-tenant-slug') || (process.env.DEFAULT_TENANT_SLUG as any) || null; if (tenantSlug) { const t = await db.tenant.findUnique({ where: { slug: tenantSlug } }); tenantId = t?.id || null; } }
  let role: string | null = null; if (tenantId && userId) { const m = await db.membership.findFirst({ where: { tenantId, userId }, select: { role: true } }); role = m?.role || null; }
  return { tenantId, userId, role };
}

// PATCH /api/tenant/members/[id]/status  body: { active: boolean }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { tenantId, userId: actorId, role: actorRole } = await resolveTenantAndActor(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    if (!actorRole || (actorRole !== 'owner' && actorRole !== 'admin')) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const body = await request.json();
    const active = Boolean(body?.active);
    const before = await db.membership.findFirst({ where: { id: params.id, tenantId } });
    if (!before) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

    const updated = await db.membership.update({ where: { id: before.id }, data: { active } });
    await logAuditEvent({ tenantId, action: active ? 'member.activated' : 'member.deactivated', entity: 'membership', entityId: before.id, actorId: actorId || undefined, before, after: updated }, request);
    return NextResponse.json({ id: updated.id, active: updated.active });
  } catch (e) {
    console.error('PATCH /api/tenant/members/[id]/status error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


