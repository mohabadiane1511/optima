import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

async function resolveTenantId(request: NextRequest): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) { try { const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as any; if (p?.tenantId) return p.tenantId; } catch {} }
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || null;
  if (!tenantSlug) return null;
  const db = prisma as any;
  const t = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  return t?.id || null;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });

    const db = prisma as any;
    const inv = await db.invoice.findFirst({ where: { id: params.id, tenantId }, include: { payments: true, lines: true } });
    if (!inv) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    if (inv.status === 'cancelled') return NextResponse.json({ error: 'Déjà annulée' }, { status: 400 });

    const paid = (inv.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    if (paid > 0) return NextResponse.json({ error: 'Impossible d’annuler: des paiements existent' }, { status: 400 });

    const updated = await db.$transaction(async (txRaw: any) => {
      const tx = txRaw as any;
      // Ré-incrémenter le stock si la facture était émise
      if (inv.status === 'sent' || inv.status === 'overdue') {
        for (const l of inv.lines) {
          if (!l.productId) continue;
          const existing = await tx.stock.findFirst({ where: { tenantId, productId: l.productId } });
          const qty = Number(l.qty || 0);
          const nextQty = Number(existing?.qtyOnHand ?? 0) + qty;
          if (!existing) {
            await tx.stock.create({ data: { tenantId, productId: l.productId, qtyOnHand: nextQty, reorderPoint: 0 } });
          } else {
            await tx.stock.update({ where: { id: existing.id }, data: { qtyOnHand: nextQty } });
          }
          await tx.stockMovement.create({ data: { tenantId, productId: l.productId, type: 'IN', qty, reason: `Invoice ${inv.number} cancelled` } });
        }
      }

      return tx.invoice.update({ where: { id: inv.id }, data: { status: 'cancelled' }, select: { id: true, status: true } });
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('POST /api/tenant/invoices/[id]/cancel', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
