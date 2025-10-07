import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { resolveTenantFromHost } from '@/lib/tenant/host';

const prisma = new PrismaClient();

function serializeProduct(p: any, stockMap: Record<string, any>, categoryName?: string | null) {
  const s = stockMap[p.id];
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: categoryName ? { name: categoryName } : null,
    unit: p.unit,
    purchasePrice: Number(p.purchasePrice ?? 0),
    salePrice: Number(p.salePrice ?? 0),
    active: p.active,
    qtyOnHand: Number(s?.qtyOnHand ?? 0),
    reorderPoint: Number(s?.reorderPoint ?? 0),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    // 1) Priorité à la session (tenant_id) si présente
    const cookieStore = await cookies();
    const session = cookieStore.get('tenant_session')?.value;
    let tenantIdFromSession: string | null = null;
    if (session) {
      try {
        const payload = JSON.parse(Buffer.from(session, 'base64').toString('utf-8')) as { tenantId?: string };
        if (payload?.tenantId) tenantIdFromSession = payload.tenantId;
      } catch {}
    }

    let tenant = tenantIdFromSession
      ? await prisma.tenant.findUnique({ where: { id: tenantIdFromSession } })
      : null;

    // 2) Sinon, résolution par host/dev fallbacks
    if (!tenant) {
      let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
      if (!tenantSlug && process.env.NODE_ENV !== 'production') {
        tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || undefined;
      }
      tenant = tenantSlug ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } }) : null;
    }

    if (!tenant) return NextResponse.json([]);

    const products = await prisma.product.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    });

    if (products.length === 0) return NextResponse.json([]);

    const productIds = products.map(p => p.id);
    const stocks = await prisma.stock.findMany({
      where: { tenantId: tenant.id, productId: { in: productIds } },
    });
    const stockMap: Record<string, any> = {};
    stocks.forEach(s => { stockMap[s.productId] = s; });

    // Charger les catégories si besoin
    const catIds = Array.from(new Set(products.map(p => p.categoryId).filter(Boolean))) as string[];
    let catMap: Record<string, string> = {};
    if (catIds.length) {
      const cats = await prisma.category.findMany({ where: { tenantId: tenant.id, id: { in: catIds } } });
      catMap = Object.fromEntries(cats.map(c => [c.id, c.name]));
    }

    return NextResponse.json(products.map(p => serializeProduct(p, stockMap, p.categoryId ? catMap[p.categoryId] : null)));
  } catch (e) {
    console.error('GET /api/tenant/products error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1) Priorité à la session (tenant_id)
    const cookieStore = await cookies();
    const session = cookieStore.get('tenant_session')?.value;
    let tenantIdFromSession: string | null = null;
    if (session) {
      try {
        const payload = JSON.parse(Buffer.from(session, 'base64').toString('utf-8')) as { tenantId?: string };
        if (payload?.tenantId) tenantIdFromSession = payload.tenantId;
      } catch {}
    }

    let tenant = tenantIdFromSession
      ? await prisma.tenant.findUnique({ where: { id: tenantIdFromSession } })
      : null;

    // 2) Fallbacks dev si pas de session
    if (!tenant) {
      let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
      if (!tenantSlug && process.env.NODE_ENV !== 'production') {
        tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || undefined;
      }
      tenant = tenantSlug ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } }) : null;
    }

    if (!tenant) return NextResponse.json({ error: 'Tenant inconnu' }, { status: 404 });

    const body = await request.json();
    const { sku, name, categoryId, unit = 'unité', purchasePrice = 0, salePrice = 0, active = true } = body;

    if (!sku || !name) {
      return NextResponse.json({ error: 'sku et name sont requis' }, { status: 400 });
    }

    // Créer le produit (connexion catégorie si fournie)
    const created = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        sku,
        name,
        unit,
        purchasePrice,
        salePrice,
        active,
        ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
      },
    });

    // Initialiser le stock (entrée 0 si non existant) sans dépendre d'une contrainte unique composite
    const existingStock = await prisma.stock.findFirst({ where: { tenantId: tenant.id, productId: created.id } });
    if (!existingStock) {
      await prisma.stock.create({ data: { tenantId: tenant.id, productId: created.id, qtyOnHand: 0, reorderPoint: 0 } });
    }

    // Recharger infos sérialisées
    const s = await prisma.stock.findFirst({ where: { tenantId: tenant.id, productId: created.id } });
    return NextResponse.json(
      {
        id: created.id,
        sku: created.sku,
        name: created.name,
        category: null,
        unit: created.unit,
        purchasePrice: Number(created.purchasePrice ?? 0),
        salePrice: Number(created.salePrice ?? 0),
        active: created.active,
        qtyOnHand: Number(s?.qtyOnHand ?? 0),
        reorderPoint: Number(s?.reorderPoint ?? 0),
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
      { status: 201 }
    );
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'SKU déjà utilisé' }, { status: 400 });
    }
    console.error('POST /api/tenant/products error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


