import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransportBadge } from '@/src/components/TransportBadge';

describe('TransportBadge', () => {
  it('renders TCP and UDP with distinct styles', () => {
    render(<><TransportBadge transport="tcp" /><TransportBadge transport="udp" /></>);
    expect(screen.getByText('tcp')).toHaveClass('text-gray-400');
    expect(screen.getByText('udp')).toHaveClass('text-violet-300');
  });

  it('renders nothing when the transport is unknown', () => {
    const { container } = render(<><TransportBadge transport={null} /><TransportBadge transport={undefined} /></>);
    expect(container).toBeEmptyDOMElement();
  });
});
