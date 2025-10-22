import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

async function resolveTenantId(request: NextRequest): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) { try { const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as any; if (p?.tenantId) return p.tenantId; } catch {}
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

    const gr = await db.goodsReceipt.findFirst({ where: { id: params.id, tenantId }, include: { purchaseOrder: { include: { lines: true } } } });
    if (!gr) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

    const entries = await db.goodsReceiptEntry.findMany({ where: { tenantId, goodsReceiptId: gr.id }, orderBy: { createdAt: 'asc' } });
    const entryIds = entries.map((e: any) => e.id);
    const entryLines = entryIds.length ? await db.goodsReceiptEntryLine.findMany({ where: { tenantId, entryId: { in: entryIds } } }) : [];

    // Grouper les entryLines par entry
    const linesByEntry: Record<string, any[]> = {};
    for (const l of entryLines) {
      if (!linesByEntry[l.entryId]) linesByEntry[l.entryId] = [];
      linesByEntry[l.entryId].push(l);
    }

    // Calculer cumuls par ligne de PO
    const sumByLine: Record<string, number> = {};
    for (const l of entryLines) {
      sumByLine[l.purchaseOrderLineId] = (sumByLine[l.purchaseOrderLineId] || 0) + Number(l.qtyReceived || 0);
    }

    const poLines = (gr.purchaseOrder?.lines || []).map((l: any) => ({
      id: l.id,
      name: l.name,
      ordered: Number(l.qty || 0),
      received: Number(sumByLine[l.id] || 0),
      remaining: Math.max(0, Number(l.qty || 0) - Number(sumByLine[l.id] || 0))
    }));

    // Chercher une facture fournisseur liée à la commande (une par PO)
    const invoice = await db.supplierInvoice.findFirst({ where: { tenantId, purchaseOrderId: gr.purchaseOrderId }, select: { id: true, status: true } });

    return NextResponse.json({
      id: gr.id,
      status: gr.status,
      note: gr.note,
      createdAt: gr.createdAt,
      purchaseOrder: { id: gr.purchaseOrderId, supplier: gr.purchaseOrder?.supplier || null },
      lines: poLines,
      invoice: invoice ? { id: invoice.id, status: invoice.status } : null,
      history: entries.map((e: any) => ({
        id: e.id,
        createdAt: e.createdAt,
        note: e.note || null,
        lines: (linesByEntry[e.id] || []).map((l: any) => ({ poLineId: l.purchaseOrderLineId, qty: Number(l.qtyReceived || 0) }))
      }))
    });
  } catch (e) {
    console.error('GET /api/tenant/purchases/receipts/[id]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


