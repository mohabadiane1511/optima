import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';


async function resolveTenantId(request: NextRequest): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) { try { const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as any; if (p?.tenantId) return p.tenantId; } catch {} }
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || undefined;
  if (!tenantSlug) return null;
  const t = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  return t?.id || null;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const { amount, method, reference, paidAt } = await request.json();
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });

    const invoice = await prisma.invoice.findFirst({ where: { id: params.id, tenantId } });
    if (!invoice) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    if (invoice.status === 'cancelled') return NextResponse.json({ error: 'Facture annulée' }, { status: 400 });

    await prisma.payment.create({ data: { tenantId, invoiceId: invoice.id, amount, method: method || 'cash', reference: reference || null, paidAt: paidAt ? new Date(paidAt) : new Date() } });

    // recompute paid & status
    const paidAgg = await prisma.payment.aggregate({ where: { tenantId, invoiceId: invoice.id }, _sum: { amount: true } });
    const paid = Number(paidAgg._sum.amount || 0);
    const total = Number(invoice.totalTTC || 0);
    const newStatus = paid >= total ? 'paid' : (invoice.status === 'draft' ? 'draft' : 'sent');
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: newStatus } });

    return NextResponse.json({ ok: true, paid });
  } catch (e) {
    console.error('POST /api/tenant/invoices/[id]/payments', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


