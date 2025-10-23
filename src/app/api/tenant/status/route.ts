import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenantFromHost } from '@/lib/tenant/host';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let slug = searchParams.get('slug');
    if (!slug) {
      let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
      if (!tenantSlug && process.env.NODE_ENV !== 'production') {
        tenantSlug = request.headers.get('x-tenant-slug') || (process.env.DEFAULT_TENANT_SLUG as any) || null;
      }
      slug = tenantSlug || null;
    }
    if (!slug) return NextResponse.json({ status: 'unknown' });
    const t = await (prisma as any).tenant.findUnique({ where: { slug }, select: { status: true } });
    return NextResponse.json({ status: t?.status || 'unknown' });
  } catch (e) {
    return NextResponse.json({ status: 'unknown' }, { status: 200 });
  }
}


