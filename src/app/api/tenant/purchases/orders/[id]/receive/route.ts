import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';

async function resolveTenantId(request: NextRequest): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) { try { const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as any; if (p?.tenantId) return p.tenantId; } catch {}
  }
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || null;
  if (!tenantSlug) return null;
  const db = prisma as any;
  const t = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  return t?.id || null;
}

// POST /api/tenant/purchases/orders/[id]/receive
// Body: { lines: [{ poLineId: string, qty: number }], note?: string }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const db = prisma as any;

    const action = 'gr.entry.add';
    const idem = request.headers.get('x-idempotency-key');
    if (idem) {
      const existing = await db.idempotencyKey.findFirst({ where: { tenantId, key: idem, action } });
      if (existing?.response) {
        return new NextResponse(JSON.stringify(existing.response), { status: 200, headers: { 'content-type': 'application/json', 'x-idempotent': 'true' } });
      }
    }

    const po = await db.purchaseOrder.findFirst({ where: { id: params.id, tenantId }, include: { lines: true, goodsReceipt: true } });
    if (!po) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    if (po.status !== 'confirmed') return NextResponse.json({ error: 'Statut PO invalide' }, { status: 400 });

    const payload = await (async () => { try { return await request.json(); } catch { return {}; } })() as any;
    const lines = Array.isArray(payload?.lines) ? payload.lines : [];
    const note = (payload?.note || '').trim() || null;
    if (lines.length === 0) return NextResponse.json({ error: 'Aucune ligne à réceptionner' }, { status: 400 });

    const byId: Record<string, any> = {};
    for (const l of po.lines) byId[l.id] = l;

    // Charger cumul reçu existant
    let receivedByLine: Record<string, number> = {};
    if (po.goodsReceipt) {
      const entries = await db.goodsReceiptEntry.findMany({ where: { tenantId, goodsReceiptId: po.goodsReceipt.id }, select: { id: true } });
      const entryIds = entries.map((e: any) => e.id);
      if (entryIds.length) {
        const prev = await db.goodsReceiptEntryLine.findMany({ where: { tenantId, entryId: { in: entryIds } }, select: { purchaseOrderLineId: true, qtyReceived: true } });
        for (const p of prev) {
          receivedByLine[p.purchaseOrderLineId] = (receivedByLine[p.purchaseOrderLineId] || 0) + Number(p.qtyReceived || 0);
        }
      }
    }

    // Valider quantités
    for (const l of lines) {
      const poLine = byId[l.poLineId];
      const qty = Number(l.qty);
      if (!poLine || !Number.isFinite(qty) || qty <= 0) {
        return NextResponse.json({ error: 'Lignes invalides' }, { status: 400 });
      }
      const ordered = Number(poLine.qty || 0);
      const already = Number(receivedByLine[poLine.id] || 0);
      const remaining = Math.max(0, ordered - already);
      if (qty > remaining) {
        return NextResponse.json({ error: 'Sur-réception interdite' }, { status: 400 });
      }
    }

    const result = await db.$transaction(async (txRaw: any) => {
      const tx = txRaw as any;
      // S'assurer que la réception existe (auto-créée à la confirmation, mais au cas où)
      let gr = await tx.goodsReceipt.findFirst({ where: { tenantId, purchaseOrderId: po.id } });
      if (!gr) {
        gr = await tx.goodsReceipt.create({ data: { tenantId, purchaseOrderId: po.id, status: 'not_received', note: null } });
      }
      // Créer l'entrée (lot)
      const entry = await tx.goodsReceiptEntry.create({ data: { tenantId, goodsReceiptId: gr.id, note } });
      // Créer les lignes
      for (const l of lines) {
        await tx.goodsReceiptEntryLine.create({ data: { tenantId, entryId: entry.id, purchaseOrderLineId: l.poLineId, qtyReceived: l.qty } });
      }

      // Recalculer le statut de la réception
      const entries = await tx.goodsReceiptEntry.findMany({ where: { tenantId, goodsReceiptId: gr.id }, select: { id: true } });
      const entryIds = entries.map((e: any) => e.id);
      const allLines = entryIds.length ? await tx.goodsReceiptEntryLine.findMany({ where: { tenantId, entryId: { in: entryIds } }, select: { purchaseOrderLineId: true, qtyReceived: true } }) : [];
      const sumBy: Record<string, number> = {};
      for (const a of allLines) sumBy[a.purchaseOrderLineId] = (sumBy[a.purchaseOrderLineId] || 0) + Number(a.qtyReceived || 0);
      let allReceived = true; let anyReceived = false;
      for (const pol of po.lines) {
        const ordered = Number(pol.qty || 0);
        const rcv = Number(sumBy[pol.id] || 0);
        if (rcv > 0) anyReceived = true;
        if (rcv < ordered) allReceived = false;
      }
      const nextStatus = allReceived ? 'received' : (anyReceived ? 'partial' : 'not_received');
      await tx.goodsReceipt.update({ where: { id: gr.id }, data: { status: nextStatus } });
      // Mettre à jour le statut du PO si tout reçu
      if (allReceived && po.status !== 'received') {
        await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: 'received' } });
      }

      return { goodsReceiptId: gr.id, entryId: entry.id, status: nextStatus };
    });

    await logAuditEvent({ tenantId, action: 'Réception enregistrée', entity: 'goods_receipt', entityId: result.goodsReceiptId, metadata: { poId: po.id, entryId: result.entryId, status: result.status } }, request);

    const response = { id: result.goodsReceiptId, poId: po.id, entryId: result.entryId, status: result.status };
    if (idem) {
      await db.idempotencyKey.create({ data: { tenantId, key: idem, action, entity: 'goods_receipt', entityId: response.id, response } });
    }
    return NextResponse.json(response, { status: 201 });
  } catch (e) {
    console.error('POST /api/tenant/purchases/orders/[id]/receive', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


