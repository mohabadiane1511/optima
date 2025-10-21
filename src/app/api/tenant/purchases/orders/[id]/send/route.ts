import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';
import { sendMail } from '@/lib/mailer';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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

    // Idempotence
    const action = 'po.send';
    const key = request.headers.get('x-idempotency-key');
    if (key) {
      const existing = await db.idempotencyKey.findFirst({ where: { tenantId, key, action } });
      if (existing?.response) {
        return new NextResponse(JSON.stringify(existing.response), { status: 200, headers: { 'content-type': 'application/json', 'x-idempotent': 'true' } });
      }
    }

    const po = await db.purchaseOrder.findFirst({ where: { id: params.id, tenantId }, include: { lines: true } });
    if (!po) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    const { to, subject, message } = await (async () => { try { return await request.json(); } catch { return {} as any; } })();

    // Générer le PDF serveur avec le même template que /pdf
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true, logoUrl: true } });
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();
    const margin = 40;
    const clean = (t: string) => (t || '').replace(/[\u202F\u00A0]/g, ' ');
    const draw = (txt: string, opts: any) => page.drawText(clean(txt), opts);
    const line = (yPos: number) => page.drawLine({ start: { x: margin, y: yPos }, end: { x: width - margin, y: yPos }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

    if (tenant?.logoUrl) {
      try {
        const resp = await fetch(tenant.logoUrl);
        if (resp.ok) {
          const imgBytes = await resp.arrayBuffer();
          const img = await pdf.embedPng(imgBytes);
          const max = 80; const ar = img.width / img.height;
          const wImg = ar > 1 ? max : max * ar; const hImg = ar > 1 ? max / ar : max;
          page.drawImage(img, { x: margin, y: height - 10 - hImg, width: wImg, height: hImg });
        }
      } catch {}
    } else {
      draw(clean(tenant?.name || 'OPTIMA'), { x: margin, y: height - 50, size: 18, font: bold });
    }
    draw("Commande d'achat", { x: width - margin - 160, y: height - 50, size: 18, font: bold });
    draw(`N° ${String(po.id).substring(0,8).toUpperCase()}`, { x: width - margin - 160, y: height - 68, size: 10, font });
    line(height - 78);

    draw('Fournisseur', { x: margin, y: height - 100, size: 10, font: bold });
    draw(`${po.supplier}`, { x: margin, y: height - 114, size: 10, font });
    draw('Date', { x: width - margin - 160, y: height - 100, size: 10, font: bold });
    draw(`${new Date(po.createdAt).toLocaleDateString('fr-FR')}`, { x: width - margin - 160, y: height - 114, size: 10, font });

    const tableTop = height - 150;
    const w = width - 2 * margin;
    const col = [0.5, 0.1, 0.15, 0.1, 0.15];
    const x = [margin, margin + col[0] * w, margin + (col[0] + col[1]) * w, margin + (col[0] + col[1] + col[2]) * w, margin + (col[0] + col[1] + col[2] + col[3]) * w];
    const header = ['Désignation', 'Qté', 'PU', 'TVA %', 'Total TTC'];
    header.forEach((h, i) => draw(h, { x: x[i] + 2, y: tableTop, size: 10, font: bold }));
    line(tableTop - 6);

    let y = tableTop - 20;
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n || 0))).replace(/[\u202F\u00A0]/g, ' ') + ' FCFA';
    for (const l of po.lines) {
      const total = Number(l.qty) * Number(l.unitPrice) * (1 + Number(l.taxRate) / 100);
      draw(l.name, { x: x[0] + 2, y, size: 10, font });
      draw(String(Number(l.qty)), { x: x[1] + 2, y, size: 10, font });
      draw(fmt(Number(l.unitPrice)).replace(' FCFA',''), { x: x[2] + 2, y, size: 10, font });
      draw(String(Number(l.taxRate)), { x: x[3] + 2, y, size: 10, font });
      draw(fmt(total), { x: x[4] + 2, y, size: 10, font });
      y -= 16;
    }
    line(y - 6);
    draw('Total HT', { x: x[3] - 40, y: y - 22, size: 10, font: bold });
    draw(fmt(Number(po.totalHT)), { x: x[4] + 2, y: y - 22, size: 10, font: bold });
    draw('TVA', { x: x[3] - 40, y: y - 38, size: 10, font: bold });
    draw(fmt(Number(po.totalTVA)), { x: x[4] + 2, y: y - 38, size: 10, font: bold });
    draw('Total TTC', { x: x[3] - 40, y: y - 54, size: 12, font: bold });
    draw(fmt(Number(po.totalTTC)), { x: x[4] + 2, y: y - 54, size: 12, font: bold });

    page.drawLine({ start: { x: margin, y: 60 }, end: { x: width - margin, y: 60 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    draw('Document généré par Optima ERP - https://optima-erp.com', { x: width / 2 - 120, y: 48, size: 9, font: bold });

    const pdfBytes = await pdf.save();

    const summary = {
      id: po.id,
      supplier: po.supplier,
      totalTTC: Number(po.totalTTC || 0),
      lineCount: (po.lines || []).length,
    };

    await logAuditEvent({ tenantId, action: 'Commande d\'achat envoyée au fournisseur', entity: 'po', entityId: po.id, metadata: { summary } }, request);

    // Envoyer l'email si SMTP config
    const recipient = (typeof to === 'string' && to.includes('@')) ? to : (po.supplier?.includes('@') ? po.supplier : (process.env.SMTP_USER || ''));
    if (recipient) {
      await sendMail({
        to: recipient,
        subject: subject || `Commande d'achat ${po.id.substring(0,8).toUpperCase()}`,
        text: message || `Veuillez trouver ci-joint la commande d'achat ${po.id}. Total TTC: ${summary.totalTTC} FCFA`,
        attachments: [{ filename: `${po.id.substring(0,8)}-commande.pdf`, content: Buffer.from(pdfBytes) }]
      });
    }

    if (key) {
      await db.idempotencyKey.create({ data: { tenantId, key, action, entity: 'po', entityId: po.id, response: summary } });
    }

    return NextResponse.json(summary);
  } catch (e) {
    console.error('POST /api/tenant/purchases/orders/[id]/send', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


