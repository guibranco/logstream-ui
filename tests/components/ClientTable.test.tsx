import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

    const editButtons = screen.getAllByTitle('Edit application');
    fireEvent.click(editButtons[0]);
    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockClients[0]);

    const rotateButtons = screen.getAllByTitle('Rotate API token');
    fireEvent.click(rotateButtons[0]);
    expect(mockHandlers.onRotate).toHaveBeenCalledWith(mockClients[0]);

    const deleteButtons = screen.getAllByTitle('Delete application');
    fireEvent.click(deleteButtons[0]);
    expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockClients[0]);
  });
});
