import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

const db = prisma as any;

export type TenantPlanContext = {
  tenantId: string;
  planId: string | null;
  planCode: string | null;
  maxUsers: number | null;
  allowedModules: string[];
  activeUsers: number;
};

export async function resolveTenantIdFromRequest(request: NextRequest): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) {
    try {
      const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as { tenantId?: string };
      if (p?.tenantId) return p.tenantId;
    } catch {}
  }

  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') {
    tenantSlug = request.headers.get('x-tenant-slug') || (process.env.DEFAULT_TENANT_SLUG as any) || null;
  }
  if (!tenantSlug) return null;
  const t = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  return t?.id || null;
}

export async function getTenantPlanContext(tenantId: string): Promise<TenantPlanContext | null> {
  const t = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, planId: true, planCode: true, maxUsers: true, allowedModules: true },
  });
  if (!t) return null;
  const activeUsers = await db.membership.count({ where: { tenantId, active: true } });
  return {
    tenantId: t.id,
    planId: t.planId ?? null,
    planCode: (t as any).planCode ?? null,
    maxUsers: (t as any).maxUsers ?? null,
    allowedModules: (t as any).allowedModules ?? [],
    activeUsers,
  };
}

export async function isModuleEnabledForTenant(tenantId: string, moduleKey: string): Promise<boolean> {
  const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { allowedModules: true } });
  const mods: string[] = (t?.allowedModules as any) || [];
  return mods.includes(moduleKey);
}


