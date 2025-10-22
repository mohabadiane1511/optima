import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';

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

// POST /api/tenant/purchases/invoices/from-receipt/[id]
// Body: { number?: string, invoiceDate?: string, dueDate?: string, note?: string }
// Règles: receipt.status === 'received'; une facture par PO; PDF non requis à la création (requis à la validation)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const db = prisma as any;

    const receipt = await db.goodsReceipt.findFirst({ where: { id: params.id, tenantId }, include: { purchaseOrder: { include: { lines: true } } } });
    if (!receipt) return NextResponse.json({ error: 'Réception introuvable' }, { status: 404 });
    if (receipt.status !== 'received') return NextResponse.json({ error: 'La réception doit être complète' }, { status: 400 });

    const po = receipt.purchaseOrder;
    if (!po) return NextResponse.json({ error: 'Commande liée introuvable' }, { status: 404 });

    // Vérifier aucune facture existante pour ce PO
    const existing = await db.supplierInvoice.findFirst({ where: { tenantId, purchaseOrderId: po.id } });
    if (existing) return NextResponse.json({ error: 'Une facture existe déjà pour cette commande' }, { status: 409 });

    const body = await (async () => { try { return await request.json(); } catch { return {}; } })() as any;
    const number = (body?.number || '').trim() || null;
    const invoiceDate = body?.invoiceDate ? new Date(body.invoiceDate) : new Date();
    const dueDate = body?.dueDate ? new Date(body.dueDate) : null;
    const note = (body?.note || '').trim() || null;

    // Calculer totaux depuis PO (réception complète)
    let totalHT = 0; let totalTVA = 0; let totalTTC = 0;
    for (const l of po.lines) {
      totalHT += Number(l.totalHT || 0);
      totalTVA += Number(l.totalTVA || 0);
      totalTTC += Number(l.totalTTC || 0);
    }

    const created = await db.$transaction(async (txRaw: any) => {
      const tx = txRaw as any;
      const invoice = await tx.supplierInvoice.create({
        data: {
          tenantId,
          purchaseOrderId: po.id,
          goodsReceiptId: receipt.id,
          supplier: po.supplier || null,
          number,
          status: 'draft',
          invoiceDate,
          dueDate,
          totalHT,
          totalTVA,
          totalTTC,
          note,
          lines: {
            create: (po.lines || []).map((l: any) => ({
              tenantId,
              purchaseOrderLineId: l.id,
              name: l.name,
              qty: l.qty,
              unit: l.unit,
              unitPrice: l.unitPrice,
              taxRate: l.taxRate,
              totalHT: l.totalHT,
              totalTVA: l.totalTVA,
              totalTTC: l.totalTTC,
            }))
          }
        },
        select: { id: true }
      });
      return invoice;
    });

    await logAuditEvent({ tenantId, action: 'Facture fournisseur créée (depuis réception complète)', entity: 'supplier_invoice', entityId: created.id, metadata: { receiptId: receipt.id, poId: po.id, totalTTC } }, request);
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    console.error('POST /api/tenant/purchases/invoices/from-receipt/[id]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


