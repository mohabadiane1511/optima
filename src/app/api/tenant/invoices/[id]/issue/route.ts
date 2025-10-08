import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';


async function resolveTenantId(request: NextRequest): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  if (raw) { try { const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as any; if (p?.tenantId) return p.tenantId; } catch {} }
  let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (!tenantSlug && process.env.NODE_ENV !== 'production') tenantSlug = request.headers.get('x-tenant-slug') || process.env.DEFAULT_TENANT_SLUG || undefined;
  if (!tenantSlug) return null;
  const t = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  return t?.id || null;
}

function generateNumber(date = new Date(), seq: number) {
  const y = date.getFullYear();
  return `INV-${y}-${String(seq).padStart(4, '0')}`;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });

    const inv = await prisma.invoice.findFirst({ where: { id: params.id, tenantId }, include: { lines: true } });
    if (!inv) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    if (inv.status !== 'draft') return NextResponse.json({ error: 'Déjà émise ou annulée' }, { status: 400 });
    if (!inv.lines.length) return NextResponse.json({ error: 'Aucune ligne' }, { status: 400 });

    // simple séquence: compter les factures de l’année courante
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const countYear = await prisma.invoice.count({ where: { tenantId, issueDate: { gte: yearStart } } });
    const number = generateNumber(new Date(), countYear + 1);

    const updated = await prisma.invoice.update({
      where: { id: inv.id },
      data: { status: 'sent', issueDate: new Date(), number },
      select: { id: true, number: true, status: true, issueDate: true }
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('POST /api/tenant/invoices/[id]/issue', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


