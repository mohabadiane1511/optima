import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/tenants - Liste tous les tenants
export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            memberships: true,
            domains: true,
          },
        },
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

// POST /api/admin/tenants - Créer un nouveau tenant
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, slug, description, contactEmail, contactPhone } = data;

    // Vérifier que le slug est unique
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Ce slug est déjà utilisé' },
        { status: 400 }
      );
    }

    // Créer le tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        description,
        contactEmail,
        contactPhone,
        status: 'active',
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

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création du tenant:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du tenant' },
      { status: 500 }
    );
  }
}
