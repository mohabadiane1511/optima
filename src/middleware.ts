import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const saSession = request.cookies.get('sa_session');
  
  // Si l'utilisateur est connecté et essaie d'accéder à /admin/login, rediriger vers dashboard
  if (pathname === '/admin/login' && saSession) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }
  
  // Protection des routes /admin/* (sauf /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!saSession) {
      // Redirection vers la page de login si pas de session
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
