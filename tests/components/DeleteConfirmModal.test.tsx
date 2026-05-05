import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteConfirmModal } from '@/src/components/clients/DeleteConfirmModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as useClientsHooks from '@/src/hooks/useClients';
import * as useLogsHooks from '@/src/hooks/useLogs';

vi.mock('@/src/hooks/useClients', () => ({
  useDeleteClient: vi.fn(),
  useClients: vi.fn(),
  useClient: vi.fn(),
  useCreateClient: vi.fn(),
  useUpdateClient: vi.fn(),
  useRotateToken: vi.fn(),
}));

vi.mock('@/src/hooks/useLogs', () => ({
  useLogs: vi.fn(),
}));

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('DeleteConfirmModal', () => {
  const mockClient = {
    name: 'Billing API',
    app_key: 'billing-api',
    active: true,
    created_at: '2026-04-01',
    updated_at: '2026-04-01',
  };
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useClientsHooks.useDeleteClient as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    });
    (useLogsHooks.useLogs as any).mockReturnValue({
      data: { total: 1842 },
      isLoading: false,
    });
  });

  it('renders confirmation with log count', () => {
    render(<DeleteConfirmModal client={mockClient} onClose={mockOnClose} />, { wrapper });
    
    // Check for the modal title and the specific client key
    expect(screen.getByRole('heading', { name: /Delete Application/i })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mockClient.app_key, 'i'))).toBeInTheDocument();
    expect(screen.getByText('1,842')).toBeInTheDocument();
  });

  it('calls delete mutation when confirmed', () => {
    const mockMutate = vi.fn();
    (useClientsHooks.useDeleteClient as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    });

    render(<DeleteConfirmModal client={mockClient} onClose={mockOnClose} />, { wrapper });
    
    fireEvent.click(screen.getByText('Delete permanently'));
    expect(mockMutate).toHaveBeenCalledWith(mockClient.app_key, expect.any(Object));
  });

  it('shows success state after deletion', async () => {
    const mockMutate = vi.fn().mockImplementation((id, options) => {
      options.onSuccess({ deleted: 'billing-api', logs_deleted: 1842 });
    });
    
    (useClientsHooks.useDeleteClient as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    });

    render(<DeleteConfirmModal client={mockClient} onClose={mockOnClose} />, { wrapper });
    
    fireEvent.click(screen.getByText('Delete permanently'));
    
    expect(await screen.findByText(/Application Deleted/i)).toBeInTheDocument();
    expect(screen.getByText(/1,842/i)).toBeInTheDocument();
  });
});
