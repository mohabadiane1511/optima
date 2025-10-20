export type MailAttachment = { filename: string; content: Buffer; contentType?: string };
import nodemailer from 'nodemailer';

export async function sendMail(options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: MailAttachment[];
}): Promise<{ ok: true } | { ok: false; error: string } > {
  try {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;
    if (!host || !user || !pass || !from) {
      return { ok: false, error: 'smtp-not-configured' };
    }

    
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass }, pool: true });

    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: (options.attachments || []).map(a => ({ filename: a.filename, content: a.content, contentType: a.contentType || 'application/pdf' })),
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'smtp-send-failed' };
  }
}


