import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

const db = prisma as any;

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('sa_session')?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const plans = await db.plan.findMany({
      orderBy: { priceMonthlyFCFA: 'asc' },
    });
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Erreur lors de la récupération des plans:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('sa_session')?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, priceMonthlyFCFA, priceYearlyFCFA, includedUsers, extraUserCreationFeeFCFA, extraUserMonthlyFeeFCFA, modules } = body || {};
    if (!code || !name) return NextResponse.json({ error: 'code et name requis' }, { status: 400 });
    if (!Array.isArray(modules)) return NextResponse.json({ error: 'modules doit être un tableau' }, { status: 400 });

    const created = await db.plan.create({
      data: {
        code,
        name,
        priceMonthlyFCFA: Number(priceMonthlyFCFA ?? 0),
        priceYearlyFCFA: Number(priceYearlyFCFA ?? 0),
        includedUsers: Number(includedUsers ?? 0),
        extraUserCreationFeeFCFA: Number(extraUserCreationFeeFCFA ?? 0),
        extraUserMonthlyFeeFCFA: Number(extraUserMonthlyFeeFCFA ?? 0),
        modules,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Erreur création plan:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


