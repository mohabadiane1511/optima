import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();
    const status = String(body.status || '').trim();
    if (!id || !status) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    const allowed = ['new', 'in_progress', 'closed'];
    if (!allowed.includes(status)) return NextResponse.json({ error: 'bad_status' }, { status: 400 });
    const updated = await (prisma as any).message.update({ where: { id }, data: { status } });
    return NextResponse.json({ ok: true, id: updated.id, status: updated.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', detail: e?.message }, { status: 500 });
  }
}


