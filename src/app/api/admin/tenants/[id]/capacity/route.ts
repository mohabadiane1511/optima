import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const db = prisma as any;

// POST /api/admin/tenants/[id]/capacity  body: { delta?: number }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await (async () => { try { return await request.json(); } catch { return {}; } })();
    const delta = Number(body?.delta ?? 1);
    if (!Number.isFinite(delta) || delta === 0) {
      return NextResponse.json({ error: 'Delta invalide' }, { status: 400 });
    }

    const t = await db.tenant.findUnique({ where: { id: params.id }, select: { id: true, maxUsers: true, planId: true } });
    if (!t) return NextResponse.json({ error: 'Tenant non trouvé' }, { status: 404 });

    // Plancher = max(includedUsers du plan, utilisateurs actifs)
    const plan = t.planId ? await db.plan.findUnique({ where: { id: t.planId }, select: { includedUsers: true } }) : null;
    const activeUsers = await db.membership.count({ where: { tenantId: params.id, active: true } });

    const current = Number(t.maxUsers ?? 0);
    const candidate = Math.max(0, current + delta);
    const floor = Math.max(Number(plan?.includedUsers ?? 0), activeUsers);
    if (candidate < floor) {
      return NextResponse.json({ error: `Capacité minimale: ${floor}` }, { status: 400 });
    }

    const updated = await db.tenant.update({ where: { id: params.id }, data: { maxUsers: candidate } });

    return NextResponse.json({ ok: true, maxUsers: updated.maxUsers });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


