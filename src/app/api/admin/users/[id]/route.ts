import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/users/[id] - Récupérer un utilisateur spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
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

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'utilisateur' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - Mettre à jour un utilisateur
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { name, email, password, role, tenantId } = data;

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que l'email est unique (sauf pour l'utilisateur actuel)
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          id: { not: params.id },
        },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé' },
          { status: 400 }
        );
      }
    }

    // Préparer les données de mise à jour
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) {
      const bcrypt = require('bcryptjs');
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    // Mettre à jour l'utilisateur
    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
    });

    // Mettre à jour le membership si nécessaire
    if (role || tenantId) {
      const membership = await prisma.membership.findFirst({
        where: { userId: params.id },
      });

      if (membership) {
        await prisma.membership.update({
          where: { id: membership.id },
          data: {
            ...(role && { role }),
            ...(tenantId && { tenantId }),
          },
        });
      }
    }

    // Récupérer l'utilisateur avec ses informations complètes
    const userWithMemberships = await prisma.user.findUnique({
      where: { id: params.id },
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

    return NextResponse.json(userWithMemberships);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'utilisateur' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Supprimer un utilisateur
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        memberships: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier s'il est le seul owner d'un tenant
    for (const membership of user.memberships) {
      if (membership.role === 'owner') {
        const otherOwners = await prisma.membership.count({
          where: {
            tenantId: membership.tenantId,
            role: 'owner',
            userId: { not: params.id },
          },
        });

        if (otherOwners === 0) {
          return NextResponse.json(
            { error: 'Impossible de supprimer le dernier owner d\'un tenant' },
            { status: 400 }
          );
        }
      }
    }

    // Supprimer les memberships d'abord
    await prisma.membership.deleteMany({
      where: { userId: params.id },
    });

    // Supprimer l'utilisateur
    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'utilisateur' },
      { status: 500 }
    );
  }
}
