import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClientForm } from '@/src/components/clients/ClientForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as useClientsHooks from '@/src/hooks/useClients';

// Mock mutations
vi.mock('@/src/hooks/useClients', () => ({
  useCreateClient: vi.fn(),
  useUpdateClient: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('ClientForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useClientsHooks.useCreateClient as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    });
    (useClientsHooks.useUpdateClient as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    });
  });

  it('renders create form correctly', () => {
    render(<ClientForm client={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />, { wrapper });
    
    expect(screen.getByText('Register Application')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Billing service')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. billing-api')).toBeInTheDocument();
  });

  it('validates app key format live', () => {
    render(<ClientForm client={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />, { wrapper });
    
    const appKeyInput = screen.getByPlaceholderText('e.g. billing-api');
    
    fireEvent.change(appKeyInput, { target: { value: 'Invalid Key!' } });
    expect(screen.getByText(/Lowercase letters, numbers, and hyphens only/i)).toBeInTheDocument();
    
    fireEvent.change(appKeyInput, { target: { value: 'valid-key-123' } });
    expect(screen.getByText(/Unique identifier for your application/i)).toBeInTheDocument();
  });

  it('submits create mutation with correct data', () => {
    const mockMutate = vi.fn();
    (useClientsHooks.useCreateClient as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    });

    render(<ClientForm client={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />, { wrapper });
    
    fireEvent.change(screen.getByPlaceholderText('e.g. Billing service'), { target: { value: 'My App' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. billing-api'), { target: { value: 'my-app' } });
    
    fireEvent.click(screen.getByText('Register App'));
    
    expect(mockMutate).toHaveBeenCalledWith(
      { name: 'My App', app_key: 'my-app' },
      expect.any(Object)
    );
  });

  it('renders edit form with pre-filled data and disabled app key', () => {
    const existingClient = {
      name: 'Existing App',
      app_key: 'existing-key',
      active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };

    render(<ClientForm client={existingClient} onClose={mockOnClose} onSuccess={mockOnSuccess} />, { wrapper });
    
    expect(screen.getByText('Edit Application')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing App')).toBeInTheDocument();
    
    const appKeyInput = screen.getByDisplayValue('existing-key');
    expect(appKeyInput).toBeDisabled();
    
    expect(screen.getByText('Active Status')).toBeInTheDocument();
  });

  it('handles submission errors', () => {
    const apiError = new Error('Client already exists');
    (useClientsHooks.useCreateClient as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: apiError,
    });

    render(<ClientForm client={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />, { wrapper });
    
    expect(screen.getByText('Client already exists')).toBeInTheDocument();
  });
});
