import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

const db = prisma as any;

async function resolveTenant(request: NextRequest) {
  // Session d'abord
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) {
    try {
      const payload = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as { tenantId?: string };
      if (payload?.tenantId) {
        const t = await db.tenant.findUnique({ where: { id: payload.tenantId } });
        if (t) return t;
      }
    } catch {}
  }
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') {
    tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || null;
  }
  return tenantSlug ? await db.tenant.findUnique({ where: { slug: tenantSlug } }) : null;
}

function parsePreset(preset: string | null) {
  const now = new Date();
  let from: Date | null = null;
  let to: Date | null = null;
  switch (preset) {
    case 'today': {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    }
    case 'last7': {
      to = now;
      from = new Date(now);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case 'thisMonth': {
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
  }
  return { from, to };
}

function toCsvRow(values: (string | number | null | undefined)[]) {
  return values
    .map((v) => {
      const s = v == null ? '' : String(v);
      // échapper les quotes et entourer si nécessaire
      const escaped = s.replace(/"/g, '""');
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    })
    .join(',');
}

function formatDateFR(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${day}/${month}/${year} à ${hours}:${minutes}`;
}

export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Tenant inconnu' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const preset = searchParams.get('preset'); // today | last7 | thisMonth
    const fromParam = searchParams.get('from'); // ISO date
    const toParam = searchParams.get('to');

    let from: Date | null = null;
    let to: Date | null = null;
    if (preset) {
      const r = parsePreset(preset);
      from = r.from;
      to = r.to;
    }
    if (fromParam) from = new Date(fromParam);
    if (toParam) to = new Date(toParam);

    const where: any = { tenantId: tenant.id };
    if (from) where.createdAt = { ...(where.createdAt || {}), gte: from };
    if (to) where.createdAt = { ...(where.createdAt || {}), lte: to };

    const items = await db.stockMovement.findMany({ where, orderBy: { createdAt: 'desc' } });

    // Enrichissements légers
    const productIds = Array.from(new Set(items.map((i: any) => i.productId)));
    const userIds = Array.from(new Set(items.map((i: any) => i.createdBy).filter(Boolean) as string[]));
    const [products, users] = await Promise.all([
      productIds.length ? db.product.findMany({ where: { id: { in: productIds }, tenantId: tenant.id } }) : Promise.resolve([]),
      userIds.length ? db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : Promise.resolve([]),
    ]);
    const productMap = Object.fromEntries(products.map((p: any) => [p.id, { name: p.name, sku: p.sku }]));
    const userMap = Object.fromEntries(users.map((u: any) => [u.id, { name: u.name, email: u.email }]));

    const header = [
      'Date', 'Type', 'Quantite', 'Produit', 'SKU', 'Par (Nom)', 'Par (Email)', 'Raison',
    ];
    const rows = [toCsvRow(header)];
    for (const m of items) {
      const prod = productMap[m.productId] || {} as any;
      const usr = m.createdBy ? (userMap[m.createdBy] || {} as any) : {};
      rows.push(toCsvRow([
        formatDateFR(new Date(m.createdAt)),
        m.type,
        Number(m.qty),
        prod.name || '',
        prod.sku || '',
        usr.name || '',
        usr.email || '',
        m.reason || '',
      ]));
    }
    // Préfixe BOM pour compatibilité Excel et encodage correct des accents (UTF-8)
    const csv = '\uFEFF' + rows.join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="stock-movements-${formatDateFR(new Date())}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('GET /api/tenant/stock-movements/export error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


