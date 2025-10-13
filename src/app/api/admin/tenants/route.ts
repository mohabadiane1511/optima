import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
      logoUrl
    } = data;

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

    // Vérifier que l'email est fourni
    if (!contactEmail) {
      return NextResponse.json(
        { error: 'L\'email de contact est requis pour créer l\'administrateur' },
        { status: 400 }
      );
    }

    // Générer un mot de passe temporaire pour l'admin
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Utiliser une transaction pour créer le tenant et l'admin
    const result = await prisma.$transaction(async (tx) => {
      // 1. Créer le tenant
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
