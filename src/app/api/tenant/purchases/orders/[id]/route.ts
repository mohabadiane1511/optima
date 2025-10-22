import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

export const revalidate = 0;

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
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const db = prisma as any;
    const po = await db.purchaseOrder.findFirst({ where: { id: params.id, tenantId }, include: { lines: true, rfq: true, goodsReceipt: true } });
    if (!po) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    // Inclure infos tenant (nom, logo)
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true, logoUrl: true } });
    // Calcul rapide des quantités reçues cumulées si réception existe
    let receipt: any = null;
    if (po.goodsReceipt) {
      const gr = await db.goodsReceipt.findFirst({ where: { id: po.goodsReceipt.id, tenantId }, select: { id: true, status: true, createdAt: true } });
      const entries = await db.goodsReceiptEntry.findMany({ where: { tenantId, goodsReceiptId: po.goodsReceipt.id }, select: { id: true } });
      const entryIds = entries.map((e: any) => e.id);
      let receivedByLine: Record<string, number> = {};
      if (entryIds.length) {
        const lines = await db.goodsReceiptEntryLine.findMany({ where: { tenantId, entryId: { in: entryIds } }, select: { purchaseOrderLineId: true, qtyReceived: true } });
        for (const l of lines) {
          const key = l.purchaseOrderLineId;
          receivedByLine[key] = (receivedByLine[key] || 0) + Number(l.qtyReceived || 0);
        }
      }
      receipt = { id: gr?.id, status: gr?.status, receivedByLine };
    }
    return NextResponse.json({ ...po, tenant, receipt });
  } catch (e) {
    console.error('GET /api/tenant/purchases/orders/[id] error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


