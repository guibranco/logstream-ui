import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RotateConfirmModal } from '@/src/components/clients/RotateConfirmModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as useClientsHooks from '@/src/hooks/useClients';

vi.mock('@/src/hooks/useClients', () => ({
  useRotateToken: vi.fn(),
}));

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('RotateConfirmModal', () => {
  const mockClient = {
    name: 'Billing API',
    app_key: 'billing-api',
    active: true,
    created_at: '2026-04-01',
    updated_at: '2026-04-01',
  };
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useClientsHooks.useRotateToken as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    });
  });

  it('renders confirmation message with client name', () => {
    render(<RotateConfirmModal client={mockClient} onClose={mockOnClose} onSuccess={mockOnSuccess} />, { wrapper });
    
    expect(screen.getByText(/Rotate token for/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mockClient.app_key, 'i'))).toBeInTheDocument();
  });

  it('calls rotation mutation when confirmed', () => {
    const mockMutate = vi.fn();
    (useClientsHooks.useRotateToken as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    });

    render(<RotateConfirmModal client={mockClient} onClose={mockOnClose} onSuccess={mockOnSuccess} />, { wrapper });
    
    fireEvent.click(screen.getByText('Rotate token'));
    expect(mockMutate).toHaveBeenCalledWith(mockClient.app_key, expect.any(Object));
  });

  it('calls onClose when cancel is clicked', () => {
    render(<RotateConfirmModal client={mockClient} onClose={mockOnClose} onSuccess={mockOnSuccess} />, { wrapper });
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
