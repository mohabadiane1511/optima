export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

async function resolveTenant(request: NextRequest) {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) {
    try {
      const payload = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as { tenantId?: string };
      if (payload?.tenantId) {
        const t = await (prisma as any).tenant.findUnique({ where: { id: payload.tenantId } });
        if (t) return t;
      }
    } catch {}
  }
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') tenantSlug = (request.headers.get('x-tenant-slug') as any) || (process.env.DEFAULT_TENANT_SLUG as any) || null;
  return tenantSlug ? await (prisma as any).tenant.findUnique({ where: { slug: tenantSlug } }) : null;
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await ctx.params;
      const tenant = await resolveTenant(request);
      if (!tenant) return new Response('Tenant introuvable', { status: 400 });
      const inv = await (prisma as any).invoice.findFirst({
        where: { id, tenantId: tenant.id },
        include: { customer: true, lines: true, payments: { orderBy: { createdAt: 'desc' } } },
      });
      if (!inv) return new Response('Introuvable', { status: 404 });
  
      // --- CREATE DOC ---
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595.28, 841.89]); // A4
      const pageSize = page.getSize();
      const width = pageSize.width;
      const height = pageSize.height;
  
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
      // --- HELPERS (encodage sûr) ---
      const clean = (t: string) =>
        (t || '')
          .normalize('NFKD')
          .replace(/[\u202F\u00A0]/g, ' ')
          .replace(/[^\x00-\x7F]/g, '');
  
      const money = (v: number) =>
        `${new Intl.NumberFormat('fr-FR').format(v)}`.replace(/[\u202F\u00A0]/g, ' ');
  
      const gray = (v: number) => rgb(v, v, v);
  
      const marginX = 50;
      const bottomMargin = 60;
  
      // --- HEADER ---
      page.drawText('FACTURE', { x: marginX, y: height - 70, size: 28, font: boldFont, color: gray(0.1) });
      page.drawText(clean(inv.number || '(brouillon)'), { x: marginX, y: height - 95, size: 12, font, color: gray(0.4) });
      page.drawText(clean(tenant.name || 'Entreprise'), { x: marginX, y: height - 115, size: 11, font: boldFont, color: gray(0.2) });
  
      // Status
      const statusText =
        inv.status === 'paid' ? 'PAYEE' :
        inv.status === 'draft' ? 'BROUILLON' :
        inv.status === 'overdue' ? 'ECHUE' :
        inv.status === 'cancelled' ? 'ANNULEE' : 'EMISE';
      const statusColor =
        inv.status === 'paid' ? gray(0.2) :
        inv.status === 'overdue' ? gray(0.3) :
        inv.status === 'cancelled' ? gray(0.6) :
        inv.status === 'draft' ? gray(0.4) : gray(0.25);
      const badge = { w: 90, h: 28 };
      page.drawRectangle({ x: width - marginX - badge.w, y: height - 90, width: badge.w, height: badge.h, color: statusColor });
      page.drawText(clean(statusText), { x: width - marginX - badge.w + 18, y: height - 80, size: 10, font: boldFont, color: rgb(1, 1, 1) });
  
      // --- CLIENT + DATES ---
      const sectionTop = height - 160;
      const boxH = 80;
      const boxW = (width - marginX * 2 - 10) / 2;
  
      page.drawRectangle({ x: marginX, y: sectionTop - boxH, width: boxW, height: boxH, borderColor: gray(0.75), borderWidth: 1 });
      page.drawText('CLIENT', { x: marginX + 10, y: sectionTop - 15, size: 10, font: boldFont, color: gray(0.3) });
      page.drawText(clean(inv.customer?.name || 'Client inconnu'), { x: marginX + 10, y: sectionTop - 35, size: 11, font: boldFont, color: gray(0.1) });
      if (inv.customer?.email) page.drawText(clean(inv.customer.email), { x: marginX + 10, y: sectionTop - 50, size: 9, font, color: gray(0.4) });
  
      const dateX = marginX + boxW + 10;
      page.drawRectangle({ x: dateX, y: sectionTop - boxH, width: boxW, height: boxH, borderColor: gray(0.75), borderWidth: 1 });
      page.drawText('DATES', { x: dateX + 10, y: sectionTop - 15, size: 10, font: boldFont, color: gray(0.3) });
      const issue = inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('fr-FR') : '-';
      const due = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('fr-FR') : '-';
      page.drawText(clean(`Emission : ${issue}`), { x: dateX + 10, y: sectionTop - 35, size: 10, font, color: gray(0.2) });
      page.drawText(clean(`Echeance : ${due}`), { x: dateX + 10, y: sectionTop - 50, size: 10, font, color: gray(0.2) });
  
      // ===== TABLE LAYOUT AUTO =====
      const tableX = marginX;
      const tableW = width - marginX * 2;
      const headerH = 24;
      const rowH = 20;
      const pad = 8;
  
      type Align = 'left' | 'center' | 'right';
      const cols = [
        { key: 'name',  header: 'Article',       w: 0.33, align: 'left'   as Align },
        { key: 'sku',   header: 'SKU',           w: 0.20, align: 'left'   as Align },
        { key: 'qty',   header: 'Qte',           w: 0.07, align: 'center' as Align },
        { key: 'pu',    header: 'PU HT',         w: 0.12, align: 'right'  as Align },
        { key: 'tva',   header: 'TVA %',         w: 0.07, align: 'right'  as Align },
        { key: 'ttc',   header: 'Montant TTC (FCFA)',   w: 0.21, align: 'right'  as Align },
      ];
  
      // positions cumulées
      const colPos = cols.reduce<{ left: number; right: number; width: number }[]>((acc, c, i) => {
        const left = i === 0 ? tableX : acc[i - 1].right;
        const wpx = c.w * tableW;
        acc.push({ left, right: left + wpx, width: wpx });
        return acc;
      }, []);
  
      const textWidth = (t: string, size: number, f = font) => f.widthOfTextAtSize(t, size);
      const fitText = (raw: string, max: number, size: number, f = font) => {
        const t = clean(raw);
        if (textWidth(t, size, f) <= max) return t;
        const ell = '...';
        let lo = 0, hi = t.length;
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          const s = t.slice(0, mid) + ell;
          if (textWidth(s, size, f) <= max) lo = mid + 1; else hi = mid;
        }
        return t.slice(0, Math.max(0, lo - 1)) + ell;
      };
  
      const drawCell = (txt: string, colIdx: number, yTop: number, size = 9, f = font, align: Align = cols[colIdx].align) => {
        const pos = colPos[colIdx];
        const maxW = pos.width - pad * 2;
        const t = fitText(txt, maxW, size, f);
        let x = pos.left + pad;
        if (align === 'right') x = pos.right - pad - textWidth(t, size, f);
        if (align === 'center') x = pos.left + (pos.width - textWidth(t, size, f)) / 2;
        page.drawText(t, { x, y: yTop - (rowH - 12), size, font: f, color: gray(0.1) });
      };
  
      let y = sectionTop - boxH - 40;
  
      // header band
      page.drawRectangle({ x: tableX, y, width: tableW, height: headerH, color: gray(0.1) });
      cols.forEach((c, i) => {
        const pos = colPos[i];
        const label = clean(c.header);
        const size = 9;
        let x = pos.left + pad;
        if (c.align === 'right') x = pos.right - pad - textWidth(label, size, boldFont);
        if (c.align === 'center') x = pos.left + (pos.width - textWidth(label, size, boldFont)) / 2;
        page.drawText(label, { x, y: y + 6, size, font: boldFont, color: rgb(1, 1, 1) });
      });
  
      // table rows with auto layout + page break + zebra
      y -= headerH;
      const ensureSpace = () => {
        if (y - rowH < bottomMargin + 120) { // laisse la place au bloc totaux + footer
          page = pdfDoc.addPage([595.28, 841.89]);
          // redraw table header on new page
          y = height - 100;
          page.drawRectangle({ x: tableX, y, width: tableW, height: headerH, color: gray(0.1) });
          cols.forEach((c, i) => {
            const pos = colPos[i];
            const label = clean(c.header);
            const size = 9;
            let x = pos.left + pad;
            if (c.align === 'right') x = pos.right - pad - textWidth(label, size, boldFont);
            if (c.align === 'center') x = pos.left + (pos.width - textWidth(label, size, boldFont)) / 2;
            page.drawText(label, { x, y: y + 6, size, font: boldFont, color: rgb(1, 1, 1) });
          });
          y -= headerH;
        }
      };
  
      (inv.lines || []).forEach((l: any, i: number) => {
        ensureSpace();
  
        if (i % 2 === 0) {
          page.drawRectangle({ x: tableX, y: y - rowH, width: tableW, height: rowH, color: gray(0.97) });
        }
  
        const qty = Number(l.qty || 0);
        const unitPrice = Number(l.unitPrice || 0);
        const rate = Number(l.tvaRate || 0);
        const ttc = Number(l.totalTTC ?? qty * unitPrice * (1 + rate / 100));
  
        drawCell(l.name || 'Article', 0, y);
        drawCell(l.sku || '', 1, y);
        drawCell(String(qty), 2, y);
        drawCell(money(unitPrice), 3, y);
        drawCell(String(rate), 4, y);
        drawCell(money(ttc), 5, y);
  
        y -= rowH;
      });
  
      // ===== TOTALS (anti-recouvrement, auto-placement) =====
      const totalHT = Number(inv.totalHT || 0);
      const totalTVA = Number(inv.totalTVA || 0);
      const totalTTC = Number(inv.totalTTC || 0);
      const paid = (inv.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const balance = Math.max(0, totalTTC - paid);
  
      const totalsW = 230;
      const totalsH = 120;
  
      let boxY = y - 24 - totalsH;
      if (boxY < bottomMargin + 90) {
        // page break just for totals
        page = pdfDoc.addPage([595.28, 841.89]);
        boxY = height - 200 - totalsH;
      }
  
      const boxX = width - marginX - totalsW;
      page.drawRectangle({ x: boxX, y: boxY, width: totalsW, height: totalsH, color: gray(0.97), borderColor: gray(0.8), borderWidth: 1 });
  
      const labelX = boxX + 12;
      const valueX = boxX + totalsW - 12;
      let curY = boxY + totalsH - 20;
      const step = 16;
  
      const row = (label: string, value: string, strong = false) => {
        const l = clean(label);
        const v = clean(value);
        page.drawText(l, { x: labelX, y: curY, size: 10, font: strong ? boldFont : font, color: gray(0.35) });
        const wv = textWidth(v, strong ? 10.5 : 10, strong ? boldFont : font);
        page.drawText(v, { x: valueX - wv, y: curY, size: strong ? 10.5 : 10, font: strong ? boldFont : font, color: gray(0.1) });
        curY -= step;
      };
  
      row('Total HT',  money(totalHT));
      row('TVA',       money(totalTVA));
      row('Total TTC', money(totalTTC), true);
      row('Paye',      money(paid));
      row('Solde',     money(balance), true);

      // Payment method (if there are payments)
      if (inv.payments && inv.payments.length > 0) {
        const latestPayment = inv.payments[0];
        const methodLabels: { [key: string]: string } = {
          'cash': 'Espèces',
          'mobile': '(Wave, Orange Money)',
          'card': 'Carte bancaire',
          'transfer': 'Virement bancaire'
        };
        
        const methodLabel = methodLabels[latestPayment.method] || latestPayment.method;
        row('Methode',  clean(methodLabel));
      }

      // --- FOOTER ---
      page.drawLine({ start: { x: marginX, y: 70 }, end: { x: width - marginX, y: 70 }, thickness: 0.5, color: gray(0.85) });
      page.drawText(clean(`Document genere le ${new Date().toLocaleString('fr-FR')}`), { x: width / 2 - 100, y: 50, size: 9, font, color: gray(0.5) });
  
      // --- OUTPUT ---
      const pdfBytes = await pdfDoc.save();
      return new Response(pdfBytes as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${inv.number || 'facture'}.pdf"`,
        },
      });
    } catch (e: any) {
      console.error('PDF generation error', e);
      return new Response('Erreur PDF: ' + (e?.message || 'inconnue'), { status: 500 });
    }
  }
  
  
