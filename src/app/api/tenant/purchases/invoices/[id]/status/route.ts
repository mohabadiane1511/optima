import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

// PATCH /api/tenant/purchases/invoices/[id]/status
// Body: { status: 'posted' | 'cancelled', number?, invoiceDate?, dueDate?, note?, attachment?: { url, publicId, name, size } }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const db = prisma as any;

    const body = await request.json();
    const status = String(body?.status || '').trim();
    if (!['posted','cancelled'].includes(status)) return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });

    const before = await db.supplierInvoice.findFirst({ where: { id: params.id, tenantId } });
    if (!before) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

    // Mettre à jour les champs éditables (numéro, dates, note, pièce jointe) avant changement de statut
    const dataUpdate: any = {};
    if (typeof body?.number === 'string') dataUpdate.number = body.number.trim() || null;
    if (body?.invoiceDate) dataUpdate.invoiceDate = new Date(body.invoiceDate);
    if (body?.dueDate) dataUpdate.dueDate = new Date(body.dueDate);
    if (typeof body?.note === 'string') dataUpdate.note = body.note.trim() || null;
    if (body?.attachment && typeof body.attachment === 'object') {
      dataUpdate.attachmentUrl = body.attachment.url || null;
      dataUpdate.attachmentPublicId = body.attachment.publicId || null;
      dataUpdate.attachmentName = body.attachment.name || null;
      dataUpdate.attachmentSize = Number.isFinite(Number(body.attachment.size)) ? Number(body.attachment.size) : null;
      dataUpdate.uploadedAt = new Date();
    }

    // Règles de transition
    if (status === 'posted') {
      if (!dataUpdate.attachmentUrl && !before.attachmentUrl) {
        return NextResponse.json({ error: 'PDF obligatoire pour valider la facture' }, { status: 400 });
      }
      // autorisé uniquement depuis draft
      if (before.status !== 'draft') return NextResponse.json({ error: 'Transition non autorisée' }, { status: 400 });
      // Numérotation automatique FA-YYYY-0001 (par tenant et par année)
      const year = new Date().getFullYear();
      const yearStart = new Date(year, 0, 1);
      const countYear = await db.supplierInvoice.count({ where: { tenantId, invoiceDate: { gte: yearStart }, status: { in: ['posted','paid'] } } });
      const seq = String(countYear + 1).padStart(4, '0');
      const number = `FA-${year}-${seq}`;
      dataUpdate.number = dataUpdate.number || before.number || number;
      dataUpdate.status = 'posted';
    } else if (status === 'cancelled') {
      if (before.status !== 'draft') return NextResponse.json({ error: 'Annulation autorisée uniquement à l\'état brouillon' }, { status: 400 });
      dataUpdate.status = 'cancelled';
    }

    const updated = await db.supplierInvoice.update({ where: { id: before.id }, data: dataUpdate });
    const actionText = dataUpdate.status === 'posted' ? 'Facture fournisseur validée' : 'Facture fournisseur annulée';
    await logAuditEvent({ tenantId, action: actionText, entity: 'supplier_invoice', entityId: before.id, before, after: updated }, request);

    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (e) {
    console.error('PATCH /api/tenant/purchases/invoices/[id]/status', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


