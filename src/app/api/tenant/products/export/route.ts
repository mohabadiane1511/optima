import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

const prisma = new PrismaClient();

function formatDateFR(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${day}/${month}/${year} à ${hours}:${minutes}`;
}
async function resolveTenant(request: NextRequest) {

  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) {
    try {
      const payload = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as { tenantId?: string };
      if (payload?.tenantId) {
        const t = await prisma.tenant.findUnique({ where: { id: payload.tenantId } });
        if (t) return t;
      }
    } catch {}
  }
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') {
    tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || undefined;
  }
  return tenantSlug ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } }) : null;
}

function toCsvRow(values: (string | number | null | undefined)[]) {
  return values
    .map((v) => {
      const s = v == null ? '' : String(v);
      const escaped = s.replace(/"/g, '""');
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    })
    .join(',');
}

function formatNumber(n: number) { return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }

export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Tenant inconnu' }, { status: 404 });

    const products = await prisma.product.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'asc' } });
    const productIds = products.map(p => p.id);
    const [stocks, categories] = await Promise.all([
      prisma.stock.findMany({ where: { tenantId: tenant.id, productId: { in: productIds } } }),
      prisma.category.findMany({ where: { tenantId: tenant.id } }),
    ]);
    const stockMap = Object.fromEntries(stocks.map(s => [s.productId, s]));
    const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

    const header = ['SKU', 'Nom', 'Catégorie', 'Prix vente', 'Prix achat', 'Unité', 'Actif', 'Stock', 'Seuil'];
    const rows = ['\uFEFF' + toCsvRow(header)];
    for (const p of products) {
      const s = stockMap[p.id];
      rows.push(toCsvRow([
        p.sku,
        p.name,
        (p as any).categoryId ? (catMap[(p as any).categoryId] || '') : '',
        formatNumber(Number(p.salePrice ?? 0)),
        formatNumber(Number(p.purchasePrice ?? 0)),
        p.unit,
        p.active ? 'Oui' : 'Non',
        s ? Number(s.qtyOnHand) : 0,
        s ? Number(s.reorderPoint ?? 0) : 0,
      ]));
    }
    const csv = rows.join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="products-${formatDateFR(new Date())}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('GET /api/tenant/products/export error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


