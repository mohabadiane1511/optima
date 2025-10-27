import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantPlanContext } from '@/lib/tenant/plan';

const db = prisma as any;
// GET /api/admin/users - Liste tous les utilisateurs avec leurs tenants
export async function GET() {
  try {
    const users = await db.user.findMany({
      where: {
        memberships: {
          some: {
            role: { in: ['admin', 'owner'] }
          }
        }
      },
      include: {
        memberships: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Créer un nouvel utilisateur
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { email, name, password, tenantId, role = 'user' } = data;

    // Vérifier que l'email est unique
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    // Vérifier que le tenant existe
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant non trouvé' },
        { status: 400 }
      );
    }

    // Vérifier quota: nombre de membres actifs vs maxUsers
    const planCtx = await getTenantPlanContext(tenantId);
    if (planCtx?.maxUsers != null && planCtx.activeUsers >= planCtx.maxUsers) {
      return NextResponse.json(
        { error: 'Quota utilisateurs atteint pour ce plan' },
        { status: 400 }
      );
    }

    // Hasher le mot de passe
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    // Créer le membership
    const membership = await db.membership.create({
      data: {
        userId: user.id,
        tenantId: tenantId,
        role,
      },
    });

    // Récupérer l'utilisateur avec ses informations complètes
    const userWithMemberships = await db.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(userWithMemberships, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'utilisateur' },
      { status: 500 }
    );
  }
}
