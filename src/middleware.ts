import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveTenantFromHost } from '@/lib/tenant/host';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const saSession = request.cookies.get('sa_session');

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
    const path = request.nextUrl.pathname;
    const isAuthPath = path.startsWith('/auth/login') || path.startsWith('/auth/change-password');
    const isApiAuth = path.startsWith('/api/auth/');

    if (isApiAuth) return NextResponse.next();

    const sessionCookie = request.cookies.get('tenant_session')?.value;
    if (!sessionCookie && !isAuthPath) {
      const url = new URL('/auth/login', request.url);
      return NextResponse.redirect(url);
    }

    if (sessionCookie) {
      try {
        const payload = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8')) as { mustChangePassword?: boolean };
        if (payload?.mustChangePassword && !path.startsWith('/auth/change-password')) {
          const url = new URL('/auth/change-password', request.url);
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
