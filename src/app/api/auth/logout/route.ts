import { NextResponse } from 'next/server';
import { clearTenantSessionCookie } from '@/lib/tenant/cookies';

export async function POST() {
  clearTenantSessionCookie();
  return NextResponse.json({ ok: true });
}


