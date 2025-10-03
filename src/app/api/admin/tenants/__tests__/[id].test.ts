import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../[id]/route';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    tenant: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    membership: {
      count: jest.fn(),
    },
  })),
}));

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('/api/admin/tenants/[id]', () => {
  const tenantId = 'test-tenant-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('devrait retourner un tenant spécifique', async () => {
      const mockTenant = {
        id: tenantId,
        name: 'Entreprise Test',
        slug: 'entreprise-test',
        status: 'active',
        _count: { memberships: 2, domains: 1 },
      };

      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const response = await GET(new NextRequest('http://localhost:3000'), { params: { id: tenantId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTenant);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: tenantId },
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

    it('devrait retourner 404 si le tenant n\'existe pas', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      const response = await GET(new NextRequest('http://localhost:3000'), { params: { id: tenantId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Tenant non trouvé');
    });
  });

  describe('PUT', () => {
    it('devrait mettre à jour un tenant avec succès', async () => {
      const updateData = {
        name: 'Entreprise Modifiée',
        slug: 'entreprise-modifiee',
        status: 'active',
      };

      const mockUpdatedTenant = {
        id: tenantId,
        ...updateData,
        _count: { memberships: 2, domains: 1 },
      };

      mockPrisma.tenant.findFirst.mockResolvedValue(null); // Slug disponible
      mockPrisma.tenant.update.mockResolvedValue(mockUpdatedTenant);

      const request = new NextRequest('http://localhost:3000', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request, { params: { id: tenantId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUpdatedTenant);
    });

    it('devrait rejeter la mise à jour si le slug existe déjà', async () => {
      const updateData = {
        name: 'Entreprise Test',
        slug: 'slug-existant',
      };

      mockPrisma.tenant.findFirst.mockResolvedValue({
        id: 'autre-tenant',
        slug: 'slug-existant',
      } as any);

      const request = new NextRequest('http://localhost:3000', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request, { params: { id: tenantId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Ce slug est déjà utilisé');
    });
  });

  describe('DELETE', () => {
    it('devrait supprimer un tenant sans utilisateurs', async () => {
      mockPrisma.membership.count.mockResolvedValue(0);
      mockPrisma.tenant.delete.mockResolvedValue({} as any);

      const response = await DELETE(new NextRequest('http://localhost:3000'), { params: { id: tenantId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.tenant.delete).toHaveBeenCalledWith({
        where: { id: tenantId },
      });
    });

    it('devrait rejeter la suppression si le tenant a des utilisateurs', async () => {
      mockPrisma.membership.count.mockResolvedValue(2);

      const response = await DELETE(new NextRequest('http://localhost:3000'), { params: { id: tenantId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Impossible de supprimer un tenant avec des utilisateurs associés');
    });
  });
});
