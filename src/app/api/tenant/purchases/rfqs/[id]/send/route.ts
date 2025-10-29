import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';

export const revalidate = 0;

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

export async function POST(request: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const db = prisma as any;

    const { id } = await (ctx.params as any);
    
    // Idempotence
    const idemKey = request.headers.get('x-idempotency-key');
    const action = 'rfq.send';
    if (idemKey) {
      const existing = await db.idempotencyKey.findFirst({ where: { tenantId, key: idemKey, action } });
      if (existing?.response) {
        return new NextResponse(JSON.stringify(existing.response), { status: 200, headers: { 'content-type': 'application/json', 'x-idempotent': 'true' } });
      }
    }

    // Récupérer RFQ avec lignes et infos
    const rfq = await db.rfq.findFirst({ 
      where: { id, tenantId }, 
      include: { lines: { orderBy: { createdAt: 'asc' }, select: { item: true, quantity: true, estimatedPrice: true, taxRate: true } } }
    });
    if (!rfq) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    if (rfq.status !== 'draft') return NextResponse.json({ error: 'Déjà envoyée ou clôturée' }, { status: 400 });

    const body = await request.json();
    const { subject, message, to } = body as any;

    // Construire un PDF résumé et l'attacher
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();
    const margin = 50;
    const clean = (t: string) => (t || '').normalize('NFKD').replace(/[\u202F\u00A0]/g, ' ').replace(/[^\x00-\x7F]/g, '');
    const draw = (txt: string, opts: any) => page.drawText(clean(txt), opts);

    draw('DEMANDE DE PRIX', { x: margin, y: height - 70, size: 22, font: bold, color: rgb(0.1, 0.1, 0.1) });
    draw(rfq.id.substring(0, 8).toUpperCase(), { x: margin, y: height - 95, size: 12, font, color: rgb(0.4, 0.4, 0.4) });
    draw('Fournisseurs:', { x: margin, y: height - 125, size: 10, font: bold });
    draw((rfq.suppliers || []).join(', '), { x: margin + 90, y: height - 125, size: 10, font });

    const tableTop = height - 160;
    const cols = [0.55, 0.15, 0.15, 0.15];
    const tableW = width - margin * 2;
    const colX = [margin, margin + cols[0] * tableW, margin + (cols[0] + cols[1]) * tableW, margin + (cols[0] + cols[1] + cols[2]) * tableW];
    const rowH = 18;
    const header = ['Article / Service', 'Qté', 'Prix estimé', 'Total'];
    header.forEach((h, i) => { draw(h, { x: colX[i] + 2, y: tableTop, size: 10, font: bold }); });
    let yTable = tableTop - rowH; let totalEst = 0;
    const money = (n: number) => clean(new Intl.NumberFormat('fr-FR').format(Math.round(n))) + ' FCFA';
    (rfq.lines || []).forEach((l: any) => {
      const lineTotal = Number(l.quantity) * Number(l.estimatedPrice) * (1 + Number(l.taxRate || 0) / 100);
      totalEst += lineTotal;
      const vals = [l.item, String(l.quantity), money(l.estimatedPrice), money(lineTotal)];
      vals.forEach((v, i) => draw(v, { x: colX[i] + 2, y: yTable, size: 10, font }));
      yTable -= rowH;
    });
    draw('Total estimé:', { x: colX[2] + 2, y: yTable - 6, size: 10, font: bold });
    draw(money(totalEst), { x: colX[3] + 2, y: yTable - 6, size: 10, font });

    const pdfBytes = await pdf.save();

    // Déterminer la liste cible et envoyer
    const { sendMail } = await import('@/lib/mailer');
    const recipients = String(to || '').trim() ? String(to).split(',').map((s: string) => s.trim()).filter(Boolean) : rfq.suppliers;
    for (const supplier of recipients) {
      await sendMail({
        to: supplier,
        subject: subject || `Demande de prix ${rfq.id.substring(0, 8)}`,
        text: message,
        html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
        attachments: [{ filename: `${rfq.id.substring(0,8)}-resume.pdf`, content: Buffer.from(pdfBytes) }]
      });
    }

    // Mettre à jour statut après envoi réussi
    const updated = await db.rfq.update({ where: { id: rfq.id }, data: { status: 'sent' }, select: { id: true, status: true } });
    await logAuditEvent({ tenantId, action: 'rfq.sent', entity: 'rfq', entityId: rfq.id, metadata: { suppliers: recipients } }, request);

    const response = { id: rfq.id, status: updated.status };
    if (idemKey) {
      await db.idempotencyKey.create({ data: { tenantId, key: idemKey, action, entity: 'rfq', entityId: rfq.id, response } });
    }

    return NextResponse.json(response);
  } catch (e) {
    console.error('POST /api/tenant/purchases/rfqs/[id]/send error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


