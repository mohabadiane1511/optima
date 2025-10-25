import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const db = prisma;
  const essentiel = await db.plan.findUnique({ where: { code: "ESSENTIEL" } });
  if (!essentiel) {
    console.error(
      "Plan ESSENTIEL introuvable. Exécutez d'abord: npm run seed:plans"
    );
    process.exit(1);
  }

  const tenants = await db.tenant.findMany({
    select: {
      id: true,
      planId: true,
      planCode: true,
      maxUsers: true,
      allowedModules: true,
    },
  });

  let updated = 0;
  for (const t of tenants) {
    const needsPlan = !t.planId || !t.planCode;
    const needsModules =
      !Array.isArray(t.allowedModules) || t.allowedModules.length === 0;
    const needsMax = t.maxUsers == null;
    if (!needsPlan && !needsModules && !needsMax) continue;

    await db.tenant.update({
      where: { id: t.id },
      data: {
        planId: needsPlan ? essentiel.id : t.planId,
        planCode: needsPlan ? essentiel.code : t.planCode,
        allowedModules: needsModules ? essentiel.modules : t.allowedModules,
        maxUsers: needsMax ? essentiel.includedUsers : t.maxUsers,
      },
    });
    updated++;
  }

  console.log(`Backfill terminé. Tenants mis à jour: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
