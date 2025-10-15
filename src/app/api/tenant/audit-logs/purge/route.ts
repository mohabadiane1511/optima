import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';

function cutoffDate(days = 30) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

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
      const t = await (prisma as any).tenant.findUnique({ where: { slug: tenantSlug } });
      tenantId = t?.id || null;
    }
  }
  return { tenantId, userId };
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await resolveContext(request);
    if (!tenantId || !userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const db = prisma as any;
    const membership = await db.membership.findFirst({ where: { tenantId, userId }, select: { role: true } });
    if (!membership || membership.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const cutoff = cutoffDate(30);
    let purged = 0;
    const BATCH = 5000;
    while (true) {
      const ids: { id: string }[] = await db.auditLog.findMany({ where: { tenantId, createdAt: { lt: cutoff } }, select: { id: true }, take: BATCH });
      if (ids.length === 0) break;
      await db.auditLog.deleteMany({ where: { id: { in: ids.map((x) => x.id) } } });
      purged += ids.length;
      if (ids.length < BATCH) break;
    }

    await logAuditEvent({ tenantId, action: 'audit.purge.performed', entity: 'audit', metadata: { purged, cutoff } }, request);
    return NextResponse.json({ purged, cutoff });
  } catch (e) {
    console.error('POST /api/tenant/audit-logs/purge error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


