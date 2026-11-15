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

  it('suggests the app key from the display name while typing', () => {
    render(<ClientForm client={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />, { wrapper });

    fireEvent.change(screen.getByPlaceholderText('e.g. Billing service'), { target: { value: 'Billing Serviço' } });
    expect(screen.getByPlaceholderText('e.g. billing-api')).toHaveValue('billing-servico');

    fireEvent.change(screen.getByPlaceholderText('e.g. Billing service'), { target: { value: 'Billing Serviço API' } });
    expect(screen.getByPlaceholderText('e.g. billing-api')).toHaveValue('billing-servico-api');
  });

  it('submits the suggested key', () => {
    const mockMutate = vi.fn();
    (useClientsHooks.useCreateClient as any).mockReturnValue({ mutate: mockMutate, isPending: false, error: null });

    render(<ClientForm client={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />, { wrapper });
    fireEvent.change(screen.getByPlaceholderText('e.g. Billing service'), { target: { value: 'My App' } });
    fireEvent.click(screen.getByText('Register App'));

    expect(mockMutate).toHaveBeenCalledWith({ name: 'My App', app_key: 'my-app' }, expect.any(Object));
  });

  it('stops following the name once the user types their own key, and can switch back', () => {
    render(<ClientForm client={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />, { wrapper });
    const nameInput = screen.getByPlaceholderText('e.g. Billing service');
    const keyInput = screen.getByPlaceholderText('e.g. billing-api');

    fireEvent.change(nameInput, { target: { value: 'Billing' } });
    fireEvent.change(keyInput, { target: { value: 'pay-api' } });
    fireEvent.change(nameInput, { target: { value: 'Billing Service' } });
    expect(keyInput).toHaveValue('pay-api');
    expect(screen.getByText('billing-service')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Use suggested'));
    expect(keyInput).toHaveValue('billing-service');
    expect(screen.queryByText('Use suggested')).not.toBeInTheDocument();
  });

  it('"Type my own" keeps the current suggestion as a starting point', () => {
    render(<ClientForm client={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />, { wrapper });
    const nameInput = screen.getByPlaceholderText('e.g. Billing service');
    const keyInput = screen.getByPlaceholderText('e.g. billing-api');

    fireEvent.change(nameInput, { target: { value: 'Billing' } });
    fireEvent.click(screen.getByText('Type my own'));
    expect(screen.queryByText('Type my own')).not.toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'Billing Worker' } });
    expect(keyInput).toHaveValue('billing');
    expect(screen.getByText('Use suggested')).toBeInTheDocument();
  });

  it('does not offer suggestions when editing', () => {
    const existingClient = { name: 'Existing App', app_key: 'existing-key', active: true, created_at: '2026-01-01', updated_at: '2026-01-01' };
    render(<ClientForm client={existingClient} onClose={mockOnClose} onSuccess={mockOnSuccess} />, { wrapper });

    fireEvent.change(screen.getByDisplayValue('Existing App'), { target: { value: 'Renamed App' } });
    expect(screen.getByDisplayValue('existing-key')).toBeInTheDocument();
    expect(screen.queryByText('Type my own')).not.toBeInTheDocument();
    expect(screen.queryByText('Use suggested')).not.toBeInTheDocument();
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
