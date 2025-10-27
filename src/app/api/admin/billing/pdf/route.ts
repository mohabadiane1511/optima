import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { computePlanBilling } from '@/lib/billing';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('sa_session')?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || '';
    const period = searchParams.get('period') || '';
    const frequency = (searchParams.get('frequency') || 'monthly') as 'monthly' | 'annual';
    if (!tenantId || !period) {
      return new Response(JSON.stringify({ error: 'tenantId et period requis' }), { status: 400 });
    }

    const preview = await computePlanBilling({ tenantId, period, frequency });

    // --- PDF (pdf-lib) ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 50;
    const gray = (v: number) => rgb(v, v, v);
    const clean = (t: string) => (t || '')
      .normalize('NFKD')
      .replace(/[\u202F\u00A0]/g, ' ')
      .replace(/[^\x00-\x7F]/g, '');
    const money = (v: number) => clean(`${new Intl.NumberFormat('fr-FR').format(Number(v || 0))} FCFA`);

    // Header
    const title = 'FACTURE PLAN OPTIMA ERP';
    const titleSize = 20;
    const titleWidth = bold.widthOfTextAtSize(title, titleSize);
    page.drawText(title, { x: (width - titleWidth) / 2, y: height - 60, size: titleSize, font: bold, color: gray(0.12) });
    page.drawRectangle({ x: 0, y: height - 80, width, height: 2, color: gray(0.85) });

    // Meta (gauche)
    let y = height - 110;
    const meta = (label: string, value: string, strong = false) => {
      page.drawText(label, { x: margin, y, size: 10, font: bold, color: gray(0.35) });
      page.drawText(value, { x: margin + 140, y, size: strong ? 11 : 10, font: strong ? bold : font, color: gray(0.12) });
      y -= 16;
    };
    meta('Plan', clean(`${preview.plan.name} [${preview.plan.code}]`), true);
    meta('Période', clean(`${preview.period} (${preview.frequency === 'annual' ? 'Annuel' : 'Mensuel'})`));
    meta('Utilisateurs actifs', String(preview.numbers.activeUsers));
    meta('Inclus', String(preview.numbers.includedUsers));
    meta('Extras', String(preview.numbers.extrasCount));

    // Table
    y -= 10;
    const tableX = margin;
    const tableW = width - margin * 2;
    const headerH = 22;
    const rowH = 20;
    const pad = 8;
    const cols = [
      { header: 'Libellé', w: 0.55 as const, align: 'left' as const },
      { header: 'Qté', w: 0.1 as const, align: 'center' as const },
      { header: 'PU', w: 0.15 as const, align: 'right' as const },
      { header: 'Montant', w: 0.2 as const, align: 'right' as const },
    ];
    const colPos = cols.reduce<{ left: number; right: number; width: number }[]>((acc, c, i) => {
      const left = i === 0 ? tableX : acc[i - 1].right;
      const wpx = c.w * tableW;
      acc.push({ left, right: left + wpx, width: wpx });
      return acc;
    }, []);

    // Header band
    page.drawRectangle({ x: tableX, y, width: tableW, height: headerH, color: gray(0.1) });
    cols.forEach((c, i) => {
      const pos = colPos[i];
      const size = 10;
      let x = pos.left + pad;
      const header = clean(c.header);
      if (c.align === 'right') x = pos.right - pad - bold.widthOfTextAtSize(header, size);
      if (c.align === 'center') x = pos.left + (pos.width - bold.widthOfTextAtSize(header, size)) / 2;
      page.drawText(header, { x, y: y + 6, size, font: bold, color: rgb(1, 1, 1) });
    });
    y -= headerH;

    const drawRow = (cells: [string, string, string, string], idx: number) => {
      if (idx % 2 === 0) page.drawRectangle({ x: tableX, y: y - rowH, width: tableW, height: rowH, color: gray(0.97) });
      cells.forEach((val, i) => {
        const pos = colPos[i];
        const size = 10;
        let x = pos.left + pad;
        const txt = clean(val);
        const w = font.widthOfTextAtSize(txt, size);
        if (cols[i].align === 'right') x = pos.right - pad - w;
        if (cols[i].align === 'center') x = pos.left + (pos.width - w) / 2;
        page.drawText(txt, { x, y: y + 4, size, font, color: gray(0.12) });
      });
      y -= rowH;
    };

    const unitExtra = preview.numbers.extrasCount > 0 ? Number(preview.amounts.extras || 0) / preview.numbers.extrasCount : 0;
    drawRow([`Abonnement plan ${preview.plan.name}`, '1', money(preview.amounts.base), money(preview.amounts.base)], 0);
    if (preview.numbers.extrasCount > 0) {
      drawRow(['Utilisateurs supplémentaires', String(preview.numbers.extrasCount), money(unitExtra), money(preview.amounts.extras)], 1);
    }

    // Totaux
    y -= 12;
    const totalsW = 240;
    const boxX = width - margin - totalsW;
    const boxY = Math.max(y - 80, margin + 60);
    page.drawRectangle({ x: boxX, y: boxY, width: totalsW, height: 72, color: gray(0.97), borderColor: gray(0.85), borderWidth: 1 });
    const labelX = boxX + 12;
    const valueX = boxX + totalsW - 12;
    const totalRow = (label: string, value: string, strong = false, ry: number) => {
      page.drawText(label, { x: labelX, y: ry, size: strong ? 11 : 10, font: strong ? bold : font, color: gray(strong ? 0.15 : 0.35) });
      const wv = (strong ? bold : font).widthOfTextAtSize(value, strong ? 11 : 10);
      page.drawText(value, { x: valueX - wv, y: ry, size: strong ? 11 : 10, font: strong ? bold : font, color: gray(0.12) });
    };
    totalRow('Base', money(preview.amounts.base), false, boxY + 48);
    totalRow('Extras', money(preview.amounts.extras), false, boxY + 30);
    totalRow('Total', money(preview.amounts.total), true, boxY + 12);

    // Footer
    page.drawLine({ start: { x: margin, y: 60 }, end: { x: width - margin, y: 60 }, thickness: 0.5, color: gray(0.85) });
    page.drawText(clean(`Document généré le ${new Date().toLocaleString('fr-FR')}`), { x: margin, y: 46, size: 9, font, color: gray(0.5) });

    const bytes = await pdfDoc.save();
    return new Response(bytes as any, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="facture_${preview.period}.pdf"` },
    });
  } catch (e: any) {
    console.error('Erreur génération PDF facturation:', e);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500 });
  }
}


