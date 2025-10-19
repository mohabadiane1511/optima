import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

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
    const rfq = await db.rfq.findFirst({ where: { id: params.id, tenantId }, include: { lines: true } });
    if (!rfq) return NextResponse.json({ error: 'RFQ introuvable' }, { status: 404 });

    const suppliers = rfq.suppliers?.length ? rfq.suppliers : ['Fournisseur A', 'Fournisseur B'];
    const offers = [] as any[];
    for (const line of rfq.lines) {
      for (const s of suppliers) {
        const price = Math.max(1, Number(line.estimatedPrice || 0) * (0.8 + Math.random() * 0.6));
        const lead = Math.floor(3 + Math.random() * 14);
        offers.push({ lineId: line.id, supplier: s, price: Number(price.toFixed(2)), lead, notes: null });
      }
    }
    return NextResponse.json({ offers });
  } catch (e) {
    console.error('POST /api/tenant/purchases/rfqs/[id]/offers/simulate error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


