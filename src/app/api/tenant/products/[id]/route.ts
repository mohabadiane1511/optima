import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';

export const revalidate = 0;
const db = prisma as any;

async function resolveTenant(request: NextRequest) {
  // 1) Session cookie first
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
  // 2) Host / dev fallbacks
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') {
    tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || null;
  }
  if (!tenantSlug) return null;
  return await db.tenant.findUnique({ where: { slug: tenantSlug } });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Tenant inconnu' }, { status: 404 });

    const id = params.id;
    const body = await request.json();
    const {
      sku,
      name,
      categoryId,
      unit,
      purchasePrice,
      salePrice,
    } = body || {};

    const data: any = {};
    if (typeof sku === 'string') data.sku = sku.trim();
    if (typeof name === 'string') data.name = name.trim();
    if (typeof unit === 'string') data.unit = unit.trim();
    if (purchasePrice !== undefined) data.purchasePrice = Number(purchasePrice || 0);
    if (salePrice !== undefined) data.salePrice = Number(salePrice || 0);
    if (categoryId === null) data.category = { disconnect: true };
    if (typeof categoryId === 'string' && categoryId) data.category = { connect: { id: categoryId } };

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    const existing = await db.product.findFirst({ where: { id, tenantId: tenant.id } });
    if (!existing) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });

    const before = { sku: existing.sku, name: existing.name, unit: existing.unit, purchasePrice: existing.purchasePrice, salePrice: existing.salePrice, categoryId: existing.categoryId };

    const updated = await db.product.update({ where: { id }, data });

    await logAuditEvent({ tenantId: tenant.id, action: 'product.updated', entity: 'product', entityId: id, before, after: { sku: updated.sku, name: updated.name, unit: updated.unit, purchasePrice: updated.purchasePrice, salePrice: updated.salePrice, categoryId: updated.categoryId } }, request);

    return NextResponse.json({ id: updated.id, sku: updated.sku, name: updated.name, unit: updated.unit, purchasePrice: Number(updated.purchasePrice ?? 0), salePrice: Number(updated.salePrice ?? 0), categoryId: updated.categoryId, active: updated.active });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'SKU déjà utilisé' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Tenant inconnu' }, { status: 404 });
    const id = params.id;
    const prod = await db.product.findFirst({ where: { id, tenantId: tenant.id } });
    if (!prod) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    if (prod.active) return NextResponse.json({ error: 'Impossible de supprimer un produit actif. Désactivez-le d\'abord.' }, { status: 400 });

    // Nettoyer le stock associé avant suppression produit (sécurité referential)
    await db.stock.deleteMany({ where: { tenantId: tenant.id, productId: id } });
    await db.product.delete({ where: { id } });

    await logAuditEvent({ tenantId: tenant.id, action: 'product.deleted', entity: 'product', entityId: id }, request);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


