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
    const q = searchParams.get('q')?.trim() || '';
    const db = prisma as any;
    const where: any = { tenantId };
    if (q) where.OR = [ { name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } } ];
    const [items, total] = await Promise.all([
      db.supplier.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      db.supplier.count({ where })
    ]);
    return NextResponse.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 } });
  } catch (e) {
    console.error('GET /api/tenant/suppliers error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const body = await request.json();
    const name = String(body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
    const email = body?.email ? String(body.email) : null;
    const phone = body?.phone ? String(body.phone) : null;
    const address = body?.address ? String(body.address) : null;
    const created = await (prisma as any).supplier.create({ data: { tenantId, name, email, phone, address } });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('POST /api/tenant/suppliers error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


