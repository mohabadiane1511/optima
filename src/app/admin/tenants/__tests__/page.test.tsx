import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TenantsPage from '../page';

// Mock fetch
global.fetch = jest.fn();

// Mock Next.js router
jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    );
});

const mockTenants = [
    {
        id: '1',
        name: 'Entreprise Test 1',
        slug: 'entreprise-test-1',
        description: 'Description test 1',
        contactEmail: 'contact1@test.com',
        contactPhone: '+221 77 123 45 67',
        status: 'active',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        _count: { memberships: 2, domains: 1 },
    },
    {
        id: '2',
        name: 'Entreprise Test 2',
        slug: 'entreprise-test-2',
        description: 'Description test 2',
        contactEmail: 'contact2@test.com',
        contactPhone: '+221 77 123 45 68',
        status: 'inactive',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        _count: { memberships: 1, domains: 0 },
    },
];

describe('TenantsPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => mockTenants,
        });
    });

    it('devrait afficher la page de gestion des tenants', async () => {
        render(<TenantsPage />);

        expect(screen.getByText('Gestion des Entreprises')).toBeInTheDocument();
        expect(screen.getByText('Créer et gérer les entreprises utilisant Optima ERP')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Nouvelle entreprise' })).toBeInTheDocument();
    });

    it('devrait charger et afficher la liste des tenants', async () => {
        render(<TenantsPage />);

        await waitFor(() => {
            expect(screen.getByText('Entreprise Test 1')).toBeInTheDocument();
            expect(screen.getByText('Entreprise Test 2')).toBeInTheDocument();
        });

        expect(global.fetch).toHaveBeenCalledWith('/api/admin/tenants');
    });

    it('devrait afficher les statistiques correctes', async () => {
        render(<TenantsPage />);

        await waitFor(() => {
            expect(screen.getByText('2')).toBeInTheDocument(); // Total entreprises
            expect(screen.getByText('1')).toBeInTheDocument(); // Entreprises actives
            expect(screen.getByText('3')).toBeInTheDocument(); // Total utilisateurs (2+1)
        });
    });

    it('devrait afficher l\'état vide quand il n\'y a pas de tenants', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => [],
        });

        render(<TenantsPage />);

        await waitFor(() => {
            expect(screen.getByText('Aucune entreprise')).toBeInTheDocument();
            expect(screen.getByText('Commencez par créer votre première entreprise.')).toBeInTheDocument();
        });
    });

    it('devrait ouvrir le dialog de création', async () => {
        render(<TenantsPage />);

        await waitFor(() => {
            expect(screen.getByText('Entreprise Test 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Nouvelle entreprise' }));

        await waitFor(() => {
            expect(screen.getByText('Nouvelle entreprise')).toBeInTheDocument();
        });
    });

    it('devrait ouvrir le dialog de modification', async () => {
        render(<TenantsPage />);

        await waitFor(() => {
            expect(screen.getByText('Entreprise Test 1')).toBeInTheDocument();
        });

        // Cliquer sur le menu d'actions
        const actionButtons = screen.getAllByRole('button');
        const moreButton = actionButtons.find(button =>
            button.querySelector('svg')?.getAttribute('data-lucide') === 'more-horizontal'
        );

        if (moreButton) {
            fireEvent.click(moreButton);

            // Cliquer sur "Modifier"
            const editButton = screen.getByText('Modifier');
            fireEvent.click(editButton);

            await waitFor(() => {
                expect(screen.getByText('Modifier l\'entreprise')).toBeInTheDocument();
                expect(screen.getByDisplayValue('Entreprise Test 1')).toBeInTheDocument();
            });
        }
    });

    it('devrait afficher les badges de statut corrects', async () => {
        render(<TenantsPage />);

        await waitFor(() => {
            expect(screen.getByText('Actif')).toBeInTheDocument();
            expect(screen.getByText('Inactif')).toBeInTheDocument();
        });
    });

    it('devrait afficher le nombre d\'utilisateurs par tenant', async () => {
        render(<TenantsPage />);

        await waitFor(() => {
            expect(screen.getByText('2 utilisateurs')).toBeInTheDocument();
            expect(screen.getByText('1 utilisateur')).toBeInTheDocument();
        });
    });

    it('devrait gérer les erreurs de chargement', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        render(<TenantsPage />);

        // La page devrait toujours s'afficher même en cas d'erreur
        expect(screen.getByText('Gestion des Entreprises')).toBeInTheDocument();
    });
});
