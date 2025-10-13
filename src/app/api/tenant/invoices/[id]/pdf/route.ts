export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fetch from 'node-fetch';

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
    } catch { }
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
    // Logo (si disponible)
    let logoHeight = 0;
    let logoWidth = 0;
    if (tenant.logoUrl) {
      try {
        // Télécharger l'image depuis Cloudinary
        const response = await fetch(tenant.logoUrl);
        if (response.ok) {
          const imageBytes = await response.arrayBuffer();
          const logoImage = await pdfDoc.embedPng(imageBytes);

          // Redimensionner le logo (max 80x80)
          const maxSize = 80;
          const aspectRatio = logoImage.width / logoImage.height;

          if (aspectRatio > 1) {
            logoWidth = maxSize;
            logoHeight = maxSize / aspectRatio;
          } else {
            logoHeight = maxSize;
            logoWidth = maxSize * aspectRatio;
          }

          // Dessiner le logo en haut à gauche (à la place de l'ancien titre)
          page.drawImage(logoImage, {
            x: marginX,
            y: height - 70 - logoHeight,
            width: logoWidth,
            height: logoHeight,
          });
        }
      } catch (e) {
        console.warn('Impossible de charger le logo:', e);
      }
    }

    // Titre principal centré
    const title = 'FACTURE';
    const titleSize = 28;
    const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);
    const titleX = (width - titleWidth) / 2;
    page.drawText(title, { x: titleX, y: height - 70, size: titleSize, font: boldFont, color: gray(0.1) });

    const numText = clean(inv.number || '(brouillon)');
    const numSize = 12;
    const numWidth = font.widthOfTextAtSize(numText, numSize);
    const numX = (width - numWidth) / 2;
    page.drawText(numText, { x: numX, y: height - 95, size: numSize, font, color: gray(0.4) });

    // (Infos entreprise affichées plus bas dans un encadré dédié)

    // (Déplacé) Informations légales → Footer

    // Statu
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

    // --- ENTREPRISE + DATES (rangée 1) puis CLIENT (rangée 2) ---
    const sectionTop = height - 200; // zone des encadrés
    const baseBoxH = 80;
    const boxH = baseBoxH; // hauteur par défaut pour les cadres standards (ex: CLIENT)
    const boxW = (width - marginX * 2 - 10) / 2;

    // Calcul de la hauteur nécessaire pour le bloc ENTREPRISE
    let entLinesHeight = 0;
    entLinesHeight += 15; // nom
    const aLines = tenant.address ? clean(tenant.address).split('\n').filter(l => l.trim()).length : 0;
    entLinesHeight += aLines * 12;
    if (tenant.contactEmail) entLinesHeight += 12;
    if (tenant.contactPhone) entLinesHeight += 12;
    if (tenant.website) entLinesHeight += 12;
    const entBoxH = Math.max(baseBoxH, 35 + entLinesHeight + 12); // 35 marge haute (titre + espace), 12 padding bas

    // Hauteur du bloc DATES
    const datesLines = 2; // emission + echeance
    const datesBoxH = Math.max(baseBoxH, 35 + datesLines * 12 + 12);

    // Hauteur de rangée 1 = max des deux
    const row1H = Math.max(entBoxH, datesBoxH);

    // Box ENTREPRISE (gauche, rangée 1)
    page.drawRectangle({ x: marginX, y: sectionTop - row1H, width: boxW, height: row1H, borderColor: gray(0.75), borderWidth: 1 });
    page.drawText('ENTREPRISE', { x: marginX + 10, y: sectionTop - 15, size: 10, font: boldFont, color: gray(0.3) });
    let entY = sectionTop - 35;
    page.drawText(clean(tenant.name || 'Entreprise'), { x: marginX + 10, y: entY, size: 11, font: boldFont, color: gray(0.1) });
    entY -= 15;
    if (tenant.address) {
      const aTextLines = clean(tenant.address).split('\n');
      for (const line of aTextLines) {
        if (!line.trim()) continue;
        page.drawText(clean(line), { x: marginX + 10, y: entY, size: 9, font, color: gray(0.4) });
        entY -= 12;
      }
    }
    if (tenant.contactEmail) { page.drawText(clean(tenant.contactEmail), { x: marginX + 10, y: entY, size: 9, font, color: gray(0.4) }); entY -= 12; }
    if (tenant.contactPhone) { page.drawText(clean(tenant.contactPhone), { x: marginX + 10, y: entY, size: 9, font, color: gray(0.4) }); entY -= 12; }
    if (tenant.website) { page.drawText(clean(tenant.website), { x: marginX + 10, y: entY, size: 9, font, color: gray(0.4) }); }

    // Box DATES (droite, rangée 1)
    const dateX = marginX + boxW + 10;
    page.drawRectangle({ x: dateX, y: sectionTop - row1H, width: boxW, height: row1H, borderColor: gray(0.75), borderWidth: 1 });
    page.drawText('DATES', { x: dateX + 10, y: sectionTop - 15, size: 10, font: boldFont, color: gray(0.3) });
    const issue = inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('fr-FR') : '-';
    const due = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('fr-FR') : '-';
    page.drawText(clean(`Emission : ${issue}`), { x: dateX + 10, y: sectionTop - 35, size: 10, font, color: gray(0.2) });
    page.drawText(clean(`Echeance : ${due}`), { x: dateX + 10, y: sectionTop - 50, size: 10, font, color: gray(0.2) });

    // Box CLIENT (gauche, rangée 2)
    const secondTop = sectionTop - row1H - 20;
    page.drawRectangle({ x: marginX, y: secondTop - boxH, width: boxW, height: boxH, borderColor: gray(0.75), borderWidth: 1 });
    page.drawText('CLIENT', { x: marginX + 10, y: secondTop - 15, size: 10, font: boldFont, color: gray(0.3) });
    page.drawText(clean(inv.customer?.name || 'Client inconnu'), { x: marginX + 10, y: secondTop - 35, size: 11, font: boldFont, color: gray(0.1) });
    if (inv.customer?.email) page.drawText(clean(inv.customer.email), { x: marginX + 10, y: secondTop - 50, size: 9, font, color: gray(0.4) });

    // ===== TABLE LAYOUT AUTO =====
    const tableX = marginX;
    const tableW = width - marginX * 2;
    const headerH = 24;
    const rowH = 20;
    const pad = 8;

    type Align = 'left' | 'center' | 'right';
    const cols = [
      { key: 'name', header: 'Article', w: 0.33, align: 'left' as Align },
      { key: 'sku', header: 'SKU', w: 0.20, align: 'left' as Align },
      { key: 'qty', header: 'Qte', w: 0.07, align: 'center' as Align },
      { key: 'pu', header: 'PU HT', w: 0.12, align: 'right' as Align },
      { key: 'tva', header: 'TVA %', w: 0.07, align: 'right' as Align },
      { key: 'ttc', header: 'Montant TTC (FCFA)', w: 0.21, align: 'right' as Align },
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

    // Démarrer le tableau sous la seconde rangée (CLIENT)
    let y = secondTop - boxH - 30;

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

    row('Total HT', money(totalHT));
    row('TVA', money(totalTVA));
    row('Total TTC', money(totalTTC), true);
    row('Paye', money(paid));
    row('Solde', money(balance), true);

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
      row('Methode', clean(methodLabel));
    }

    // --- FOOTER ---
    page.drawLine({ start: { x: marginX, y: 70 }, end: { x: width - marginX, y: 70 }, thickness: 0.5, color: gray(0.85) });

    // RC / NINEA à gauche dans le footer
    let footerY = 58;
    if (tenant.businessRegistration) {
      page.drawText(clean(`RC: ${tenant.businessRegistration}`), { x: marginX, y: footerY, size: 9, font, color: gray(0.45) });
      footerY -= 12;
    }
    if (tenant.ninea) {
      page.drawText(clean(`NINEA: ${tenant.ninea}`), { x: marginX, y: footerY, size: 9, font, color: gray(0.45) });
    }

    // Date au centre
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


