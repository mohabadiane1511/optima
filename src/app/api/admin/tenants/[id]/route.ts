import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const db = prisma as any;

// GET /api/admin/tenants/[id] - Récupérer un tenant spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            memberships: true,
            domains: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Erreur lors de la récupération du tenant:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du tenant' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/tenants/[id] - Mettre à jour un tenant
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { 
      name, 
      slug, 
      description, 
      contactEmail, 
      contactPhone, 
      businessRegistration,
      ninea,
      address,
      website,
      logoUrl,
      status,
      planId,
      billingFrequency
    } = data;

    // Vérifier que le slug est unique (sauf pour le tenant actuel)
    if (slug) {
      const existingTenant = await db.tenant.findFirst({
        where: {
          slug,
          id: { not: params.id },
        },
      });

      if (existingTenant) {
        return NextResponse.json(
          { error: 'Ce slug est déjà utilisé' },
          { status: 400 }
        );
      }
    }

    // Appliquer snapshot plan si planId fourni
    let planUpdate: any = {};
    if (planId) {
      const plan = await db.plan.findUnique({ where: { id: planId } });
      if (!plan) {
        return NextResponse.json({ error: 'Plan invalide' }, { status: 400 });
      }
      planUpdate = {
        planId: plan.id,
        planCode: plan.code,
        maxUsers: plan.includedUsers,
        allowedModules: plan.modules,
      };
    }

    // Recalcul nextInvoiceAt si la fréquence change
    let billingUpdate: any = {};
    if (billingFrequency) {
      const current = await db.tenant.findUnique({ where: { id: params.id }, select: { createdAt: true, billingFrequency: true } });
      if (current) {
        const createdAt: Date = new Date(current.createdAt);
        const anchorDay = createdAt.getDate();
        const anchorMonth = createdAt.getMonth() + 1; // 1..12
        const now = new Date();

        const next = new Date(now);
        if (billingFrequency === 'annual') {
          // prochaine occurrence du jour/mois anniversaire à partir de maintenant
          next.setMonth(anchorMonth - 1);
          next.setDate(Math.min(anchorDay, new Date(next.getFullYear(), anchorMonth, 0).getDate()));
          if (next <= now) next.setFullYear(next.getFullYear() + 1);
        } else {
          // mensuelle: mois suivant, même jour (fallback fin de mois)
          next.setMonth(now.getMonth() + 1);
          const lastDayNextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
          next.setDate(Math.min(anchorDay, lastDayNextMonth));
        }

        billingUpdate = {
          billingFrequency,
          billingAnchorDay: anchorDay,
          billingAnchorMonth: anchorMonth,
          nextInvoiceAt: next,
        };
      }
    }

    // Mettre à jour le tenant
    const tenant = await db.tenant.update({
      where: { id: params.id },
      data: {
        name,
        slug,
        description,
        contactEmail,
        contactPhone,
        businessRegistration,
        ninea,
        address,
        website,
        logoUrl,
        status,
        ...planUpdate,
        ...billingUpdate,
      },
      include: {
        _count: {
          select: {
            memberships: true,
            domains: true,
          },
        },
      },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du tenant:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du tenant' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tenants/[id] - Désactiver un tenant
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Désactiver le tenant au lieu de le supprimer
    const tenant = await db.tenant.update({
      where: { id: params.id },
      data: { status: 'inactive' },
      include: {
        _count: {
          select: {
            memberships: true,
            domains: true,
          },
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Tenant désactivé avec succès',
      tenant 
    });
  } catch (error) {
    console.error('Erreur lors de la désactivation du tenant:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la désactivation du tenant' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/tenants/[id] - Réactiver un tenant
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await (async () => { try { return await request.json(); } catch { return {}; } })();
    if (body?.action === 'reapplyPlan') {
      const t = await db.tenant.findUnique({ where: { id: params.id }, select: { planId: true } });
      if (!t?.planId) return NextResponse.json({ error: 'Aucun plan associé' }, { status: 400 });
      const plan = await db.plan.findUnique({ where: { id: t.planId } });
      if (!plan) return NextResponse.json({ error: 'Plan introuvable' }, { status: 404 });
      const tenant = await db.tenant.update({ where: { id: params.id }, data: { allowedModules: plan.modules, maxUsers: plan.includedUsers } });
      return NextResponse.json({ success: true, tenant });
    } else {
      // Réactiver le tenant
      const tenant = await db.tenant.update({
        where: { id: params.id },
        data: { status: 'active' },
        include: {
          _count: {
            select: {
              memberships: true,
              domains: true,
            },
          },
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Tenant réactivé avec succès',
        tenant 
      });
    }
  } catch (error) {
    console.error('Erreur lors de la réactivation du tenant:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la réactivation du tenant' },
      { status: 500 }
    );
  }
}

