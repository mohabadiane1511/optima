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

    const po = await db.purchaseOrder.findFirst({ where: { id: params.id, tenantId }, select: { id: true, status: true } });
    if (!po) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    if (po.status !== 'created') return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });

    const result = await db.$transaction(async (txRaw: any) => {
      const tx = txRaw as any;
      const updated = await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: 'confirmed' }, select: { id: true, status: true } });
      // Auto-création de la réception si inexistante (statut initial not_received)
      const existingGr = await tx.goodsReceipt.findFirst({ where: { tenantId, purchaseOrderId: updated.id } });
      if (!existingGr) {
        await tx.goodsReceipt.create({ data: { tenantId, purchaseOrderId: updated.id, status: 'not_received', note: null } });
      }
      return updated;
    });
    await logAuditEvent({ tenantId, action: 'Commande d\'achat confirmée', entity: 'po', entityId: result.id, metadata: { autoGoodsReceipt: true } }, request);
    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/tenant/purchases/orders/[id]/confirm', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


