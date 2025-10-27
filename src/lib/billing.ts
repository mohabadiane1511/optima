import { prisma } from '@/lib/prisma';

export type BillingFrequency = 'monthly' | 'annual';

export async function computePlanBilling(params: { tenantId: string; period: string; frequency: BillingFrequency }) {
  const { tenantId, frequency } = params;
  const db = prisma as any;

  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true, planId: true } });
  if (!tenant) throw new Error('Tenant introuvable');
  const plan = tenant.planId ? await db.plan.findUnique({ where: { id: tenant.planId } }) : null;
  if (!plan) throw new Error('Plan introuvable');

  const activeUsers = await db.membership.count({ where: { tenantId, active: true } });
  const included = Number(plan.includedUsers || 0);
  const extrasCount = Math.max(0, Number(activeUsers) - included);

  const base = frequency === 'annual' ? Number(plan.priceYearlyFCFA || 0) : Number(plan.priceMonthlyFCFA || 0);
  const extrasMonthly = Number(plan.extraUserMonthlyFeeFCFA || 0);
  const extras = extrasMonthly * (frequency === 'annual' ? 12 : 1) * extrasCount;

  const total = base + extras;

  return {
    tenantId,
    plan: { id: plan.id, code: plan.code, name: plan.name },
    frequency,
    period: params.period,
    numbers: {
      activeUsers,
      includedUsers: included,
      extrasCount,
    },
    amounts: {
      base,
      extras,
      total,
    },
  };
}


