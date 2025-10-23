import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveTenantFromHost } from '@/lib/tenant/host';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const saSession = request.cookies.get('sa_session');
  // Bypass complet pour statut et page suspendue
  if (pathname.startsWith('/api/tenant/status') || pathname.startsWith('/suspended')) {
    return NextResponse.next();
  }

  // 1) Espace Super Admin (/admin/*)
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login' || pathname.startsWith('/admin/(auth)')) {
      if (saSession) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return NextResponse.next();
    }
    if (!saSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  // 2) Espace Entreprise (sous-domaines)
  const { tenantSlug } = resolveTenantFromHost(request.headers.get('host'));
  if (tenantSlug) {
    // Vérifier statut via endpoint interne (compatible Edge)
    try {
      const path = request.nextUrl.pathname;
      const isApi = path.startsWith('/api/tenant/');
      const bypass = path.startsWith('/api/tenant/status') || path.startsWith('/suspended');
      if (!bypass) {
        const statusUrl = new URL('/api/tenant/status', request.url);
        // Forcer le slug via query pour éviter toute ambiguïté de host
        statusUrl.searchParams.set('slug', tenantSlug);
        const resp = await fetch(statusUrl.toString(), { headers: { 'x-tenant-slug': tenantSlug }, cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          // Ne rediriger QUE si explicitement inactif
          if (data?.status === 'inactive') {
            if (isApi) {
              return NextResponse.json({ error: 'Tenant inactif' }, { status: 403 });
            }
            const url = new URL('/suspended', request.url);
            const res = NextResponse.redirect(url);
            res.cookies.set('tenant_session', '', { maxAge: 0, path: '/' });
            res.headers.set('Cache-Control', 'no-store');
            return res;
          }
        }
      }
    } catch {}
    const path = request.nextUrl.pathname;
    const isAuthPath = path.startsWith('/auth/login') || path.startsWith('/auth/change-password') || path.startsWith('/suspended');
    const isApiAuth = path.startsWith('/api/auth/');

    if (isApiAuth) return NextResponse.next();

    const sessionCookie = request.cookies.get('tenant_session')?.value;
    if (!sessionCookie && !isAuthPath) {
      const url = new URL('/auth/login', request.url);
      // Force no-cache pour éviter affichage d’une page app en mémoire
      const res = NextResponse.redirect(url);
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    if (sessionCookie) {
      try {
        const payload = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8')) as { mustChangePassword?: boolean };
        if (payload?.mustChangePassword && !path.startsWith('/auth/change-password')) {
          const url = new URL('/auth/change-password', request.url);
          return NextResponse.redirect(url);
        }
        // Déjà connecté et pas de changement requis: empêcher l'accès à /auth/login
        if (!payload?.mustChangePassword && path.startsWith('/auth/login')) {
          const url = new URL('/dashboard', request.url);
          return NextResponse.redirect(url);
        }
      } catch {
        const url = new URL('/auth/login', request.url);
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!_next|favicon.ico).*)',
  ],
};
