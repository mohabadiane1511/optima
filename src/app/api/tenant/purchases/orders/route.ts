import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

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

export async function GET(request: NextRequest) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 10)));
    const skip = (page - 1) * limit;
    const statusParam = searchParams.get('status');
    const statuses = statusParam ? statusParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    const q = searchParams.get('q')?.trim() || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const db = prisma as any;
    const where: any = { tenantId };
    if (statuses.length) where.status = { in: statuses };
    if (q) where.supplier = { contains: q, mode: 'insensitive' };
    if (from || to) where.createdAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };

    const [orders, total] = await Promise.all([
      db.purchaseOrder.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, select: { id: true, supplier: true, status: true, totalTTC: true, createdAt: true } }),
      db.purchaseOrder.count({ where })
    ]);

    return NextResponse.json({
      items: orders.map((o: any) => ({ id: o.id, supplier: o.supplier, status: o.status, total: Number(o.totalTTC || 0), createdAt: o.createdAt })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 }
    });
  } catch (e) {
    console.error('GET /api/tenant/purchases/orders error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


