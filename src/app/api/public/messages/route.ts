import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const profileType = String(body.profileType || '').trim();
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const company = body.company ? String(body.company).trim() : null;
    const companySize = body.companySize ? String(body.companySize).trim() : null;
    const intent = String(body.intent || '').trim();
    const modules = Array.isArray(body.modules) ? body.modules.map((s: any) => String(s)).slice(0, 12) : [];
    const message = String(body.message || '').trim();

    if (!fullName || !email || !profileType || !intent || !message) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const created = await (prisma as any).message.create({
      data: {
        profileType,
        fullName,
        email,
        phone,
        company,
        companySize,
        intent,
        modules,
        message,
      },
    });

    // Accusé de réception (meilleure-effort)
    try {
      const subject = `Accusé de réception — Optima`;
      const html = `<div style="font-family:ui-sans-serif,system-ui">Bonjour ${fullName},<br/><br/>Nous avons bien reçu votre message et vous répondrons rapidement.<br/><br/><b>Objet:</b> ${intent}<br/><b>Message:</b><br/>${message.replace(/\n/g, '<br/>')}<br/><br/>Cordialement,<br/>Équipe Optima</div>`;
      await sendMail({ to: email, subject, html });
    } catch {}

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', detail: e?.message }, { status: 500 });
  }
}


