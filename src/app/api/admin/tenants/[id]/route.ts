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
      status 
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
  } catch (error) {
    console.error('Erreur lors de la réactivation du tenant:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la réactivation du tenant' },
      { status: 500 }
    );
  }
}

