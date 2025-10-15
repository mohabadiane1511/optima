import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

export async function GET(request: NextRequest) {
  try {
    const jar = await cookies();
    const raw = jar.get('tenant_session')?.value;
    let tenantId: string | null = null;
    let userId: string | null = null;
    if (raw) {
      try { const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as any; tenantId = p?.tenantId || null; userId = p?.userId || null; } catch {}
    }
    if (!tenantId) {
      let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
      if (!tenantSlug && process.env.NODE_ENV !== 'production') tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || null;
      if (tenantSlug) {
        const t = await (prisma as any).tenant.findUnique({ where: { slug: tenantSlug } });
        tenantId = t?.id || null;
      }
    }
    if (!tenantId || !userId) return NextResponse.json({ role: null }, { status: 200 });
    const db = prisma as any;
    const membership = await db.membership.findFirst({ where: { tenantId, userId }, select: { role: true } });
    return NextResponse.json({ role: membership?.role || null });
  } catch (e) {
    return NextResponse.json({ role: null }, { status: 200 });
  }
}


