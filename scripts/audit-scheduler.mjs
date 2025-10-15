import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const RETENTION = Number(process.env.AUDIT_RETENTION_DAYS || 30);
const WARN_DAYS = Number(process.env.AUDIT_WARN_DAYS || 2);

function cutoff(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function runPurge() {
  const cutoffPurge = cutoff(RETENTION);
  const batch = 5000;
  let purged = 0;
  while (true) {
    const ids = await prisma.auditLog.findMany({
      select: { id: true },
      where: { createdAt: { lt: cutoffPurge } },
      take: batch,
    });
    if (ids.length === 0) break;
    await prisma.auditLog.deleteMany({
      where: { id: { in: ids.map((i) => i.id) } },
    });
    purged += ids.length;
    if (ids.length < batch) break;
  }
  if (purged > 0) {
    console.log(
      `[audit-scheduler] Purged ${purged} logs older than ${cutoffPurge.toISOString()}`
    );
  }
}

async function main() {
  console.log("[audit-scheduler] started");
  // Tous les jours à 02:00
  cron.schedule("0 2 * * *", async () => {
    try {
      await runPurge();
    } catch (e) {
      console.error("[audit-scheduler] error", e);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
