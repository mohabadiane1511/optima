import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = process.argv[2];
const tenantName = process.argv[3];
const tenantSlug = process.argv[4];

if (!email || !tenantName || !tenantSlug) {
  console.error(
    "Usage: node scripts/create_super_admin.mjs <email> <tenantName> <tenantSlug>"
  );
  process.exit(1);
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName },
    create: { slug: tenantSlug, name: tenantName },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: tenantName },
  });

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: { role: "owner" },
    create: { tenantId: tenant.id, userId: user.id, role: "owner" },
  });

  console.log(`Super admin created: ${email} → tenant ${tenantSlug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

