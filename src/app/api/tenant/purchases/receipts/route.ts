import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

async function resolveTenantId(request: NextRequest): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) { try { const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as any; if (p?.tenantId) return p.tenantId; } catch {}
  }
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || null;
  if (!tenantSlug) return null;
  const db = prisma as any;
  const t = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  return t?.id || null;
}

// GET /api/tenant/purchases/receipts?page=1&limit=10&q=
export async function GET(request: NextRequest) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    const db = prisma as any;

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 10)));
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();

    const where: any = { tenantId };
    const total = await db.goodsReceipt.count({ where });
    const rows = await db.goodsReceipt.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { purchaseOrder: true } });

    const items = await Promise.all(rows.map(async (r: any) => {
      const entries = await db.goodsReceiptEntry.count({ where: { tenantId, goodsReceiptId: r.id } });
      return {
        id: r.id,
        purchaseOrderId: r.purchaseOrderId,
        supplier: r.purchaseOrder?.supplier || null,
        status: r.status,
        createdAt: r.createdAt,
        entryCount: entries,
      };
    }));

    // Filtre q simple sur supplier/id
    const filtered = q
      ? items.filter((it: any) => String(it.id).toLowerCase().includes(q) || String(it.supplier || '').toLowerCase().includes(q))
      : items;

    return NextResponse.json({
      items: filtered,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (e) {
    console.error('GET /api/tenant/purchases/receipts', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


