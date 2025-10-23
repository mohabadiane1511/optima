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
  try {
    if (raw) {
      const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as { tenantId?: string; userId?: string };
      tenantId = p?.tenantId || null;
      userId = p?.userId || null;
    }
  } catch {}
  if (!tenantId) {
    let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
    if (!tenantSlug && process.env.NODE_ENV !== 'production') tenantSlug = request.headers.get('x-tenant-slug') || (process.env.DEFAULT_TENANT_SLUG as any) || null;
    if (tenantSlug) {
      const t = await db.tenant.findUnique({ where: { slug: tenantSlug } });
      tenantId = t?.id || null;
    }
  }
  let role: string | null = null;
  if (tenantId && userId) {
    const m = await db.membership.findFirst({ where: { tenantId, userId }, select: { role: true } });
    role = m?.role || null;
  }
  return { tenantId, userId, role };
}

// PATCH /api/tenant/members/[id]  body: { role?: 'viewer'|'manager'|'admin' }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { tenantId, userId: actorId, role: actorRole } = await resolveTenantAndActor(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    if (!actorRole || (actorRole !== 'owner' && actorRole !== 'admin')) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const body = await request.json();
    const role = body?.role ? String(body.role).trim() : undefined;
    if (role && role !== 'viewer' && role !== 'admin' && role !== 'owner') return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });

    const before = await db.membership.findFirst({ where: { id: params.id, tenantId } });
    if (!before) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

    const updated = await db.membership.update({ where: { id: before.id }, data: { ...(role ? { role } : {}) } });
    await logAuditEvent({ tenantId, action: 'member.updated', entity: 'membership', entityId: before.id, actorId: actorId || undefined, before, after: updated }, request);
    return NextResponse.json({ id: updated.id, role: updated.role });
  } catch (e) {
    console.error('PATCH /api/tenant/members/[id] error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/tenant/members/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { tenantId, userId: actorId, role: actorRole } = await resolveTenantAndActor(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    if (!actorRole || (actorRole !== 'owner' && actorRole !== 'admin')) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const membership = await db.membership.findFirst({ where: { id: params.id, tenantId } });
    if (!membership) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

    // Interdire suppression si actif
    if (membership.active) return NextResponse.json({ error: 'Désactivez le membre avant suppression' }, { status: 400 });

    // Empêcher suppression du dernier owner
    if (membership.role === 'owner') {
      const owners = await db.membership.count({ where: { tenantId, role: 'owner' } });
      if (owners <= 1) return NextResponse.json({ error: 'Impossible de supprimer le dernier owner' }, { status: 400 });
    }

    await db.membership.delete({ where: { id: membership.id } });
    await logAuditEvent({ tenantId, action: 'member.deleted', entity: 'membership', entityId: membership.id, actorId: actorId || undefined, before: membership }, request);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/tenant/members/[id] error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


