import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { resolveTenantFromHost } from '@/lib/tenant/host';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
    if (!tenantSlug && process.env.NODE_ENV !== 'production') {
      tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || undefined;
    }
    if (!tenantSlug) return NextResponse.json([]);

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) return NextResponse.json([]);

    const cats = await prisma.category.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(cats.map(c => ({ id: c.id, name: c.name })));
  } catch (e) {
    console.error('GET /api/tenant/categories error', e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
    if (!tenantSlug && process.env.NODE_ENV !== 'production') {
      tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || undefined;
    }
    if (!tenantSlug) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) return NextResponse.json({ error: 'Tenant inconnu' }, { status: 404 });

    const body = await request.json();
    const name: string = (body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

    const created = await prisma.category.create({
      data: { tenantId: tenant.id, name },
    });
    return NextResponse.json({ id: created.id, name: created.name }, { status: 201 });
  } catch (e) {
    console.error('POST /api/tenant/categories error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


