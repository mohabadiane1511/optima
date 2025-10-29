import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';

type SessionPayload = { userId?: string; tenantId?: string };

async function resolveTenantAndUser(request: NextRequest): Promise<{ tenantId: string | null; userId: string | null }> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  let tenantId: string | null = null;
  let userId: string | null = null;
  if (raw) {
    try {
      const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as SessionPayload;
      tenantId = p?.tenantId || null;
      userId = p?.userId || null;
    } catch {}
  }

  if (!tenantId) {
    let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
    if (!tenantSlug && process.env.NODE_ENV !== 'production') {
      tenantSlug = request.headers.get('x-tenant-slug') || (process.env.DEFAULT_TENANT_SLUG as any) || null;
    }
    if (tenantSlug) {
      const t = await (prisma as any).tenant.findUnique({ where: { slug: tenantSlug } });
      tenantId = t?.id || null;
    }
  }

  return { tenantId, userId };
}

async function getUserRole(tenantId: string, userId: string): Promise<string | null> {
  const db = prisma as any;
  const membership = await db.membership.findFirst({ where: { tenantId, userId }, select: { role: true } });
  return membership?.role || null;
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await resolveTenantAndUser(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });

    const db = prisma as any;
    const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true, logoUrl: true, businessRegistration: true, ninea: true, billingFrequency: true, nextInvoiceAt: true, lastInvoicedPeriod: true } });
    if (!t) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

    return NextResponse.json({
      name: t.name,
      logoUrl: t.logoUrl || null,
      businessRegistration: t.businessRegistration || null,
      ninea: t.ninea || null,
      billingFrequency: t.billingFrequency || 'monthly',
      nextInvoiceAt: t.nextInvoiceAt ? t.nextInvoiceAt.toISOString() : null,
      lastInvoicedPeriod: t.lastInvoicedPeriod || null,
    });
  } catch (e) {
    console.error('GET /api/tenant/organization error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT body: { logoUrl?: string, businessRegistration?: string, ninea?: string }
export async function PUT(request: NextRequest) {
  try {
    const { tenantId, userId } = await resolveTenantAndUser(request);
    if (!tenantId || !userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const role = await getUserRole(tenantId, userId);
    if (!role || (role !== 'owner' && role !== 'admin')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await (async () => { try { return await request.json(); } catch { return {}; } })() as any;
    const logoUrl = typeof body?.logoUrl === 'string' ? body.logoUrl.trim() : undefined;
    const businessRegistration = typeof body?.businessRegistration === 'string' ? body.businessRegistration.trim() : undefined;
    const ninea = typeof body?.ninea === 'string' ? body.ninea.trim() : undefined;

    // Rien à mettre à jour
    if (logoUrl === undefined && businessRegistration === undefined && ninea === undefined) {
      return NextResponse.json({ error: 'Aucun champ fourni' }, { status: 400 });
    }

    // Validations simples
    const validateStr = (v: string | undefined, max: number) => (v == null ? true : (v.length <= max));
    if (!validateStr(logoUrl, 2048)) return NextResponse.json({ error: 'logoUrl trop long' }, { status: 400 });
    if (!validateStr(businessRegistration, 128)) return NextResponse.json({ error: 'Régistre de commerce trop long' }, { status: 400 });
    if (!validateStr(ninea, 64)) return NextResponse.json({ error: 'NINEA trop long' }, { status: 400 });

    const db = prisma as any;
    const before = await db.tenant.findUnique({ where: { id: tenantId }, select: { logoUrl: true, businessRegistration: true, ninea: true } });
    if (!before) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

    const data: any = {};
    if (logoUrl !== undefined) data.logoUrl = logoUrl || null;
    if (businessRegistration !== undefined) data.businessRegistration = businessRegistration || null;
    if (ninea !== undefined) data.ninea = ninea || null;

    const updated = await db.tenant.update({ where: { id: tenantId }, data, select: { logoUrl: true, businessRegistration: true, ninea: true } });

    await logAuditEvent({
      tenantId,
      action: 'organization.updated',
      entity: 'tenant',
      entityId: tenantId,
      before,
      after: updated,
      metadata: { fields: Object.keys(data) }
    }, request);

    return NextResponse.json({ ok: true, ...updated });
  } catch (e) {
    console.error('PUT /api/tenant/organization error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


