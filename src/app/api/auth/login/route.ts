import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { setTenantSessionCookie } from '@/lib/tenant/cookies';
import { logAuditEvent } from '@/lib/audit';

const db = prisma as any;

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

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant inconnu' }, { status: 404 });
    }

    const membership = await db.membership.findFirst({ where: { userId: user.id, tenantId: tenant.id, active: true } });
    if (!membership) {
      return NextResponse.json({ error: 'Compte utilisateur désactivé' }, { status: 403 });
    }

    // Set session cookie (simple payload; can be JWT later)
    const payload = {
      userId: user.id,
      tenantId: tenant.id,
      mustChangePassword: user.mustChangePassword ?? false,
    };
    await setTenantSessionCookie(Buffer.from(JSON.stringify(payload)).toString('base64'));

    // Audit: connexion réussie
    await logAuditEvent({
      tenantId: tenant.id,
      action: 'auth.login.success',
      entity: 'user',
      entityId: user.id,
      actorId: user.id,
      actorName: user.name || null,
      actorEmail: user.email || null,
    }, request as any);

    return NextResponse.json({ ok: true, mustChangePassword: payload.mustChangePassword });
  } catch (e) {
    // Audit: échec de connexion
    try {
      const { email } = await request.json();
      const { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
      if (tenantSlug) {
        const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
        if (tenant) {
          await logAuditEvent({ tenantId: tenant.id, action: 'auth.login.failed', entity: 'user', metadata: { email } }, request as any);
        }
      }
    } catch {}
    console.error('Erreur login tenant:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


