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

// POST /api/tenant/purchases/invoices/[id]/payments
// Body: { amount: number, method: string, reference?: string, paidAt?: string }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const db = prisma as any;

    const inv = await db.supplierInvoice.findFirst({ where: { id: params.id, tenantId } });
    if (!inv) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    if (inv.status === 'cancelled') return NextResponse.json({ error: 'Facture annulée' }, { status: 400 });

    const body = await request.json();
    const amount = Number(body?.amount || 0);
    const method = String(body?.method || '').trim();
    let reference = (body?.reference || '').trim() || null;
    const paidAt = body?.paidAt ? new Date(body.paidAt) : new Date();
    if (!(amount > 0) || !method) return NextResponse.json({ error: 'Montant et méthode requis' }, { status: 400 });

    // Générer une référence unique si absente: REF-YYYY-XXXXX
    async function generateUniqueRef() {
      const year = new Date().getFullYear();
      for (let i = 0; i < 5; i++) {
        const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
        const ref = `REF-${year}-${rand}`;
        const exists = await db.supplierPayment.findFirst({ where: { tenantId, reference: ref } });
        if (!exists) return ref;
      }
      return `REF-${year}-${Date.now().toString(36).toUpperCase()}`;
    }
    if (!reference) reference = await generateUniqueRef();

    const result = await db.$transaction(async (txRaw: any) => {
      const tx = txRaw as any;
      const p = await tx.supplierPayment.create({ data: { tenantId, invoiceId: inv.id, amount, method, reference, paidAt } });
      // Recalcul solde
      const paidSumRow = await tx.supplierPayment.aggregate({ _sum: { amount: true }, where: { tenantId, invoiceId: inv.id } });
      const paidSum = Number(paidSumRow?._sum?.amount || 0);
      let nextStatus = inv.status;
      if (inv.status !== 'cancelled' && inv.status !== 'draft') {
        nextStatus = paidSum >= Number(inv.totalTTC || 0) ? 'paid' : (inv.status === 'draft' ? 'draft' : 'posted');
      }
      if (nextStatus !== inv.status) {
        await tx.supplierInvoice.update({ where: { id: inv.id }, data: { status: nextStatus } });
      }
      return { paymentId: p.id, status: nextStatus, paidSum };
    });

    await logAuditEvent({ tenantId, action: 'Paiement facture fournisseur enregistré', entity: 'supplier_invoice', entityId: inv.id, metadata: { amount, method, reference } }, request);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error('POST /api/tenant/purchases/invoices/[id]/payments', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


