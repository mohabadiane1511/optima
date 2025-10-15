import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

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

export async function GET(request: NextRequest) {
  try {
    const { tenantId, userId } = await resolveContext(request);
    if (!tenantId || !userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const db = prisma as any;
    // Vérifier rôle admin/owner
    const membership = await db.membership.findFirst({ where: { tenantId, userId }, select: { role: true } });
    if (!membership || (membership.role !== 'admin')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
    const skip = (page - 1) * limit;
    const action = searchParams.get('action') || undefined;
    const entity = searchParams.get('entity') || undefined;

    const where: any = { tenantId };
    if (action) where.action = action;
    if (entity) where.entity = entity;

    const [items, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, createdAt: true, action: true, entity: true, entityId: true,
          actorName: true, actorEmail: true, actorId: true, route: true, ip: true, userAgent: true, metadata: true
        }
      }),
      db.auditLog.count({ where })
    ]);

    return NextResponse.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (e) {
    console.error('GET /api/tenant/audit-logs error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


