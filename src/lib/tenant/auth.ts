import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export type TenantSessionPayload = {
  userId: string;
  tenantId: string;
  mustChangePassword: boolean;
};

export async function verifyUserPassword(email: string, plain: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return null;
  const ok = await bcrypt.compare(plain, user.passwordHash);
  if (!ok) return null;
  return user;
}

export async function getMembershipForTenant(userId: string, tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return null;
  const membership = await prisma.membership.findFirst({ where: { userId, tenantId: tenant.id } });
  if (!membership) return null;
  return { tenant, membership };
}


