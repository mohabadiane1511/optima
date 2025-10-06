import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { setTenantSessionCookie } from '@/lib/tenant/cookies';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant introuvable (host invalide)' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant inconnu' }, { status: 404 });
    }

    const membership = await prisma.membership.findFirst({ where: { userId: user.id, tenantId: tenant.id } });
    if (!membership) {
      return NextResponse.json({ error: 'Accès non autorisé à ce tenant' }, { status: 403 });
    }

    // Set session cookie (simple payload; can be JWT later)
    const payload = {
      userId: user.id,
      tenantId: tenant.id,
      mustChangePassword: user.mustChangePassword ?? false,
    };
    setTenantSessionCookie(Buffer.from(JSON.stringify(payload)).toString('base64'));

    return NextResponse.json({ ok: true, mustChangePassword: payload.mustChangePassword });
  } catch (e) {
    console.error('Erreur login tenant:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


