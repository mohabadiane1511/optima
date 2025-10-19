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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json([]);
    const db = prisma as any;
    const offers = await db.rfqOffer.findMany({ where: { tenantId, rfqId: params.id } });
    return NextResponse.json(offers);
  } catch (e) {
    console.error('GET /api/tenant/purchases/rfqs/[id]/offers error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const body = await request.json();
    const offers = Array.isArray(body?.offers) ? body.offers : [];
    if (offers.length === 0) return NextResponse.json({ error: 'Aucune offre' }, { status: 400 });

    const normalized = offers.map((o: any) => ({
      lineId: String(o?.lineId || ''),
      supplier: String(o?.supplier || ''),
      price: Number(o?.price || 0),
      lead: Number(o?.lead || 0),
      notes: o?.notes ? String(o.notes) : null,
    })).filter((o: any) => o.lineId && o.supplier && o.price > 0);

    if (!normalized.length) return NextResponse.json({ error: 'Offres invalides' }, { status: 400 });

    const db = prisma as any;
    const rfq = await db.rfq.findFirst({ where: { id: params.id, tenantId }, select: { id: true } });
    if (!rfq) return NextResponse.json({ error: 'RFQ introuvable' }, { status: 404 });
    // N'autoriser la saisie que si RFQ envoyée
    const rfqStatus = await db.rfq.findFirst({ where: { id: params.id, tenantId }, select: { status: true } });
    if (!rfqStatus || rfqStatus.status !== 'sent') {
      return NextResponse.json({ error: 'RFQ non envoyée' }, { status: 400 });
    }

    // Valider que les lignes appartiennent à la RFQ
    const lineIds = normalized.map((o: any) => o.lineId);
    const lines = await db.rfqLine.findMany({ where: { tenantId, rfqId: params.id, id: { in: lineIds } }, select: { id: true } });
    const allowed = new Set(lines.map((l: any) => l.id));
    const toCreate = normalized.filter((o: any) => allowed.has(o.lineId));
    if (!toCreate.length) return NextResponse.json({ error: 'Aucune ligne valide' }, { status: 400 });

    const created = await db.rfqOffer.createMany({
      data: toCreate.map((o: any) => ({ tenantId, rfqId: params.id, lineId: o.lineId, supplier: o.supplier, price: o.price, lead: o.lead, notes: o.notes })),
    });

    await logAuditEvent({ tenantId, action: 'offer.added', entity: 'rfq', entityId: params.id, metadata: { count: created.count } }, request);

    return NextResponse.json({ added: created.count }, { status: 201 });
  } catch (e) {
    console.error('POST /api/tenant/purchases/rfqs/[id]/offers error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


