import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

function cutoffDate(days = 30) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const db = prisma as any;
async function resolveContext(request: NextRequest) {
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
      const t = await db.tenant.findUnique({ where: { slug: tenantSlug } });
      tenantId = t?.id || null;
    }
  }
  return { tenantId, userId };
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId, userId } = await resolveContext(request);
    if (!tenantId || !userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const membership = await db.membership.findFirst({ where: { tenantId, userId }, select: { role: true } });
    if (!membership || membership.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const cutoff = cutoffDate(30);
    const soonLower = cutoffDate(30);
    const soonUpper = cutoffDate(28);
    const [count, countSoon] = await Promise.all([
      db.auditLog.count({ where: { tenantId, createdAt: { lt: cutoff } } }),
      db.auditLog.count({ where: { tenantId, createdAt: { gte: soonLower, lt: soonUpper } } })
    ]);
    const purgeAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // J-2 → purge au plus tard dans 2 jours
    return NextResponse.json({ count, cutoff, countSoon, purgeAt });
  } catch (e) {
    console.error('GET /api/tenant/audit-logs/stats error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


