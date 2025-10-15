import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

type AuditBase = {
  tenantId: string;
  action: string; // ex: invoice.created, invoice.issued, payment.recorded
  entity?: string; // ex: invoice, payment, product
  entityId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

function extractRequestContext(request?: NextRequest) {
  if (!request) return {} as any;
  const url = new URL(request.url);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const userAgent = request.headers.get('user-agent') || null;
  const route = url.pathname;
  const method = request.method;
  const requestId = request.headers.get('x-request-id') || null;
  return { ip, userAgent, route, method, requestId };
}

export async function logAuditEvent(base: AuditBase, request?: NextRequest) {
  try {
    const { ip, userAgent, route, method, requestId } = extractRequestContext(request);
    const db = prisma as any;

    // Tenter de compléter l'acteur depuis la session si non fourni
    let actorId = base.actorId || null;
    let actorName = base.actorName || null;
    let actorEmail = base.actorEmail || null;
    try {
      if (!actorId && request) {
        const cookieHeader = request.headers.get('cookie') || '';
        const match = cookieHeader.split(';').map(v => v.trim()).find(v => v.startsWith('tenant_session='));
        if (match) {
          const raw = decodeURIComponent(match.split('=')[1]);
          const payload = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as { userId?: string };
          if (payload?.userId) {
            actorId = payload.userId;
            const u = await db.user.findUnique({ where: { id: payload.userId }, select: { name: true, email: true } });
            actorName = u?.name || actorName;
            actorEmail = u?.email || actorEmail;
          }
        }
      }
    } catch {}
    await db.auditLog.create({
      data: {
        tenantId: base.tenantId,
        actorId,
        actorName,
        actorEmail,
        actorType: actorId ? 'user' : 'system',
        action: base.action,
        entity: base.entity || 'misc',
        entityId: base.entityId || null,
        source: 'api',
        route,
        method,
        ip,
        userAgent,
        requestId,
        before: base.before as any,
        after: base.after as any,
        metadata: base.metadata as any,
      }
    });
  } catch (e) {
    // Ne pas casser la requête si l'audit échoue
    console.warn('[audit] logAuditEvent failed', e);
  }
}


