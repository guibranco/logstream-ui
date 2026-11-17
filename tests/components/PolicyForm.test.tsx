import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PolicyForm } from '@/src/components/retention/PolicyForm';
import * as useRetentionHooks from '@/src/hooks/useRetentionPolicies';

vi.mock('@/src/hooks/useRetentionPolicies', () => ({
  useCreatePolicy: vi.fn(),
  useUpdatePolicy: vi.fn(),
}));

const appKeyOptions = [
  { appKey: 'billing-api', name: 'Billing service' },
  { appKey: 'vinhedo-nginx' },
];

describe('PolicyForm', () => {
  const createMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRetentionHooks.useCreatePolicy as any).mockReturnValue({ mutate: createMutate, isPending: false });
    (useRetentionHooks.useUpdatePolicy as any).mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('lists the app keys to pick from', () => {
    render(<PolicyForm policy={null} appKeyOptions={appKeyOptions} onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId('app-key-button'));
    const list = screen.getByRole('listbox', { name: 'Applications' });

    expect(within(list).getByText('billing-api')).toBeInTheDocument();
    expect(within(list).getByText('Billing service')).toBeInTheDocument();
    expect(within(list).getByText('vinhedo-nginx')).toBeInTheDocument();
  });

  it('sends the picked app key with the policy', () => {
    render(<PolicyForm policy={null} appKeyOptions={appKeyOptions} onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('e.g. remove-old-debug'), { target: { value: 'drop-nginx' } });
    fireEvent.click(screen.getByTestId('app-key-button'));
    fireEvent.click(screen.getByText('vinhedo-nginx'));
    fireEvent.click(screen.getByText('Create Policy'));

    expect(screen.getByTestId('app-key-button')).toHaveTextContent('vinhedo-nginx');
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'drop-nginx', app_key: 'vinhedo-nginx' }),
      expect.anything(),
    );
  });

  it('labels app ID without calling it an environment', () => {
    render(<PolicyForm policy={null} appKeyOptions={appKeyOptions} onClose={vi.fn()} />);

    expect(screen.getByText('App ID')).toBeInTheDocument();
    expect(screen.queryByText(/env/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('e.g. api-01'), { target: { value: 'vinhedo-1' } });
    expect(screen.getByText(/with app ID vinhedo-1/)).toBeInTheDocument();
    expect(screen.queryByText(/env:/)).not.toBeInTheDocument();
  });

  it('hides the transport when the server does not support it', () => {
    render(<PolicyForm policy={null} appKeyOptions={appKeyOptions} onClose={vi.fn()} />);
    expect(screen.queryByLabelText('Transport')).not.toBeInTheDocument();
  });

  it('sends the picked transport and describes it in the summary', () => {
    render(<PolicyForm policy={null} appKeyOptions={appKeyOptions} transportFilters onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('e.g. remove-old-debug'), { target: { value: 'drop-udp' } });
    fireEvent.change(screen.getByLabelText('Transport'), { target: { value: 'udp' } });

    expect(screen.getByText(/entries received over UDP/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Create Policy'));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'drop-udp', transport: 'udp' }),
      expect.anything(),
    );
  });

  it('sends no transport when left at any', () => {
    render(<PolicyForm policy={null} appKeyOptions={appKeyOptions} transportFilters onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('e.g. remove-old-debug'), { target: { value: 'drop-all' } });
    fireEvent.click(screen.getByText('Create Policy'));

    expect(createMutate.mock.calls[0][0].transport).toBeUndefined();
  });
});
