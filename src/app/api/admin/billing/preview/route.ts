import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { computePlanBilling } from '@/lib/billing';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('sa_session')?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== 'superadmin') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || '';
    const period = searchParams.get('period') || '';
    const frequency = (searchParams.get('frequency') || 'monthly') as 'monthly' | 'annual';
    if (!tenantId || !period) return NextResponse.json({ error: 'tenantId et period requis' }, { status: 400 });

    const res = await computePlanBilling({ tenantId, period, frequency });
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


