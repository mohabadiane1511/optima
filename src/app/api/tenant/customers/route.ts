import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

const db = prisma as any;

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
  const t = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  return t?.id || null;
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const customers = await db.customer.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50 });
    return NextResponse.json(customers.map((c: any) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, address: c.address })));
  } catch (e) {
    console.error('GET /api/tenant/customers error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const { name, email, phone, address } = await request.json();
    if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
    const created = await db.customer.create({ data: { tenantId, name, email: email || null, phone: phone || null, address: address || null } });
    return NextResponse.json({ id: created.id, name: created.name, email: created.email, phone: created.phone, address: created.address }, { status: 201 });
  } catch (e) {
    console.error('POST /api/tenant/customers error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


