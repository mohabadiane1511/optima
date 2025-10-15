import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';

const db = prisma as any;

async function resolveTenant(request: NextRequest) {
  // 1) Session prioritaire
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
  // 2) Fallbacks dev par host/header
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') {
    tenantSlug = (request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || null) as any;
  }
  return tenantSlug ? await db.tenant.findUnique({ where: { slug: tenantSlug as string } }) : null;
}

async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get('tenant_session')?.value;
    if (!raw) return null;
    const payload = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as { userId?: string };
    return payload?.userId || null;
  } catch {
    return null;
  }
}

// POST /api/tenant/stock-movements
// Body: { productId: string, type: 'IN' | 'OUT', qty: number, reason?: string, cost?: number }
export async function POST(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Tenant inconnu' }, { status: 404 });

    const body = await request.json();
    const { productId, type, qty, reason, cost } = body || {};

    if (!productId || !type || typeof qty !== 'number' || qty <= 0) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }
    if (type !== 'IN' && type !== 'OUT') {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
    }

    // Vérifier que le produit appartient au tenant
    const product = await db.product.findFirst({ where: { id: productId, tenantId: tenant.id } });
    if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });

    const movementQty = type === 'IN' ? qty : -qty;

    const createdBy = await getSessionUserId();
    const result = await db.$transaction(async (txRaw: any) => {
      const tx = txRaw as any;
      // 1) Mettre à jour le stock
      const existing = await tx.stock.findFirst({ where: { tenantId: tenant.id, productId } });
      const nextQty = Number(existing?.qtyOnHand ?? 0) + movementQty;
      if (!existing) {
        await tx.stock.create({ data: { tenantId: tenant.id, productId, qtyOnHand: Math.max(0, nextQty), reorderPoint: 0 } });
      } else {
        await tx.stock.update({ where: { id: existing.id }, data: { qtyOnHand: Math.max(0, nextQty) } });
      }

      // 2) Enregistrer le mouvement
      const created = await tx.stockMovement.create({
        data: {
          tenantId: tenant.id,
          productId,
          type,
          qty,
          cost: typeof cost === 'number' ? cost : null,
          reason: reason || null,
          createdBy: createdBy || null,
        },
      });
      return created;
    });

    // Audit: mouvement de stock
    await logAuditEvent({
      tenantId: tenant.id,
      action: type === 'IN' ? 'stock.incremented' : 'stock.decremented',
      entity: 'stock_movement',
      entityId: result.id,
      metadata: { productId, productName: product?.name || null, qty, type, reason }
    }, request);
    return NextResponse.json({ ok: true, movementId: result.id });
  } catch (e) {
    console.error('POST /api/tenant/stock-movements error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// GET /api/tenant/stock-movements?productId=xxx&limit=20
export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Tenant inconnu' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId') || undefined;
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100);

    const where: any = { tenantId: tenant.id };
    if (productId) where.productId = productId;

    const items = await db.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Enrichir avec produit et utilisateur
    const productIds = Array.from(new Set(items.map((i: any) => i.productId)));
    const userIds = Array.from(new Set(items.map((i: any) => i.createdBy).filter(Boolean) as string[]));

    const [products, users] = await Promise.all([
      productIds.length ? db.product.findMany({ where: { id: { in: productIds as string[] }, tenantId: tenant.id } }) : Promise.resolve([]),
      userIds.length ? db.user.findMany({ where: { id: { in: userIds as string[] } }, select: { id: true, name: true, email: true } }) : Promise.resolve([]),
    ]);
    const productMap = Object.fromEntries((products as any[]).map((p: any) => [p.id, { name: p.name, sku: p.sku }]));
    const userMap = Object.fromEntries((users as any[]).map((u: any) => [u.id, { name: u.name, email: u.email }]));

    return NextResponse.json((items as any[]).map((m: any) => ({
      id: m.id,
      productId: m.productId,
      productName: productMap[m.productId]?.name || null,
      productSku: productMap[m.productId]?.sku || null,
      type: m.type,
      qty: Number(m.qty),
      cost: m.cost == null ? null : Number(m.cost),
      reason: m.reason,
      createdBy: m.createdBy || null,
      createdByName: m.createdBy ? (userMap[m.createdBy]?.name || null) : null,
      createdByEmail: m.createdBy ? (userMap[m.createdBy]?.email || null) : null,
      createdAt: m.createdAt,
    })));
  } catch (e) {
    console.error('GET /api/tenant/stock-movements error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


