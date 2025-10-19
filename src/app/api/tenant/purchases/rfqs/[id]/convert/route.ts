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
    const action = 'rfq.convert';
    if (idemKey) {
      const existing = await db.idempotencyKey.findFirst({ where: { tenantId, key: idemKey, action } });
      if (existing?.response) {
        return new NextResponse(JSON.stringify(existing.response), { status: 200, headers: { 'content-type': 'application/json', 'x-idempotent': 'true' } });
      }
    }

    const body = await request.json();
    const selected = body?.selected || {} as Record<string, { price: number; lead: number; supplier: string }>;

    const rfq = await db.rfq.findFirst({ where: { id: params.id, tenantId }, include: { lines: true } });
    if (!rfq) return NextResponse.json({ error: 'RFQ introuvable' }, { status: 404 });
    if (rfq.status === 'closed') return NextResponse.json({ error: 'RFQ déjà clôturée' }, { status: 400 });
    if (!rfq.lines.length) return NextResponse.json({ error: 'Aucune ligne RFQ' }, { status: 400 });

    // Calculer totaux et créer PO + lignes
    const { pos, rfqClosed } = await db.$transaction(async (txRaw: any) => {
      const tx = txRaw as any;

      // Grouper les lignes par fournisseur retenu
      const bySupplier: Record<string, any[]> = {};
      for (const l of rfq.lines) {
        const sel = selected[l.id];
        if (!sel?.supplier) continue;
        const supplierKey = String(sel.supplier);
        const unitPrice = Number(sel?.price || l.estimatedPrice || 0);
        const taxRate = Number(l.taxRate || 0);
        const qty = Number(l.quantity || 0);
        const totalHT = qty * unitPrice;
        const totalTVA = totalHT * (taxRate / 100);
        const totalTTC = totalHT + totalTVA;
        const line = { name: l.item, qty, unit: 'unité', unitPrice, taxRate, totalHT, totalTVA, totalTTC };
        bySupplier[supplierKey] = bySupplier[supplierKey] ? [...bySupplier[supplierKey], line] : [line];
      }

      const createdPoIds: string[] = [];
      for (const [supplierKey, lines] of Object.entries(bySupplier)) {
        const totals = (lines as any[]).reduce((acc: any, it: any) => {
          acc.totalHT += it.totalHT; acc.totalTVA += it.totalTVA; acc.totalTTC += it.totalTTC; return acc;
        }, { totalHT: 0, totalTVA: 0, totalTTC: 0 });
        const created = await tx.purchaseOrder.create({
          data: {
            tenantId,
            rfqId: rfq.id,
            supplier: supplierKey,
            status: 'created',
            totalHT: totals.totalHT,
            totalTVA: totals.totalTVA,
            totalTTC: totals.totalTTC,
            lines: {
              create: (lines as any[]).map((it: any) => ({
                tenantId,
                name: it.name,
                qty: it.qty,
                unit: it.unit,
                unitPrice: it.unitPrice,
                taxRate: it.taxRate,
                totalHT: it.totalHT,
                totalTVA: it.totalTVA,
                totalTTC: it.totalTTC,
              }))
            }
          },
          select: { id: true }
        });
        createdPoIds.push(created.id);
      }

      const closed = await tx.rfq.update({ where: { id: rfq.id }, data: { status: 'closed' }, select: { id: true, status: true } });
      return { pos: createdPoIds, rfqClosed: closed };
    });

    for (const id of pos) {
      await logAuditEvent({ tenantId, action: 'po.created', entity: 'po', entityId: id, metadata: { rfqId: rfqClosed.id } }, request);
    }
    await logAuditEvent({ tenantId, action: 'rfq.converted', entity: 'rfq', entityId: rfqClosed.id, after: rfqClosed, metadata: { pos } }, request);

    const response = { poIds: pos, rfqStatus: rfqClosed.status };
    if (idemKey) {
      await db.idempotencyKey.create({ data: { tenantId, key: idemKey, action, entity: 'rfq', entityId: rfqClosed.id, response } });
    }

    return NextResponse.json(response, { status: 201 });
  } catch (e) {
    console.error('POST /api/tenant/purchases/rfqs/[id]/convert error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


