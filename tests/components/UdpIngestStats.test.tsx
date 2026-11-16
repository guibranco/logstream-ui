import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UdpIngestStats } from '@/src/components/UdpIngestStats';

describe('UdpIngestStats', () => {
  it('shows listening state and counters', () => {
    render(
      <UdpIngestStats
        udp={{ enabled: true, port: 8082, listening: true, received: 12, accepted: 9, dropped: 1, rejected: { bad_signature: 2 }, nonces: 9 }}
      />,
    );

    expect(screen.getByText('Port 8082')).toBeInTheDocument();
    expect(screen.getByText('Listening')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // 2 rejected + 1 not stored
    expect(screen.getByText('Bad signature')).toBeInTheDocument();
    expect(screen.getByText('Not stored')).toBeInTheDocument();
  });

  it('lists rejection reasons by count and keeps unknown reasons readable', () => {
    render(
      <UdpIngestStats
        udp={{ enabled: true, port: 8082, listening: true, received: 5, accepted: 0, dropped: 0, rejected: { stale: 1, source_not_allowed: 3, brand_new: 1 } }}
      />,
    );

    const items = screen.getAllByRole('listitem').map(li => li.textContent);
    expect(items[0]).toBe('Source not allowed3');
    expect(items).toContain('Outside time window1');
    expect(items).toContain('brand_new1');
  });

  it('flags a socket that is not bound', () => {
    render(<UdpIngestStats udp={{ enabled: true, port: 8082, listening: false, rejected: {} }} />);
    expect(screen.getByText('Not listening')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('says when UDP ingest is off, and handles loading and errors', () => {
    const { rerender } = render(<UdpIngestStats udp={{ enabled: false }} />);
    expect(screen.getByText(/turned off/i)).toBeInTheDocument();

    rerender(<UdpIngestStats isLoading />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    rerender(<UdpIngestStats isError />);
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
  });
});
