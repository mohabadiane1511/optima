import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';

async function resolveTenantId(request: NextRequest): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) {
    try { const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as any; if (p?.tenantId) return p.tenantId; } catch {}
  }
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || null;
  if (!tenantSlug) return null;
  const db = prisma as any;
  const t = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  return t?.id || null;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const db = prisma as any;
    const rfq = await db.rfq.findFirst({
      where: { id: params.id, tenantId },
      include: { lines: true, offers: true, purchaseOrders: true },
    });
    if (!rfq) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    return NextResponse.json(rfq);
  } catch (e) {
    console.error('GET /api/tenant/purchases/rfqs/[id] error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Mise à jour légère (note, suppliers)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const body = await request.json();
    const data: any = {};
    if (typeof body?.note === 'string') data.note = body.note;
    if (Array.isArray(body?.suppliers)) data.suppliers = body.suppliers.filter((s: any) => typeof s === 'string' && s.trim());
    if (!Object.keys(data).length) return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });

    const db = prisma as any;
    const before = await db.rfq.findFirst({ where: { id: params.id, tenantId }, select: { id: true, note: true, suppliers: true } });
    if (!before) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

    const updated = await db.rfq.update({ where: { id: params.id }, data, select: { id: true, note: true, suppliers: true } });
    await logAuditEvent({ tenantId, action: 'rfq.updated', entity: 'rfq', entityId: params.id, before, after: updated }, request);
    return NextResponse.json(updated);
  } catch (e) {
    console.error('PATCH /api/tenant/purchases/rfqs/[id] error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


