import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { computePlanBilling } from '@/lib/billing';

const db = prisma as any;

function requireSA(request: NextRequest) {
  const token = request.cookies.get('sa_session')?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== 'superadmin') {
    return { ok: false as const, res: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }
  return { ok: true as const };
}

// GET /api/admin/billing/invoices?tenantId=&status=&limit=
export async function GET(request: NextRequest) {
  const auth = requireSA(request);
  if (!auth.ok) return auth.res;
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = Number(searchParams.get('limit') || 20);

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;

    const invoices = await db.billingInvoice.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      take: Math.min(limit, 100),
    });
    return NextResponse.json(invoices);
  } catch (e) {
    console.error('GET invoices error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/admin/billing/invoices  { tenantId, period, frequency }
export async function POST(request: NextRequest) {
  const auth = requireSA(request);
  if (!auth.ok) return auth.res;
  try {
    const body = await request.json();
    const { tenantId, period, frequency } = body as { tenantId: string; period: string; frequency: 'monthly' | 'annual' };
    if (!tenantId || !period || !frequency) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }

    // Calculer les montants et snapshots
    const preview = await computePlanBilling({ tenantId, period, frequency });

    // dueAt basé sur dueDays du tenant (fallback 15)
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    const dueDays = Number(tenant?.dueDays ?? 15);
    const issuedAt = new Date();
    const dueAt = new Date(issuedAt);
    dueAt.setDate(dueAt.getDate() + dueDays);

    // Idempotence par (tenantId, period)
    const invoice = await db.billingInvoice.upsert({
      where: { tenantId_period: { tenantId, period } },
      update: {
        frequency,
        planCode: preview.plan.code,
        planName: preview.plan.name,
        includedUsers: preview.numbers.includedUsers,
        activeUsers: preview.numbers.activeUsers,
        extrasCount: preview.numbers.extrasCount,
        baseAmount: preview.amounts.base,
        extrasAmount: preview.amounts.extras,
        totalAmount: preview.amounts.total,
        currency: 'FCFA',
        status: 'issued',
        issuedAt,
        dueAt,
      },
      create: {
        tenantId,
        period,
        frequency,
        planCode: preview.plan.code,
        planName: preview.plan.name,
        includedUsers: preview.numbers.includedUsers,
        activeUsers: preview.numbers.activeUsers,
        extrasCount: preview.numbers.extrasCount,
        baseAmount: preview.amounts.base,
        extrasAmount: preview.amounts.extras,
        totalAmount: preview.amounts.total,
        currency: 'FCFA',
        status: 'issued',
        issuedAt,
        dueAt,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (e) {
    console.error('POST invoices error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


