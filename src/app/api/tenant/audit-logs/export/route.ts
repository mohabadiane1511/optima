import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';

function parseOlderThan(param: string | null): number {
  if (!param) return 30;
  const m = param.match(/^(\d+)(d)?$/i);
  if (!m) return 30;
  return Math.max(1, Number(m[1]));
}

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

    const { searchParams } = new URL(request.url);
    const olderThanParam = searchParams.get('olderThan'); // ex: 30d
    const days = parseOlderThan(olderThanParam);
    const cutoff = cutoffDate(days);

    // Audit export demandé
    await logAuditEvent({ tenantId, action: 'audit.export.requested', entity: 'audit', metadata: { days, cutoff } }, request);

    const fileName = `audit-${days}d-${new Date().toISOString().slice(0,10)}.csv`;
    const headers = new Headers({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`
    });

    // Construire CSV en lots pour ne pas épuiser la mémoire
    const BATCH = 5000;
    let skip = 0;
    const headerLine = 'createdAt,action,entity,entityId,actorName,actorEmail,ip,route,method,metadata\n';
    let csv = headerLine;
    // Boucle jusqu'à ne plus avoir de résultats
    // Utiliser curseur par date croissante
    let lastCreatedAt: Date | null = null;
    while (true) {
      const where: any = { tenantId, createdAt: { lt: cutoff } };
      const orderBy = { createdAt: 'asc' } as any;
      const items = await db.auditLog.findMany({ where, orderBy, take: BATCH, skip });
      if (!items.length) break;
      for (const l of items as any[]) {
        const meta = l.metadata ? JSON.stringify(l.metadata).replaceAll('"', '""') : '';
        const line = [
          new Date(l.createdAt).toISOString(),
          l.action,
          l.entity,
          l.entityId || '',
          l.actorName || '',
          l.actorEmail || '',
          l.ip || '',
          l.route || '',
          l.method || '',
          meta
        ].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',') + '\n';
        csv += line;
        lastCreatedAt = l.createdAt;
      }
      if (items.length < BATCH) break;
      skip += BATCH;
    }

    return new NextResponse(csv, { status: 200, headers });
  } catch (e) {
    console.error('GET /api/tenant/audit-logs/export error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


