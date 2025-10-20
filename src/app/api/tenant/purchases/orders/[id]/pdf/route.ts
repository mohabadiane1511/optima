import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fetch from 'node-fetch';

async function resolveTenantId(request: NextRequest): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) {
    try { const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as any; if (p?.tenantId) return p.tenantId; } catch {}
  }
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || null;
  if (!tenantSlug) return null;
  const db = prisma as any;
  const t = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  return t?.id || null;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return new Response('Tenant introuvable', { status: 400 });
    const db = prisma as any;
    const po = await db.purchaseOrder.findFirst({ where: { id: params.id, tenantId }, include: { lines: true } });
    if (!po) return new Response('Introuvable', { status: 404 });
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true, logoUrl: true } });

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();
    const margin = 40;
    const clean = (t: string) => (t || '').replace(/[\u202F\u00A0]/g, ' ');
    const draw = (txt: string, opts: any) => page.drawText(clean(txt), opts);
    const line = (y: number) => page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

    // Logo or tenant name
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

    // Supplier / date
    draw('Fournisseur', { x: margin, y: height - 100, size: 10, font: bold });
    draw(`${po.supplier}`, { x: margin, y: height - 114, size: 10, font });
    draw('Date', { x: width - margin - 160, y: height - 100, size: 10, font: bold });
    draw(`${new Date(po.createdAt).toLocaleDateString('fr-FR')}`, { x: width - margin - 160, y: height - 114, size: 10, font });

    // Table header
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

    // Footer
    page.drawLine({ start: { x: margin, y: 60 }, end: { x: width - margin, y: 60 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    draw('Document généré par Optima ERP - https://optima-erp.com', { x: width / 2 - 120, y: 48, size: 9, font: bold });

    const bytes = await pdf.save();
    return new Response(Buffer.from(bytes) as any, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${String(po.id).substring(0,8)}-commande.pdf"` } });
  } catch (e) {
    console.error('GET /api/tenant/purchases/orders/[id]/pdf', e);
    return new Response('Erreur serveur', { status: 500 });
  }
}


