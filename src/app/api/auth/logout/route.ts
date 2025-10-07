import { NextResponse } from 'next/server';
import { clearTenantSessionCookie } from '@/lib/tenant/cookies';

export async function POST() {
  try {
    await clearTenantSessionCookie();
    // Réponse non mise en cache pour éviter tout effet de cache
    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return new NextResponse(JSON.stringify({ ok: false }), { status: 500 });
  }
}


