import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getTenantSessionCookie, setTenantSessionCookie } from '@/lib/tenant/cookies';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { newPassword } = body;
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Mot de passe trop court (min 8)' }, { status: 400 });
    }

    const raw = getTenantSessionCookie();
    if (!raw) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const payload = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as { userId: string };

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const updated = await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash, mustChangePassword: false },
    });

    // Rafraîchir le cookie de session avec mustChangePassword=false
    try {
      const rawOld = getTenantSessionCookie();
      if (rawOld) {
        const oldPayload = JSON.parse(Buffer.from(rawOld, 'base64').toString('utf-8')) as any;
        const newPayload = { ...oldPayload, mustChangePassword: false };
        setTenantSessionCookie(Buffer.from(JSON.stringify(newPayload)).toString('base64'));
      }
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Erreur change-password:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


