import { cookies } from 'next/headers';

export const TENANT_SESSION_COOKIE = 'tenant_session';

export async function getTenantSessionCookie(): Promise<string | null> {
  const jar = await cookies();
  const val = jar.get(TENANT_SESSION_COOKIE)?.value;
  return val ?? null;
}

export async function setTenantSessionCookie(token: string, options?: { maxAgeSeconds?: number }) {
  const jar = await cookies();
  jar.set(TENANT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: options?.maxAgeSeconds ?? 60 * 60 * 24 * 7, // 7 jours
  });
}

export async function clearTenantSessionCookie() {
  const jar = await cookies();
  jar.delete(TENANT_SESSION_COOKIE);
}


