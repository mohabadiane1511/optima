import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant/host';
import { logAuditEvent } from '@/lib/audit';
import { sendMail } from '@/lib/mailer';

const db = prisma as any;

async function resolveTenantAndActor(request: NextRequest): Promise<{ tenantId: string | null; userId: string | null; role: string | null }> {
  const jar = await cookies();
  const raw = jar.get('tenant_session')?.value;
  let tenantId: string | null = null;
  let userId: string | null = null;
  try {
    if (raw) {
      const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as { tenantId?: string; userId?: string };
      tenantId = p?.tenantId || null;
      userId = p?.userId || null;
    }
  } catch {}
  if (!tenantId) {
    let { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
    if (!tenantSlug && process.env.NODE_ENV !== 'production') tenantSlug = request.headers.get('x-tenant-slug') || (process.env.DEFAULT_TENANT_SLUG as any) || null;
    if (tenantSlug) {
      const t = await db.tenant.findUnique({ where: { slug: tenantSlug } });
      tenantId = t?.id || null;
    }
  }
  let role: string | null = null;
  if (tenantId && userId) {
    const m = await db.membership.findFirst({ where: { tenantId, userId }, select: { role: true } });
    role = m?.role || null;
  }
  return { tenantId, userId, role };
}

// GET /api/tenant/members?page=&limit=&q=
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await resolveTenantAndActor(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 10)));
    const q = (url.searchParams.get('q') || '').trim();
    const roleParam = (url.searchParams.get('role') || '').trim(); // ex: viewer
    const statusParam = (url.searchParams.get('status') || '').trim(); // 'active' | 'inactive'

    // Filtre par utilisateur: appliquer au where du parent via relation
    // where.user conditions
    const userWhere: any = {};
    if (q) {
      userWhere.OR = [ { name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } } ];
    }
    // La recherche de statut se fait désormais sur Membership.active (ci-dessous)
    const userRelFilter: any = Object.keys(userWhere).length ? { user: userWhere } : {};

    // where.role filter
    let roleFilter: any = {};
    if (roleParam) {
      const roles = roleParam.split(',').map(r => r.trim()).filter(Boolean);
      if (roles.length) roleFilter = { role: { in: roles } };
    }

    // Filtre statut Membership.active
    let activeFilter: any = {};
    if (statusParam === 'active') activeFilter = { active: true };
    if (statusParam === 'inactive') activeFilter = { active: false };

    const whereMembership: any = { tenantId, ...userRelFilter, ...roleFilter, ...activeFilter };

    const [members, total] = await Promise.all([
      db.membership.findMany({
        where: whereMembership,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true, createdAt: true, mustChangePassword: true } } }
      }),
      db.membership.count({ where: whereMembership })
    ]);

    const items = (members as any[]).map((m: any) => ({ id: m.id, userId: m.user.id, name: m.user.name, email: m.user.email, role: m.role, joinedAt: m.createdAt, mustChangePassword: Boolean(m.user.mustChangePassword), active: Boolean(m.active) }));

    return NextResponse.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 } });
  } catch (e) {
    console.error('GET /api/tenant/members error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/tenant/members  body: { email: string, name?: string, role?: 'viewer'|'manager'|'admin' }
export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId: actorId, role: actorRole } = await resolveTenantAndActor(request);
    if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
    if (!actorRole || (actorRole !== 'owner' && actorRole !== 'admin')) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    // Forcer le rôle 'viewer' pour les créations par admin tenant
    const role = 'viewer';
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    // Trouver ou créer l'utilisateur
    let user = await db.user.findUnique({ where: { email } });
    let temp: string | null = null;
    if (!user) {
      const bcrypt = await import('bcryptjs');
      temp = Math.random().toString(36).slice(2, 10);
      const passwordHash = await bcrypt.default.hash(temp, 12);
      user = await db.user.create({ data: { email, name: name || email.split('@')[0], passwordHash, mustChangePassword: true } });
    }

    // Vérifier si déjà membre
    const existing = await db.membership.findFirst({ where: { tenantId, userId: user.id } });
    if (existing) return NextResponse.json({ error: 'Utilisateur déjà membre' }, { status: 409 });

    const membership = await db.membership.create({ data: { tenantId, userId: user.id, role } });

    await logAuditEvent({ tenantId, action: 'Utilisateur ajouté au tenant', entity: 'membership', entityId: membership.id, actorId: actorId || undefined, metadata: { targetEmail: email, role } }, request);

    // Envoyer email d'invitation si SMTP configuré
    try {
      const host = request.headers.get('host') || '';
      const baseUrl = `${request.nextUrl.protocol}//${host}`;
      const loginUrl = `${baseUrl}/auth/login`;
      const html = `
        <p>Bonjour ${name || ''},</p>
        <p>Vous avez été ajouté à l'organisation. Connectez-vous avec votre email <b>${email}</b>.</p>
        ${temp ? `<p>Mot de passe temporaire: <b>${temp}</b> (à changer à la première connexion)</p>` : ''}
        <p>
          <a href="${loginUrl}">Se connecter</a>
        </p>
      `;
      await sendMail({ to: email, subject: 'Invitation Optima ERP', html });
    } catch {}

    return NextResponse.json({ id: membership.id, userId: user.id, name: user.name, email: user.email, role: membership.role, joinedAt: membership.createdAt, mustChangePassword: true }, { status: 201 });
  } catch (e) {
    console.error('POST /api/tenant/members error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


