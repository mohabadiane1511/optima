import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    tenant: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  })),
}));

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('/api/admin/tenants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('devrait retourner la liste des tenants', async () => {
      const mockTenants = [
        {
          id: '1',
          name: 'Entreprise Test',
          slug: 'entreprise-test',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { memberships: 2, domains: 1 },
        },
      ];

      mockPrisma.tenant.findMany.mockResolvedValue(mockTenants);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTenants);
      expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith({
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
    });

    it('devrait gérer les erreurs de base de données', async () => {
      mockPrisma.tenant.findMany.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Erreur lors de la récupération des tenants');
    });
  });

  describe('POST', () => {
    it('devrait créer un nouveau tenant avec succès', async () => {
      const tenantData = {
        name: 'Nouvelle Entreprise',
        slug: 'nouvelle-entreprise',
        description: 'Description test',
        contactEmail: 'contact@test.com',
        contactPhone: '+221 77 123 45 67',
      };

      const mockCreatedTenant = {
        id: '2',
        ...tenantData,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { memberships: 0, domains: 0 },
      };

      mockPrisma.tenant.findUnique.mockResolvedValue(null); // Slug disponible
      mockPrisma.tenant.create.mockResolvedValue(mockCreatedTenant);

      const request = new NextRequest('http://localhost:3000/api/admin/tenants', {
        method: 'POST',
        body: JSON.stringify(tenantData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockCreatedTenant);
      expect(mockPrisma.tenant.create).toHaveBeenCalledWith({
        data: {
          ...tenantData,
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
    });

    it('devrait rejeter la création si le slug existe déjà', async () => {
      const tenantData = {
        name: 'Entreprise Test',
        slug: 'slug-existant',
      };

      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: '1',
        slug: 'slug-existant',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/tenants', {
        method: 'POST',
        body: JSON.stringify(tenantData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Ce slug est déjà utilisé');
    });

    it('devrait gérer les erreurs de validation', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/tenants', {
        method: 'POST',
        body: JSON.stringify({}), // Données invalides
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
