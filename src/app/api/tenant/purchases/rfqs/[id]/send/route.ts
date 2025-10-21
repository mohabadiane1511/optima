import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';

async function resolveTenantId(request: NextRequest): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) { try { const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as any; if (p?.tenantId) return p.tenantId; } catch {} }
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || null;
  if (!tenantSlug) return null;
  const db = prisma as any;
  const t = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  return t?.id || null;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const db = prisma as any;

    // Idempotence
    const idemKey = request.headers.get('x-idempotency-key');
    const action = 'rfq.send';
    if (idemKey) {
      const existing = await db.idempotencyKey.findFirst({ where: { tenantId, key: idemKey, action } });
      if (existing?.response) {
        return new NextResponse(JSON.stringify(existing.response), { status: 200, headers: { 'content-type': 'application/json', 'x-idempotent': 'true' } });
      }
    }

    const rfq = await db.rfq.findFirst({ where: { id: params.id, tenantId }, select: { id: true, status: true } });
    if (!rfq) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    if (rfq.status !== 'draft') return NextResponse.json({ error: 'Déjà envoyée ou clôturée' }, { status: 400 });

    const updated = await db.rfq.update({ where: { id: rfq.id }, data: { status: 'sent' }, select: { id: true, status: true } });
    await logAuditEvent({ tenantId, action: 'Demande de prix envoyée', entity: 'rfq', entityId: rfq.id }, request);

    const response = { id: rfq.id, status: updated.status };
    if (idemKey) {
      await db.idempotencyKey.create({ data: { tenantId, key: idemKey, action, entity: 'rfq', entityId: rfq.id, response } });
    }

    return NextResponse.json(response);
  } catch (e) {
    console.error('POST /api/tenant/purchases/rfqs/[id]/send error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


