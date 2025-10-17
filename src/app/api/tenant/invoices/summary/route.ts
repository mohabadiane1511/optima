import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { Prisma } from '@prisma/client';

const db = prisma as any;

async function resolveTenantId(request: NextRequest): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) {
    try {
      const payload = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as { tenantId?: string };
      if (payload?.tenantId) return payload.tenantId;
    } catch {}
  }
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') {
    tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || null;
  }
  if (!tenantSlug) return null;
  const t = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  return t?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const granularity = (searchParams.get('granularity') || 'monthly') as 'daily' | 'weekly' | 'monthly' | 'yearly';
    const window = Number(searchParams.get('window') || (granularity === 'daily' ? 7 : granularity === 'weekly' ? 12 : 12));

    const unit = granularity === 'daily' ? 'day'
      : granularity === 'weekly' ? 'week'
      : granularity === 'yearly' ? 'year'
      : 'month';

    // From date for the window
    const fromDate = new Date();
    if (unit === 'day') { fromDate.setDate(fromDate.getDate() - (window - 1)); fromDate.setHours(0,0,0,0); }
    else if (unit === 'week') { fromDate.setDate(fromDate.getDate() - 7*(window-1)); fromDate.setHours(0,0,0,0); }
    else if (unit === 'month') { fromDate.setMonth(fromDate.getMonth() - (window - 1)); fromDate.setDate(1); fromDate.setHours(0,0,0,0); }
    else if (unit === 'year') { fromDate.setFullYear(fromDate.getFullYear() - (window - 1)); fromDate.setMonth(0,1); fromDate.setHours(0,0,0,0); }

    // CA par période basé sur les factures payées: somme des totalTTC groupée par issueDate
    const revenueRows: Array<{ bucket: Date; total: number }> = await db.$queryRaw(
      Prisma.sql`
        SELECT date_trunc(${Prisma.raw(`'${unit}'`)}, COALESCE(i."issueDate", i."createdAt")) AS bucket,
               SUM(CAST(i."totalTTC" AS numeric))::float AS total
        FROM "Invoice" i
        WHERE i."tenantId" = ${tenantId}
          AND i."status" = 'paid'
          AND COALESCE(i."issueDate", i."createdAt") >= ${fromDate}
        GROUP BY 1
        ORDER BY 1 ASC;
      `
    );

    // Répartition des statuts (fenêtre identique)
    const statusRows: Array<{ status: string; count: number }> = await db.$queryRaw(
      Prisma.sql`
        SELECT "status", COUNT(*)::int AS count
        FROM "Invoice"
        WHERE "tenantId" = ${tenantId}
          AND (COALESCE("issueDate", "createdAt")) >= ${fromDate}
        GROUP BY 1;
      `
    );

    // Répartition des méthodes de paiement (fenêtre identique sur paidAt)
    const paymentMethodRows: Array<{ method: string; total: number }> = await db.$queryRaw(
      Prisma.sql`
        SELECT "method"::text AS method,
               SUM(CAST("amount" AS numeric))::float AS total
        FROM "Payment"
        WHERE "tenantId" = ${tenantId}
          AND "paidAt" >= ${fromDate}
        GROUP BY 1;
      `
    );

    // Marges par produit (basées sur factures payées dans la fenêtre)
    const productMarginsRows: Array<{ productId: string; name: string | null; sku: string | null; revenue: number; cost: number; margin: number }> = await db.$queryRaw(
      Prisma.sql`
        SELECT l."productId"::text AS "productId",
               p."name"::text AS name,
               p."sku"::text AS sku,
               SUM(CAST(l."qty" AS numeric) * CAST(l."unitPrice" AS numeric))::float AS revenue,
               SUM(CAST(l."qty" AS numeric) * CAST(pr."purchasePrice" AS numeric))::float AS cost,
               (SUM(CAST(l."qty" AS numeric) * CAST(l."unitPrice" AS numeric)) - SUM(CAST(l."qty" AS numeric) * CAST(pr."purchasePrice" AS numeric)))::float AS margin
        FROM "InvoiceLine" l
        JOIN "Invoice" i ON i."id" = l."invoiceId"
        LEFT JOIN "Product" pr ON pr."id" = l."productId"
        LEFT JOIN "Product" p ON p."id" = l."productId"
        WHERE l."tenantId" = ${tenantId}
          AND i."tenantId" = ${tenantId}
          AND i."status" = 'paid'
          AND l."productId" IS NOT NULL
          AND COALESCE(i."issueDate", i."createdAt") >= ${fromDate}
        GROUP BY l."productId", p."name", p."sku"
        ORDER BY margin DESC
        LIMIT 10;
      `
    );

    // Top produits (CA et quantités) sur la même fenêtre et factures payées
    const topProductsRows: Array<{ productId: string; name: string | null; sku: string | null; qty: number; revenue: number }> = await db.$queryRaw(
      Prisma.sql`
        SELECT l."productId"::text AS "productId",
               p."name"::text AS name,
               p."sku"::text AS sku,
               SUM(CAST(l."qty" AS numeric))::float AS qty,
               SUM(CAST(l."qty" AS numeric) * CAST(l."unitPrice" AS numeric))::float AS revenue
        FROM "InvoiceLine" l
        JOIN "Invoice" i ON i."id" = l."invoiceId"
        LEFT JOIN "Product" p ON p."id" = l."productId"
        WHERE l."tenantId" = ${tenantId}
          AND i."tenantId" = ${tenantId}
          AND i."status" = 'paid'
          AND l."productId" IS NOT NULL
          AND COALESCE(i."issueDate", i."createdAt") >= ${fromDate}
        GROUP BY l."productId", p."name", p."sku"
        ORDER BY revenue DESC
        LIMIT 3;
      `
    );

    const revenue = revenueRows.map(r => ({ date: new Date(r.bucket).toISOString(), total: r.total ?? 0 }));
    const statuses: Record<string, number> = { draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0 } as any;
    for (const r of statusRows) { (statuses as any)[r.status] = Number(r.count || 0); }

    return NextResponse.json({ granularity, window, from: fromDate.toISOString(), revenue, statuses, paymentMethods: paymentMethodRows, productMargins: productMarginsRows, topProducts: topProductsRows });
  } catch (e) {
    console.error('GET /api/tenant/invoices/summary error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
