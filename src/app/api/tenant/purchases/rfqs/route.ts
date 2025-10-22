import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';

export const revalidate = 0;

async function resolveTenantId(request: NextRequest): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) {
    try {
      const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as any;
      if (p?.tenantId) return p.tenantId;
    } catch {}
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
    const supplier = searchParams.get('supplier')?.trim() || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const db = prisma as any;
    const where: any = { tenantId };
    if (statuses.length) where.status = { in: statuses };
    if (q || supplier) {
      const supplierCond = supplier ? [{ suppliers: { has: supplier } }] : [];
      const qConds = q ? [
        { note: { contains: q, mode: 'insensitive' } },
        { lines: { some: { item: { contains: q, mode: 'insensitive' } } } },
        { suppliers: { hasSome: [q] } },
      ] : [];
      where.OR = [...supplierCond, ...qConds];
    }
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [rfqs, total] = await Promise.all([
      db.rfq.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: { id: true, status: true, note: true, suppliers: true, createdAt: true, _count: { select: { lines: true, offers: true } } }
      }),
      db.rfq.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit) || 0;
    return NextResponse.json({
      items: rfqs.map((r: any) => ({
        id: r.id,
        status: r.status,
        note: r.note,
        suppliers: r.suppliers || [],
        createdAt: r.createdAt,
        lineCount: r._count?.lines || 0,
        offerCount: r._count?.offers || 0,
      })),
      pagination: { page, limit, total, totalPages }
    });
  } catch (e) {
    console.error('GET /api/tenant/purchases/rfqs error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });

    const body = await request.json();
    const suppliers: string[] = Array.isArray(body?.suppliers) ? body.suppliers.filter((s: any) => typeof s === 'string' && s.trim()).slice(0, 20) : [];
    const note: string | null = body?.note || null;
    const lines: any[] = Array.isArray(body?.lines) ? body.lines : [];
    if (lines.length === 0) return NextResponse.json({ error: 'Au moins une ligne requise' }, { status: 400 });

    const normalizedLines = lines.map((l: any) => {
      const quantity = Number(l?.quantity || 0);
      const estimatedPrice = Number(l?.estimatedPrice || 0);
      const taxRate = Number(l?.taxRate || 0);
      const item = String(l?.item || '').trim();
      return { item, quantity, estimatedPrice, taxRate };
    }).filter((l: any) => l.item && l.quantity > 0);

    if (normalizedLines.length === 0) return NextResponse.json({ error: 'Lignes invalides' }, { status: 400 });

    const db = prisma as any;
    const created = await db.rfq.create({
      data: {
        tenantId,
        status: 'draft',
        note,
        suppliers,
        lines: {
          create: normalizedLines.map((l: any) => ({
            tenantId,
            item: l.item,
            quantity: l.quantity,
            estimatedPrice: l.estimatedPrice,
            taxRate: l.taxRate,
          }))
        }
      },
      select: { id: true }
    });

    await logAuditEvent({ tenantId, action: 'Demande de prix créée', entity: 'rfq', entityId: created.id, metadata: { suppliersCount: suppliers.length, lines: normalizedLines.length } }, request);

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    console.error('POST /api/tenant/purchases/rfqs error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


