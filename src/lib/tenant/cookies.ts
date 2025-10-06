import { cookies } from 'next/headers';

export const TENANT_SESSION_COOKIE = 'tenant_session';

export function getTenantSessionCookie(): string | null {
  const jar = cookies();
  const val = jar.get(TENANT_SESSION_COOKIE)?.value;
  return val ?? null;
}

export function setTenantSessionCookie(token: string, options?: { maxAgeSeconds?: number }) {
  const jar = cookies();
  jar.set(TENANT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: options?.maxAgeSeconds ?? 60 * 60 * 24 * 7, // 7 jours
  });
}

export function clearTenantSessionCookie() {
  const jar = cookies();
  jar.delete(TENANT_SESSION_COOKIE);
}


