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
    // Chercher facture persistée pour le numéro
    const db = (await import('@/lib/prisma')).prisma as any;
    const invoice = await db.billingInvoice.findUnique({ where: { tenantId_period: { tenantId, period } } });
    const invoiceNumber = invoice?.invoiceNumber || null;
    
    // Récupérer les informations de l'entreprise
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });

    // --- PDF (pdf-lib) - Design Amélioré ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 40;
    
    // Palette de couleurs professionnelle
    const primaryBlue = rgb(0.2, 0.4, 0.7); // Bleu professionnel
    const darkBlue = rgb(0.15, 0.3, 0.55);
    const lightBlue = rgb(0.93, 0.95, 0.98);
    const accentGray = rgb(0.4, 0.4, 0.4);
    const darkGray = rgb(0.2, 0.2, 0.2);
    const lightGray = rgb(0.95, 0.95, 0.95);
    const white = rgb(1, 1, 1);
    
    const clean = (t: string) => (t || '')
      .normalize('NFKD')
      .replace(/[\u202F\u00A0]/g, ' ')
      .replace(/[^\x00-\x7F]/g, '');
    const money = (v: number) => clean(`${new Intl.NumberFormat('fr-FR').format(Number(v || 0))} FCFA`);

    // === HEADER BAND avec fond bleu ===
    const headerHeight = 120;
    page.drawRectangle({ 
      x: 0, 
      y: height - headerHeight, 
      width, 
      height: headerHeight, 
      color: primaryBlue 
    });

    // Logo/Nom entreprise (haut gauche)
    page.drawText('OPTIMA ERP', { 
      x: margin, 
      y: height - 45, 
      size: 24, 
      font: bold, 
      color: white 
    });
    
    page.drawText('Solution de gestion d\'entreprise', { 
      x: margin, 
      y: height - 65, 
      size: 10, 
      font, 
      color: rgb(0.9, 0.9, 0.9) 
    });

    // FACTURE titre (haut droite)
    const invoiceTitle = 'FACTURE';
    const invoiceTitleSize = 28;
    const invoiceTitleWidth = bold.widthOfTextAtSize(invoiceTitle, invoiceTitleSize);
    page.drawText(invoiceTitle, { 
      x: width - margin - invoiceTitleWidth, 
      y: height - 48, 
      size: invoiceTitleSize, 
      font: bold, 
      color: white 
    });

    // Numéro de facture (sous le titre FACTURE)
    if (invoiceNumber) {
      const numText = clean(invoiceNumber);
      const numWidth = font.widthOfTextAtSize(numText, 11);
      page.drawText(numText, { 
        x: width - margin - numWidth, 
        y: height - 70, 
        size: 11, 
        font, 
        color: rgb(0.95, 0.95, 0.95) 
      });
    }

    // === SECTION INFO (deux colonnes) ===
    let y = height - headerHeight - 35;

    // Colonne gauche - Informations destinataire (entreprise)
    page.drawText('A L\'ATTENTION DE', { 
      x: margin, 
      y, 
      size: 9, 
      font: bold, 
      color: primaryBlue 
    });
    y -= 18;
    
    if (tenant) {
      page.drawText(clean(tenant.name || 'Nom non spécifié'), { 
        x: margin, 
        y, 
        size: 11, 
        font: bold, 
        color: darkGray 
      });
      y -= 14;
      
      const tenantInfo = [];
      if (tenant.address) tenantInfo.push(clean(tenant.address));
      if (tenant.contactEmail) tenantInfo.push(`Email: ${clean(tenant.contactEmail)}`);
      if (tenant.contactPhone) tenantInfo.push(`Tel: ${clean(tenant.contactPhone)}`);
      
      tenantInfo.forEach(line => {
        page.drawText(clean(line), { 
          x: margin, 
          y, 
          size: 9, 
          font, 
          color: accentGray 
        });
        y -= 13;
      });
    }

    // Colonne droite - Détails facture
    y = height - headerHeight - 35;
    const rightCol = width - margin - 220;
    
    // Box avec fond léger pour les détails
    page.drawRectangle({ 
      x: rightCol - 10, 
      y: y - 100, 
      width: 230, 
      height: 110, 
      color: lightBlue,
      borderColor: primaryBlue,
      borderWidth: 1
    });

    page.drawText('DETAILS', { 
      x: rightCol, 
      y, 
      size: 9, 
      font: bold, 
      color: primaryBlue 
    });
    y -= 20;

    const detailItem = (label: string, value: string, bold_val = false) => {
      page.drawText(label + ':', { 
        x: rightCol, 
        y, 
        size: 9, 
        font, 
        color: accentGray 
      });
      const valFont = bold_val ? bold : font;
      const valSize = bold_val ? 10 : 9;
      const valWidth = valFont.widthOfTextAtSize(value, valSize);
      page.drawText(value, { 
        x: rightCol + 210 - valWidth, 
        y, 
        size: valSize, 
        font: valFont, 
        color: darkGray 
      });
      y -= 15;
    };

    detailItem('Plan', clean(`${preview.plan.name} [${preview.plan.code}]`), true);
    detailItem('Période', clean(preview.period));
    detailItem('Fréquence', preview.frequency === 'annual' ? 'Annuelle' : 'Mensuelle');
    detailItem('Date', new Date().toLocaleDateString('fr-FR'));

    // === SECTION UTILISATEURS ===
    y -= 25;
    page.drawLine({ 
      start: { x: margin, y }, 
      end: { x: width - margin, y }, 
      thickness: 0.5, 
      color: rgb(0.85, 0.85, 0.85) 
    });
    y -= 20;

    const userInfoBox = (label: string, value: string, xPos: number) => {
      const boxW = 150;
      page.drawRectangle({ 
        x: xPos, 
        y: y - 40, 
        width: boxW, 
        height: 45, 
        color: lightGray 
      });
      page.drawText(label, { 
        x: xPos + 10, 
        y: y - 15, 
        size: 9, 
        font, 
        color: accentGray 
      });
      page.drawText(value, { 
        x: xPos + 10, 
        y: y - 32, 
        size: 16, 
        font: bold, 
        color: primaryBlue 
      });
    };

    userInfoBox('Utilisateurs actifs', String(preview.numbers.activeUsers), margin);
    userInfoBox('Inclus dans le plan', String(preview.numbers.includedUsers), margin + 170);
    userInfoBox('Utilisateurs extras', String(preview.numbers.extrasCount), margin + 340);

    y -= 60;

    // === TABLEAU DÉTAILLÉ ===
    y -= 20;
    const tableX = margin;
    const tableW = width - margin * 2;
    const headerH = 32;
    const rowH = 35;
    const pad = 12;
    
    const cols = [
      { header: 'Description', w: 0.50, align: 'left' as const },
      { header: 'Quantité', w: 0.15, align: 'center' as const },
      { header: 'Prix Unitaire', w: 0.18, align: 'right' as const },
      { header: 'Montant', w: 0.17, align: 'right' as const },
    ];
    
    const colPos = cols.reduce<{ left: number; right: number; width: number }[]>((acc, c, i) => {
      const left = i === 0 ? tableX : acc[i - 1].right;
      const wpx = c.w * tableW;
      acc.push({ left, right: left + wpx, width: wpx });
      return acc;
    }, []);

    // En-tête du tableau avec fond bleu
    page.drawRectangle({ 
      x: tableX, 
      y, 
      width: tableW, 
      height: headerH, 
      color: darkBlue 
    });
    
    cols.forEach((c, i) => {
      const pos = colPos[i];
      const size = 10;
      let x = pos.left + pad;
      const header = clean(c.header);
      if (c.align === 'right') x = pos.right - pad - bold.widthOfTextAtSize(header, size);
      if (c.align === 'center') x = pos.left + (pos.width - bold.widthOfTextAtSize(header, size)) / 2;
      page.drawText(header, { 
        x, 
        y: y + 10, 
        size, 
        font: bold, 
        color: white 
      });
    });
    y -= headerH;

    // Lignes du tableau
    const drawRow = (cells: [string, string, string, string], idx: number, isLast = false) => {
      // Bordure gauche
      page.drawLine({ 
        start: { x: tableX, y }, 
        end: { x: tableX, y: y - rowH }, 
        thickness: 0.5, 
        color: rgb(0.85, 0.85, 0.85) 
      });
      // Bordure droite
      page.drawLine({ 
        start: { x: tableX + tableW, y }, 
        end: { x: tableX + tableW, y: y - rowH }, 
        thickness: 0.5, 
        color: rgb(0.85, 0.85, 0.85) 
      });
      
      cells.forEach((val, i) => {
        const pos = colPos[i];
        const size = 10;
        let x = pos.left + pad;
        const txt = clean(val);
        const w = font.widthOfTextAtSize(txt, size);
        if (cols[i].align === 'right') x = pos.right - pad - w;
        if (cols[i].align === 'center') x = pos.left + (pos.width - w) / 2;
        page.drawText(txt, { 
          x, 
          y: y + 11, 
          size, 
          font, 
          color: darkGray 
        });
      });
      
      // Ligne de séparation
      page.drawLine({ 
        start: { x: tableX, y: y - rowH }, 
        end: { x: tableX + tableW, y: y - rowH }, 
        thickness: isLast ? 1 : 0.5, 
        color: isLast ? rgb(0.7, 0.7, 0.7) : rgb(0.9, 0.9, 0.9) 
      });
      y -= rowH;
    };

    const unitExtra = preview.numbers.extrasCount > 0 ? Number(preview.amounts.extras || 0) / preview.numbers.extrasCount : 0;
    const hasExtras = preview.numbers.extrasCount > 0;
    
    drawRow([
      `Abonnement plan ${preview.plan.name}`, 
      '1', 
      money(preview.amounts.base), 
      money(preview.amounts.base)
    ], 0, !hasExtras);
    
    if (hasExtras) {
      drawRow([
        'Utilisateurs supplémentaires', 
        String(preview.numbers.extrasCount), 
        money(unitExtra), 
        money(preview.amounts.extras)
      ], 1, true);
    }

    // === SECTION TOTAUX (avec design moderne) ===
    y -= 20;
    const totalsW = 280;
    const boxX = width - margin - totalsW;
    const boxY = y - 110;

    // Box principal des totaux
    page.drawRectangle({ 
      x: boxX, 
      y: boxY, 
      width: totalsW, 
      height: 110, 
      color: white,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 1
    });

    const labelX = boxX + 20;
    const valueX = boxX + totalsW - 20;
    
    const totalRow = (label: string, value: string, strong = false, ry: number, bgColor?: any) => {
      if (bgColor) {
        page.drawRectangle({ 
          x: boxX, 
          y: ry - 5, 
          width: totalsW, 
          height: 28, 
          color: bgColor 
        });
      }
      
      page.drawText(label, { 
        x: labelX, 
        y: ry + 5, 
        size: strong ? 12 : 10, 
        font: strong ? bold : font, 
        color: strong ? white : accentGray 
      });
      
      const wv = (strong ? bold : font).widthOfTextAtSize(value, strong ? 14 : 10);
      page.drawText(value, { 
        x: valueX - wv, 
        y: ry + 5, 
        size: strong ? 14 : 10, 
        font: strong ? bold : font, 
        color: strong ? white : darkGray 
      });
    };

    totalRow('Sous-total', money(preview.amounts.base), false, boxY + 75);
    totalRow('Utilisateurs extras', money(preview.amounts.extras), false, boxY + 50);
    
    // Ligne de séparation
    page.drawLine({ 
      start: { x: boxX + 15, y: boxY + 38 }, 
      end: { x: boxX + totalsW - 15, y: boxY + 38 }, 
      thickness: 1, 
      color: primaryBlue 
    });
    
    // Total avec fond bleu
    totalRow('TOTAL À PAYER', money(preview.amounts.total), true, boxY + 10, primaryBlue);

    // === FOOTER ===
    const footerY = 70;
    page.drawLine({ 
      start: { x: margin, y: footerY }, 
      end: { x: width - margin, y: footerY }, 
      thickness: 0.5, 
      color: rgb(0.85, 0.85, 0.85) 
    });
    
    page.drawText(clean(`Document généré le ${new Date().toLocaleString('fr-FR')}`), { 
      x: margin, 
      y: footerY - 18, 
      size: 8, 
      font, 
      color: accentGray 
    });
    
    page.drawText('OPTIMA ERP - Merci de votre confiance', { 
      x: margin, 
      y: footerY - 32, 
      size: 8, 
      font, 
      color: accentGray 
    });

    // Numéro de page (centré)
    const pageNum = 'Page 1/1';
    const pageNumWidth = font.widthOfTextAtSize(pageNum, 8);
    page.drawText(pageNum, { 
      x: (width - pageNumWidth) / 2, 
      y: footerY - 25, 
      size: 8, 
      font, 
      color: accentGray 
    });

    const bytes = await pdfDoc.save();
    return new Response(bytes as any, {
      status: 200,
      headers: { 
        'Content-Type': 'application/pdf', 
        'Content-Disposition': `inline; filename="facture_${preview.period}.pdf"` 
      },
    });
  } catch (e: any) {
    console.error('Erreur génération PDF facturation:', e);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500 });
  }
}