import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

async function resolveTenantId(request: NextRequest): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) {
    try { const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as any; if (p?.tenantId) return p.tenantId; } catch {}
  }
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') {
    tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || undefined;
  }
  if (!tenantSlug) return null;
  const t = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  return t?.id || null;
}

// GET list (latest 50) with balance
export async function GET(request: NextRequest) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });

    const invoices = await prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, number: true, status: true, issueDate: true, dueDate: true, totalTTC: true, customer: { select: { name: true } } }
    });

    const ids = invoices.map(i => i.id);
    const payments = ids.length ? await prisma.payment.findMany({ where: { tenantId, invoiceId: { in: ids } }, select: { invoiceId: true, amount: true } }) : [];
    const paidMap = new Map<string, number>();
    for (const p of payments) {
      paidMap.set(p.invoiceId, (paidMap.get(p.invoiceId) || 0) + Number(p.amount));
    }

    return NextResponse.json(invoices.map(i => {
      const total = Number(i.totalTTC || 0);
      const paid = paidMap.get(i.id) || 0;
      return {
        id: i.id,
        number: i.number || '(brouillon)',
        status: i.status,
        issueDate: i.issueDate,
        dueDate: i.dueDate,
        total,
        balance: Math.max(0, total - paid),
        customer: i.customer?.name || '—',
      };
    }));
  } catch (e) {
    console.error('GET /api/tenant/invoices error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST create draft invoice
export async function POST(request: NextRequest) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const body = await request.json();
    const { customer, dueDate, lines } = body || {};
    if (!customer?.name || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'Client et au moins une ligne requis' }, { status: 400 });
    }

    // upsert minimal customer by name/email
    const customerRec = await prisma.customer.create({
      data: { tenantId, name: customer.name, email: customer.email || null, phone: customer.phone || null, address: customer.address || null }
    });

    // compute totals
    const computed = lines.map((l: any) => {
      const qty = Number(l.qty || 0);
      const unitPrice = Number(l.price || 0);
      const rate = Number(l.tva || 0);
      const totalHT = qty * unitPrice;
      const totalTVA = totalHT * (rate / 100);
      const totalTTC = totalHT + totalTVA;
      return { ...l, qty, unitPrice, rate, totalHT, totalTVA, totalTTC };
    });
    const totalHT = computed.reduce((s: number, l: any) => s + l.totalHT, 0);
    const totalTVA = computed.reduce((s: number, l: any) => s + l.totalTVA, 0);
    const totalTTC = totalHT + totalTVA;

    const inv = await prisma.invoice.create({
      data: {
        tenantId,
        customerId: customerRec.id,
        status: 'draft',
        dueDate: dueDate ? new Date(dueDate) : null,
        totalHT, totalTVA, totalTTC,
        lines: {
          create: computed.map((l: any) => ({
            tenantId,
            name: l.name || 'Article',
            sku: l.sku || null,
            qty: l.qty,
            unit: l.unit || 'unité',
            unitPrice: l.unitPrice,
            tvaRate: l.rate,
            totalHT: l.totalHT,
            totalTVA: l.totalTVA,
            totalTTC: l.totalTTC,
          }))
        }
      },
      select: { id: true }
    });

    return NextResponse.json({ id: inv.id }, { status: 201 });
  } catch (e) {
    console.error('POST /api/tenant/invoices error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


