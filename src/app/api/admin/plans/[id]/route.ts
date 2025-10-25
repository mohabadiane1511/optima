import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

const db = prisma as any;

function requireSA(request: NextRequest) {
  const token = request.cookies.get('sa_session')?.value;
  const payload = token ? verifyToken(token) : null;
  return !!(payload && payload.role === 'superadmin');
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!requireSA(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const plan = await db.plan.findUnique({ where: { id: params.id } });
    if (!plan) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!requireSA(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const body = await request.json();
    const { name, priceMonthlyFCFA, priceYearlyFCFA, includedUsers, extraUserCreationFeeFCFA, extraUserMonthlyFeeFCFA, modules } = body || {};
    const updated = await db.plan.update({
      where: { id: params.id },
      data: {
        ...(name != null ? { name } : {}),
        ...(priceMonthlyFCFA != null ? { priceMonthlyFCFA: Number(priceMonthlyFCFA) } : {}),
        ...(priceYearlyFCFA != null ? { priceYearlyFCFA: Number(priceYearlyFCFA) } : {}),
        ...(includedUsers != null ? { includedUsers: Number(includedUsers) } : {}),
        ...(extraUserCreationFeeFCFA != null ? { extraUserCreationFeeFCFA: Number(extraUserCreationFeeFCFA) } : {}),
        ...(extraUserMonthlyFeeFCFA != null ? { extraUserMonthlyFeeFCFA: Number(extraUserMonthlyFeeFCFA) } : {}),
        ...(Array.isArray(modules) ? { modules } : {}),
      }
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!requireSA(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    await db.plan.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


