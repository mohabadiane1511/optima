import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

const db = prisma as any;

function requireSA(request: NextRequest) {
  const token = request.cookies.get('sa_session')?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== 'superadmin') {
    return { ok: false as const, res: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }
  return { ok: true as const };
}

// PATCH /api/admin/billing/invoices/[id]
// Body: { action: 'markPaid' | 'markCancelled' | 'markIssued' }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireSA(request);
  if (!auth.ok) return auth.res;
  try {
    const body = await (async () => { try { return await request.json(); } catch { return {}; } })();
    const action = body?.action as string;
    if (!action) return NextResponse.json({ error: 'Action requise' }, { status: 400 });

    let data: any = {};
    const now = new Date();
    if (action === 'markPaid') {
      data = { status: 'paid', paidAt: now };
    } else if (action === 'markCancelled') {
      data = { status: 'cancelled', paidAt: null };
    } else if (action === 'markIssued') {
      data = { status: 'issued', paidAt: null };
    } else {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    const invoice = await db.billingInvoice.update({ where: { id: params.id }, data });
    return NextResponse.json(invoice);
  } catch (e) {
    console.error('PATCH invoice error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


