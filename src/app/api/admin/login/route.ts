import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });

  const token = signToken({ uid: user.id, email, role: "superadmin" });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("sa_session", token, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}


