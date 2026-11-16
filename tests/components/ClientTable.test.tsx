import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { ClientTable } from '@/src/components/clients/ClientTable';
import { Client } from '@/src/types';

const mockClients: Client[] = [
  {
    name: 'Billing API',
    app_key: 'billing-api',
    active: true,
    created_at: '2026-04-01T12:00:00+00:00',
    updated_at: '2026-04-01T12:00:00+00:00',
  },
  {
    name: 'Auth Service',
    app_key: 'auth-service',
    active: false,
    created_at: '2026-04-02T12:00:00+00:00',
    updated_at: '2026-04-02T12:00:00+00:00',
  }
];

describe('ClientTable', () => {
  const mockHandlers = {
    onEdit: vi.fn(),
    onRotate: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders loading state with skeletons', () => {
    const { container } = render(
      <ClientTable 
        clients={[]} 
        isLoading={true} 
        rotatedAppKeys={new Set()} 
        {...mockHandlers} 
      />
    );
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders empty state when no clients exist', () => {
    render(
      <ClientTable 
        clients={[]} 
        isLoading={false} 
        rotatedAppKeys={new Set()} 
        {...mockHandlers} 
      />
    );
    expect(screen.getByText(/No applications registered/i)).toBeInTheDocument();
  });

  it('renders client rows correctly', () => {
    render(
      <ClientTable 
        clients={mockClients} 
        isLoading={false} 
        rotatedAppKeys={new Set()} 
        {...mockHandlers} 
      />
    );
    
    expect(screen.getByText('Billing API')).toBeInTheDocument();
    expect(screen.getByText('billing-api')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    
    expect(screen.getByText('Auth Service')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows rotated token indicator when app_key is in rotatedAppKeys', () => {
    const rotated = new Set(['billing-api']);
    render(
      <ClientTable 
        clients={mockClients} 
        isLoading={false} 
        rotatedAppKeys={rotated} 
        {...mockHandlers} 
      />
    );
    
    expect(screen.getByText(/Token rotated — update your app/i)).toBeInTheDocument();
  });

  it('calls action handlers when buttons are clicked', () => {
    render(
      <ClientTable 
        clients={mockClients} 
        isLoading={false} 
        rotatedAppKeys={new Set()} 
        {...mockHandlers} 
      />
    );

    // Rows are sorted by urgency: the inactive Auth Service comes first.
    const billingRow = screen.getByText('billing-api').closest('tr')!;

    fireEvent.click(within(billingRow).getByTitle('Edit application'));
    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockClients[0]);

    fireEvent.click(within(billingRow).getByTitle('Rotate API token'));
    expect(mockHandlers.onRotate).toHaveBeenCalledWith(mockClients[0]);

    fireEvent.click(within(billingRow).getByTitle('Delete application'));
    expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockClients[0]);
  });

  describe('health', () => {
    const NOW = new Date('2026-04-17T15:09:00Z');

    const healthClients: Client[] = [
      {
        name: 'Active App', app_key: 'active-app', active: true,
        created_at: '2026-04-01T12:00:00+00:00', updated_at: '2026-04-01T12:00:00+00:00',
        last_seen_at: '2026-04-17T15:06:00+00:00', heartbeat_timeout_min: 10, status: 'active',
      },
      {
        name: 'Silent App', app_key: 'silent-app', active: true,
        created_at: '2026-04-01T12:00:00+00:00', updated_at: '2026-04-01T12:00:00+00:00',
        last_seen_at: '2026-04-17T14:22:00+00:00', heartbeat_timeout_min: 10, status: 'silent',
      },
      {
        name: 'New App', app_key: 'new-app', active: true,
        created_at: '2026-04-01T12:00:00+00:00', updated_at: '2026-04-01T12:00:00+00:00',
        last_seen_at: null, heartbeat_timeout_min: null, status: 'never_seen',
      },
      {
        name: 'Disabled App', app_key: 'disabled-app', active: false,
        created_at: '2026-04-01T12:00:00+00:00', updated_at: '2026-04-01T12:00:00+00:00',
        last_seen_at: '2026-04-17T15:08:00+00:00', heartbeat_timeout_min: null, status: 'active',
      },
    ];

    afterEach(() => {
      vi.useRealTimers();
    });

    const renderHealth = (clients = healthClients) =>
      render(<ClientTable clients={clients} isLoading={false} rotatedAppKeys={new Set()} {...mockHandlers} />);

    it('shows a Last seen column with relative times', () => {
      vi.useFakeTimers({ now: NOW });
      renderHealth();

      expect(screen.getByText('Last seen')).toBeInTheDocument();
      expect(screen.getByText('3 min ago')).toBeInTheDocument();
      expect(screen.getByText('47 min ago')).toBeInTheDocument();
      expect(screen.getByText('Never')).toBeInTheDocument();
    });

    it('shows Active / Silent / Never seen / Inactive pills', () => {
      vi.useFakeTimers({ now: NOW });
      renderHealth();

      const pill = (appKey: string) =>
        screen.getByText(appKey).closest('tr')!.querySelector('[data-status]')!.getAttribute('data-status');

      expect(pill('active-app')).toBe('active');
      expect(pill('silent-app')).toBe('silent');
      expect(pill('new-app')).toBe('never_seen');
      expect(pill('disabled-app')).toBe('inactive');
      expect(screen.getByText('Silent')).toBeInTheDocument();
      expect(screen.getByText('Never seen')).toBeInTheDocument();
    });

    it('sorts by urgency: inactive, silent, never seen, active', () => {
      vi.useFakeTimers({ now: NOW });
      renderHealth();

      const keys = screen.getAllByRole('row').slice(1).map((row) => row.querySelector('code')!.textContent);
      expect(keys).toEqual(['disabled-app', 'silent-app', 'new-app', 'active-app']);
    });

    it('puts last seen, threshold and silence duration in the Silent tooltip', () => {
      vi.useFakeTimers({ now: NOW });
      renderHealth();

      const title = screen.getByText('Silent').closest('[data-status]')!.getAttribute('title')!;
      expect(title).toMatch(/^Last seen: 2026-04-17 \d\d:22:00$/m);
      expect(title).toContain('Silence threshold: 10 minutes');
      expect(title).toContain('Silent for: 47 minutes');
    });

    it('updates relative times and turns Active into Silent every minute without refetching', () => {
      vi.useFakeTimers({ now: NOW });
      renderHealth([healthClients[0]]);
      expect(screen.getByText('3 min ago')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(8 * 60_000);
      });

      expect(screen.getByText('11 min ago')).toBeInTheDocument();
      expect(screen.getByText('Silent')).toBeInTheDocument();
    });

    it('falls back to Active/Inactive and a dash on servers without health', () => {
      renderHealth(mockClients);

      expect(screen.getAllByText('—')).toHaveLength(2);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });
});
