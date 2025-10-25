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
    if (!tenantId) return NextResponse.json({ role: null, userId: null }, { status: 200 });
    const db = prisma as any;
    const [membership, tenant] = await Promise.all([
      userId ? db.membership.findFirst({ where: { tenantId, userId }, select: { role: true } }) : Promise.resolve(null),
      db.tenant.findUnique({ where: { id: tenantId }, select: { allowedModules: true, maxUsers: true, planId: true, planCode: true } })
    ]);

    let allowedModules: string[] = Array.isArray(tenant?.allowedModules) ? tenant!.allowedModules : [];
    let maxUsers: number | null = tenant?.maxUsers ?? null;

    // Fallback uniquement si snapshot vide (pas d'union avec le plan)
    if ((allowedModules.length === 0 || maxUsers == null)) {
      const fallbackPlan = tenant?.planId
        ? await db.plan.findUnique({ where: { id: tenant.planId } })
        : await db.plan.findUnique({ where: { code: 'ESSENTIEL' } });
      if (allowedModules.length === 0) allowedModules = (fallbackPlan?.modules as any) || ['dashboard', 'produits_stocks', 'ventes'];
      if (maxUsers == null) maxUsers = (fallbackPlan as any)?.includedUsers ?? 1;
    }

    return NextResponse.json({ role: membership?.role || null, userId: userId || null, allowedModules, maxUsers });
  } catch (e) {
    return NextResponse.json({ role: null, userId: null }, { status: 200 });
  }
}


