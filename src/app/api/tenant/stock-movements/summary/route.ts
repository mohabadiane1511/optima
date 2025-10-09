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

// GET /api/tenant/stock-movements/summary?granularity=daily|weekly|monthly|yearly&window=7|12|...
export async function GET(request: NextRequest) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const granularity = (searchParams.get('granularity') || 'monthly') as 'daily' | 'weekly' | 'monthly' | 'yearly';
    const window = Number(searchParams.get('window') || (granularity === 'daily' ? 7 : granularity === 'weekly' ? 12 : 12));
    const productId = searchParams.get('productId');

    const unit = granularity === 'daily' ? 'day'
      : granularity === 'weekly' ? 'week'
      : granularity === 'yearly' ? 'year'
      : 'month';

    // Calculer la date de début côté JS pour éviter les constructions SQL complexes
    const fromDate = new Date();
    if (unit === 'day') {
      fromDate.setDate(fromDate.getDate() - (window - 1));
      fromDate.setHours(0, 0, 0, 0);
    } else if (unit === 'week') {
      fromDate.setDate(fromDate.getDate() - 7 * (window - 1));
      fromDate.setHours(0, 0, 0, 0);
    } else if (unit === 'month') {
      fromDate.setMonth(fromDate.getMonth() - (window - 1));
      fromDate.setDate(1);
      fromDate.setHours(0, 0, 0, 0);
    } else if (unit === 'year') {
      fromDate.setFullYear(fromDate.getFullYear() - (window - 1));
      fromDate.setMonth(0, 1);
      fromDate.setHours(0, 0, 0, 0);
    }

    // Postgres date_trunc pour agréger IN/OUT par période
    const whereExtra = productId ? Prisma.sql`AND "productId" = ${productId}` : Prisma.sql``;
    const rows: Array<{ bucket: Date; type: string; total: number }> = await db.$queryRaw(
      Prisma.sql`
        SELECT date_trunc(${Prisma.raw(`'${unit}'`)}, "createdAt") AS bucket,
               "type",
               SUM(CAST("qty" AS numeric))::float AS total
        FROM "StockMovement"
        WHERE "tenantId" = ${tenantId}
          ${whereExtra}
          AND "createdAt" >= ${fromDate}
        GROUP BY 1, 2
        ORDER BY 1 ASC;
      `
    );

    // Normaliser en séries IN/OUT alignées sur chaque bucket
    const map = new Map<string, { date: string; in: number; out: number }>();
    for (const r of rows) {
      const key = new Date(r.bucket).toISOString();
      const entry = map.get(key) || { date: key, in: 0, out: 0 };
      if (r.type === 'IN') entry.in = r.total ?? 0; else if (r.type === 'OUT') entry.out = r.total ?? 0;
      map.set(key, entry);
    }
    const data = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    return NextResponse.json({ granularity, data });
  } catch (e) {
    console.error('GET /api/tenant/stock-movements/summary error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


