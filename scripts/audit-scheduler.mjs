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

// ---------------------- Billing Auto-Emission ----------------------
function formatPeriod(date, frequency) {
  const y = date.getFullYear();
  if (frequency === "annual") return String(y);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function endOfMonth(year, monthIndex0) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function addNextOccurrence(currentNextAt, frequency, anchorDay, anchorMonth) {
  const d = new Date(currentNextAt);
  if (frequency === "annual") {
    // année suivante sur jour/mois anniversaire
    const year = d.getFullYear() + 1;
    const month0 = (anchorMonth || d.getMonth() + 1) - 1;
    const day = Math.min(anchorDay || d.getDate(), endOfMonth(year, month0));
    return new Date(year, month0, day, d.getHours(), d.getMinutes(), 0, 0);
  } else {
    // mois suivant sur jour anniversaire
    let year = d.getFullYear();
    let month0 = d.getMonth() + 1; // next month
    if (month0 >= 12) {
      year += 1;
      month0 = 0;
    }
    const day = Math.min(anchorDay || d.getDate(), endOfMonth(year, month0));
    return new Date(year, month0, day, d.getHours(), d.getMinutes(), 0, 0);
  }
}

async function computePlanBillingForTenant(tenantId, period, frequency) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { planId: true },
  });
  if (!tenant?.planId) throw new Error("Tenant/plan introuvable");
  const plan = await prisma.plan.findUnique({ where: { id: tenant.planId } });
  if (!plan) throw new Error("Plan introuvable");

  const activeUsers = await prisma.membership.count({
    where: { tenantId, active: true },
  });
  const included = Number(plan.includedUsers || 0);
  const extrasCount = Math.max(0, Number(activeUsers) - included);
  const base =
    frequency === "annual"
      ? Number(plan.priceYearlyFCFA || 0)
      : Number(plan.priceMonthlyFCFA || 0);
  const extrasMonthly = Number(plan.extraUserMonthlyFeeFCFA || 0);
  const extras =
    extrasMonthly * (frequency === "annual" ? 12 : 1) * extrasCount;
  return {
    plan,
    numbers: { activeUsers, includedUsers: included, extrasCount },
    amounts: { base, extras, total: base + extras },
    frequency,
    period,
  };
}

async function runAutoBilling() {
  const now = new Date();
  const tenants = await prisma.tenant.findMany({
    where: {
      status: "active",
      autoBillingEnabled: true,
      nextInvoiceAt: { lte: now },
    },
    select: {
      id: true,
      billingFrequency: true,
      billingAnchorDay: true,
      billingAnchorMonth: true,
      dueDays: true,
      nextInvoiceAt: true,
    },
  });

  if (!tenants.length) return;

  for (const t of tenants) {
    try {
      const frequency = t.billingFrequency === "annual" ? "annual" : "monthly";
      const period = formatPeriod(new Date(t.nextInvoiceAt || now), frequency);
      const preview = await computePlanBillingForTenant(
        t.id,
        period,
        frequency
      );

      const issuedAt = new Date();
      const dueAt = new Date(issuedAt);
      dueAt.setDate(dueAt.getDate() + Number(t.dueDays ?? 15));

      await prisma.billingInvoice.upsert({
        where: { tenantId_period: { tenantId: t.id, period } },
        update: {
          frequency,
          planCode: preview.plan.code,
          planName: preview.plan.name,
          includedUsers: preview.numbers.includedUsers,
          activeUsers: preview.numbers.activeUsers,
          extrasCount: preview.numbers.extrasCount,
          baseAmount: preview.amounts.base,
          extrasAmount: preview.amounts.extras,
          totalAmount: preview.amounts.total,
          status: "issued",
          issuedAt,
          dueAt,
        },
        create: {
          tenantId: t.id,
          period,
          frequency,
          planCode: preview.plan.code,
          planName: preview.plan.name,
          includedUsers: preview.numbers.includedUsers,
          activeUsers: preview.numbers.activeUsers,
          extrasCount: preview.numbers.extrasCount,
          baseAmount: preview.amounts.base,
          extrasAmount: preview.amounts.extras,
          totalAmount: preview.amounts.total,
          status: "issued",
          issuedAt,
          dueAt,
        },
      });

      const next = addNextOccurrence(
        t.nextInvoiceAt || now,
        frequency,
        t.billingAnchorDay,
        t.billingAnchorMonth
      );
      await prisma.tenant.update({
        where: { id: t.id },
        data: { lastInvoicedPeriod: period, nextInvoiceAt: next },
      });

      console.log(
        `[auto-billing] Emitted invoice for tenant=${t.id} period=${period} freq=${frequency}`
      );
    } catch (e) {
      console.error("[auto-billing] error for tenant", t?.id, e);
    }
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

  // Auto-billing: toutes les 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    try {
      await runAutoBilling();
    } catch (e) {
      console.error("[auto-billing] scheduler error", e);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
