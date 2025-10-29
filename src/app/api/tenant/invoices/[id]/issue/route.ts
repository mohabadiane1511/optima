import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const revalidate = 0;
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';


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

function generateNumber(date = new Date(), seq: number) {
  const y = date.getFullYear();
  return `INV-${y}-${String(seq).padStart(4, '0')}`;
}

export async function POST(request: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });

    const db = prisma as any;
    const { id } = await (ctx.params as any);
    const inv = await db.invoice.findFirst({ where: { id, tenantId }, include: { lines: true } });
    if (!inv) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    if (inv.status !== 'draft') return NextResponse.json({ error: 'Déjà émise ou annulée' }, { status: 400 });
    if (!inv.lines.length) return NextResponse.json({ error: 'Aucune ligne' }, { status: 400 });

    // Génération robuste du numéro: tenant-scoped + retry sur collision
    const issueDate = new Date();
    const yearStart = new Date(issueDate.getFullYear(), 0, 1);

    let number = '';
    let attempts = 0;
    while (attempts < 3) {
      const countYear = await db.invoice.count({ where: { tenantId, issueDate: { gte: yearStart } } });
      number = generateNumber(issueDate, countYear + 1);
      try {
        const updated = await db.$transaction(async (txRaw: any) => {
          const tx = txRaw as any;
          // Idempotence: si déjà numérotée, renvoyer telle quelle
          const already = await tx.invoice.findUnique({ where: { id: inv.id } });
          if (already?.number) return already;

          const upd = await tx.invoice.update({
            where: { id: inv.id },
            data: { status: 'sent', issueDate, number },
            select: { id: true, number: true, status: true, issueDate: true }
          });

          for (const l of inv.lines) {
            if (!l.productId) continue;
            const existing = await tx.stock.findFirst({ where: { tenantId, productId: l.productId } });
            const qty = Number(l.qty || 0);
            const nextQty = Math.max(0, Number(existing?.qtyOnHand ?? 0) - qty);
            if (!existing) {
              await tx.stock.create({ data: { tenantId, productId: l.productId, qtyOnHand: nextQty, reorderPoint: 0 } });
            } else {
              await tx.stock.update({ where: { id: existing.id }, data: { qtyOnHand: nextQty } });
            }
            await tx.stockMovement.create({ data: { tenantId, productId: l.productId, type: 'OUT', qty, reason: `Invoice ${number}` } });
          }

          return upd;
        });

        await logAuditEvent({ tenantId, action: 'invoice.issued', entity: 'invoice', entityId: updated.id, metadata: { number: updated.number } }, request);
        return NextResponse.json(updated);
      } catch (e: any) {
        // Collision numéro (unicité tenantId,number) → retry
        if (e?.code === 'P2002') { attempts++; continue; }
        throw e;
      }
    }

    // Si on arrive ici, échec après retries
    return NextResponse.json({ error: 'Conflit de numérotation, réessayez.' }, { status: 409 });
  } catch (e) {
    console.error('POST /api/tenant/invoices/[id]/issue', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


