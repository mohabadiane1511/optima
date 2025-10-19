import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';

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

// Remarque: Implémentation JSON de l'aperçu pour la modale; génération PDF réelle à venir
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    const db = prisma as any;
    const rfq = await db.rfq.findFirst({ where: { id: params.id, tenantId }, include: { lines: true, offers: true } });
    if (!rfq) return NextResponse.json({ error: 'RFQ introuvable' }, { status: 404 });

    const totals = rfq.lines.reduce((acc: any, l: any) => {
      const qty = Number(l.quantity || 0);
      const unit = Number(l.estimatedPrice || 0);
      const rate = Number(l.taxRate || 0);
      const totalHT = qty * unit;
      const totalTVA = totalHT * (rate / 100);
      const totalTTC = totalHT + totalTVA;
      acc.totalHT += totalHT; acc.totalTVA += totalTVA; acc.totalTTC += totalTTC; return acc;
    }, { totalHT: 0, totalTVA: 0, totalTTC: 0 });

    return NextResponse.json({
      title: 'Résumé RFQ',
      rfq: {
        id: rfq.id,
        status: rfq.status,
        note: rfq.note,
        suppliers: rfq.suppliers || [],
        createdAt: rfq.createdAt,
      },
      lines: rfq.lines,
      offers: rfq.offers,
      totals: {
        totalHT: totals.totalHT,
        totalTVA: totals.totalTVA,
        totalTTC: totals.totalTTC,
      }
    });
  } catch (e) {
    console.error('GET /api/tenant/purchases/rfqs/[id]/pdf error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


