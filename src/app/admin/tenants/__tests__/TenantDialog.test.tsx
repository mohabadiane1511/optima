import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TenantDialog } from '../components/TenantDialog';

// Mock fetch
global.fetch = jest.fn();

const mockOnSaved = jest.fn();
const mockOnOpenChange = jest.fn();

const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onSaved: mockOnSaved,
    tenant: null,
};

describe('TenantDialog', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockClear();
    });

    it('devrait afficher le formulaire de création', () => {
        render(<TenantDialog {...defaultProps} />);

        expect(screen.getByText('Nouvelle entreprise')).toBeInTheDocument();
        expect(screen.getByLabelText('Nom de l\'entreprise *')).toBeInTheDocument();
        expect(screen.getByLabelText('Slug (URL) *')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Créer' })).toBeInTheDocument();
    });

    it('devrait afficher le formulaire de modification', () => {
        const tenant = {
            id: '1',
            name: 'Entreprise Test',
            slug: 'entreprise-test',
            description: 'Description test',
            contactEmail: 'contact@test.com',
            contactPhone: '+221 77 123 45 67',
            status: 'active' as const,
        };

        render(<TenantDialog {...defaultProps} tenant={tenant} />);

        expect(screen.getByText('Modifier l\'entreprise')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Entreprise Test')).toBeInTheDocument();
        expect(screen.getByDisplayValue('entreprise-test')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument();
    });

    it('devrait générer automatiquement le slug à partir du nom', () => {
        render(<TenantDialog {...defaultProps} />);

        const nameInput = screen.getByLabelText('Nom de l\'entreprise *');
        const slugInput = screen.getByLabelText('Slug (URL) *');

        fireEvent.change(nameInput, { target: { value: 'Entreprise ABC 123' } });

        expect(slugInput).toHaveValue('entreprise-abc-123');
    });

    it('devrait valider les champs obligatoires', async () => {
        render(<TenantDialog {...defaultProps} />);

        const submitButton = screen.getByRole('button', { name: 'Créer' });
        fireEvent.click(submitButton);

        // Le formulaire HTML devrait empêcher la soumission
        expect(mockOnSaved).not.toHaveBeenCalled();
    });

    it('devrait créer un tenant avec succès', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: '1', name: 'Test' }),
        });

        render(<TenantDialog {...defaultProps} />);

        // Remplir le formulaire
        fireEvent.change(screen.getByLabelText('Nom de l\'entreprise *'), {
            target: { value: 'Entreprise Test' },
        });
        fireEvent.change(screen.getByLabelText('Slug (URL) *'), {
            target: { value: 'entreprise-test' },
        });

        // Soumettre
        fireEvent.click(screen.getByRole('button', { name: 'Créer' }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/admin/tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Entreprise Test',
                    slug: 'entreprise-test',
                    description: '',
                    contactEmail: '',
                    contactPhone: '',
                    status: 'active',
                }),
            });
        });

        await waitFor(() => {
            expect(mockOnSaved).toHaveBeenCalled();
            expect(mockOnOpenChange).toHaveBeenCalledWith(false);
        });
    });

    it('devrait modifier un tenant avec succès', async () => {
        const tenant = {
            id: '1',
            name: 'Entreprise Test',
            slug: 'entreprise-test',
            description: '',
            contactEmail: '',
            contactPhone: '',
            status: 'active' as const,
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ...tenant, name: 'Entreprise Modifiée' }),
        });

        render(<TenantDialog {...defaultProps} tenant={tenant} />);

        // Modifier le nom
        fireEvent.change(screen.getByLabelText('Nom de l\'entreprise *'), {
            target: { value: 'Entreprise Modifiée' },
        });

        // Soumettre
        fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/admin/tenants/1', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: expect.objectContaining({
                    name: 'Entreprise Modifiée',
                }),
            });
        });
    });

    it('devrait afficher les erreurs du serveur', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Ce slug est déjà utilisé' }),
        });

        render(<TenantDialog {...defaultProps} />);

        // Remplir et soumettre
        fireEvent.change(screen.getByLabelText('Nom de l\'entreprise *'), {
            target: { value: 'Test' },
        });
        fireEvent.change(screen.getByLabelText('Slug (URL) *'), {
            target: { value: 'test' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Créer' }));

        await waitFor(() => {
            expect(screen.getByText('Ce slug est déjà utilisé')).toBeInTheDocument();
        });
    });

    it('devrait fermer le dialog lors de l\'annulation', () => {
        render(<TenantDialog {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
});
