import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const db = prisma as any;

// Fonction pour générer un mot de passe temporaire
function generateTempPassword() {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

// GET /api/admin/tenants - Liste tous les tenants
export async function GET() {
  try {
    const tenants = await db.tenant.findMany({
      include: {
        _count: {
          select: {
            memberships: true,
            domains: true,
          },
        },
        plan: { select: { code: true, name: true } }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(tenants);
  } catch (error) {
    console.error('Erreur lors de la récupération des tenants:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tenants' },
      { status: 500 }
    );
  }
}

// POST /api/admin/tenants - Créer un nouveau tenant avec son admin
export async function POST(request: NextRequest) {
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
      planId,
      planCode,
      billingFrequency
    } = data;

    // Vérifier que le slug est unique
    const existingTenant = await db.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Ce slug est déjà utilisé' },
        { status: 400 }
      );
    }

    // Vérifier que l'email est fourni
    if (!contactEmail) {
      return NextResponse.json(
        { error: 'L\'email de contact est requis pour créer l\'administrateur' },
        { status: 400 }
      );
    }

    // Résoudre le plan (obligatoire). Si rien fourni, fallback ESSENTIEL
    const planWhere: any = planId
      ? { id: planId }
      : planCode
        ? { code: planCode }
        : { code: 'ESSENTIEL' };

    const plan = await db.plan.findUnique({ where: planWhere });
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan invalide ou introuvable' },
        { status: 400 }
      );
    }

    // Générer un mot de passe temporaire pour l'admin
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Utiliser une transaction pour créer le tenant (avec snapshot de plan) et l'admin
    const result = await db.$transaction(async (tx: any) => {
      // 1. Créer le tenant
      const createdAt = new Date();
      const anchorDay = createdAt.getDate();
      const anchorMonth = createdAt.getMonth() + 1; // 1..12
      const nextInvoiceAt = (() => {
        const d = new Date(createdAt);
        if ((billingFrequency || 'monthly') === 'annual') {
          d.setFullYear(d.getFullYear() + 1);
          d.setMonth(anchorMonth - 1);
          d.setDate(anchorDay);
          return d;
        } else {
          // mensuel: mois suivant, même jour (fallback fin de mois géré par JS)
          d.setMonth(d.getMonth() + 1);
          d.setDate(anchorDay);
          return d;
        }
      })();

      const tenant = await tx.tenant.create({
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
          status: 'active',
          planId: plan.id,
          planCode: plan.code,
          maxUsers: plan.includedUsers,
          allowedModules: plan.modules,
          billingFrequency: billingFrequency || 'monthly',
          billingAnchorDay: anchorDay,
          billingAnchorMonth: anchorMonth,
          dueDays: 15,
          autoBillingEnabled: true,
          nextInvoiceAt,
        },
      });

      // 2. Créer l'utilisateur admin
      const user = await tx.user.create({
        data: {
          email: contactEmail,
          name: `Admin ${name}`,
          passwordHash,
          mustChangePassword: true,
          memberships: {
            create: {
              tenantId: tenant.id,
              role: 'admin',
            },
          },
        },
      });

      return {
        tenant: {
          ...tenant,
          _count: {
            memberships: 1,
            domains: 0,
          },
        },
        adminEmail: user.email,
        tempPassword,
        plan: {
          id: plan.id,
          code: plan.code,
          includedUsers: plan.includedUsers,
          modules: plan.modules,
        }
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création du tenant:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du tenant' },
      { status: 500 }
    );
  }
}
