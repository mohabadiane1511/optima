import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';

const db = prisma as any;

async function resolveTenant(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get('tenant_session')?.value;
  if (session) {
    try {
      const payload = JSON.parse(Buffer.from(session, 'base64').toString('utf-8')) as { tenantId?: string };
      if (payload?.tenantId) {
        const t = await db.tenant.findUnique({ where: { id: payload.tenantId } });
        if (t) return t;
      }
    } catch {}
  }
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') {
    tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || null;
  }
  if (!tenantSlug) return null;
  return await db.tenant.findUnique({ where: { slug: tenantSlug } });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Tenant inconnu' }, { status: 404 });
    const id = params.id;
    const { active } = await request.json();
    if (typeof active !== 'boolean') return NextResponse.json({ error: 'Champ active requis' }, { status: 400 });

    const prod = await db.product.findFirst({ where: { id, tenantId: tenant.id } });
    if (!prod) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });

    const updated = await db.product.update({ where: { id }, data: { active } });
    await logAuditEvent({ tenantId: tenant.id, action: active ? 'product.activated' : 'product.deactivated', entity: 'product', entityId: id, metadata: { active } }, request);
    return NextResponse.json({ id: updated.id, active: updated.active });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


