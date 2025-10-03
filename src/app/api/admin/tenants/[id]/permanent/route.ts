import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DELETE /api/admin/tenants/[id]/permanent - Suppression définitive d'un tenant inactif
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier que le tenant existe et est inactif
    const tenant = await prisma.tenant.findUnique({
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

    if (tenant.status === 'active') {
      return NextResponse.json(
        { error: 'Impossible de supprimer un tenant actif. Désactivez-le d\'abord.' },
        { status: 400 }
      );
    }

    // Vérifier s'il y a des utilisateurs associés
    if (tenant._count.memberships > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un tenant avec des utilisateurs associés' },
        { status: 400 }
      );
    }

    // Supprimer définitivement le tenant
    await prisma.tenant.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Tenant supprimé définitivement avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression définitive du tenant:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression définitive du tenant' },
      { status: 500 }
    );
  }
}
