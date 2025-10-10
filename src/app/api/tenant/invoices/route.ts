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
    tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || null;
  }
  if (!tenantSlug) return null;
  const db = prisma as any;
  const t = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  return t?.id || null;
}

// GET list with pagination
export async function GET(request: NextRequest) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 10)));
    const skip = (page - 1) * limit;

    // optional status filter (?status=paid or ?status=paid,overdue)
    const statusParam = searchParams.get('status');
    const statuses = statusParam ? statusParam.split(',').map(s => s.trim()).filter(Boolean) : [];

    const db = prisma as any;
    const where: any = { tenantId };
    if (statuses.length) where.status = { in: statuses };

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: { id: true, number: true, status: true, issueDate: true, dueDate: true, totalTTC: true, customer: { select: { name: true } } }
      }),
      db.invoice.count({ where })
    ]);

    const ids = (invoices as any[]).map((i: any) => i.id);
    const payments = ids.length ? await db.payment.findMany({ where: { tenantId, invoiceId: { in: ids } }, select: { invoiceId: true, amount: true } }) : [];
    const paidMap = new Map<string, number>();
    for (const p of payments as any[]) {
      paidMap.set(p.invoiceId, (paidMap.get(p.invoiceId) || 0) + Number(p.amount));
    }

    const totalPages = Math.ceil(total / limit);
    const items = (invoices as any[]).map((i: any) => {
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
    });

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
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
    if (!customer?.name && !customer?.id) {
      return NextResponse.json({ error: 'Client requis' }, { status: 400 });
    }
    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'Au moins une ligne requise' }, { status: 400 });
    }

    const db = prisma as any;
    // Résoudre le client sans créer de doublons
    let customerId: string | null = null;
    if (customer?.id) {
      const found = await db.customer.findFirst({ where: { id: customer.id, tenantId } });
      if (found) customerId = found.id;
    }
    if (!customerId) {
      const byIdentity = await db.customer.findFirst({
        where: {
          tenantId,
          OR: [
            customer?.email ? { email: customer.email } : undefined,
            customer?.name ? { name: customer.name } : undefined,
          ].filter(Boolean) as any,
        },
      });
      if (byIdentity) customerId = byIdentity.id;
    }
    if (!customerId) {
      const created = await db.customer.create({
        data: {
          tenantId,
          name: customer?.name || 'Client',
          email: customer?.email || null,
          phone: customer?.phone || null,
          address: customer?.address || null,
        },
      });
      customerId = created.id;
    }

    // compute totals
    const computed = (lines as any[]).map((l: any) => {
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

    const inv = await db.invoice.create({
      data: {
        tenantId,
        customerId: customerId!,
        status: 'draft',
        dueDate: dueDate ? new Date(dueDate) : null,
        totalHT, totalTVA, totalTTC,
        lines: {
          create: computed.map((l: any) => ({
            tenantId,
            productId: l.productId || null,
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


