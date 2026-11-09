import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '@/src/components/FilterBar';

describe('FilterBar context filters', () => {
  it('shows no context row when there are no context filters', () => {
    render(<FilterBar filters={{}} onSearch={vi.fn()} />);
    expect(screen.queryByTestId('context-filters')).not.toBeInTheDocument();
  });

  it('shows include and exclude filters as chips', () => {
    render(
      <FilterBar
        filters={{ context: { 'order.id': '42' }, context_not: { role: 'bot' } }}
        onSearch={vi.fn()}
      />,
    );

    expect(screen.getByText('order.id = 42')).toBeInTheDocument();
    expect(screen.getByText('role ≠ bot')).toBeInTheDocument();
  });

  it('removing a chip searches again without that filter', () => {
    const onSearch = vi.fn();
    render(
      <FilterBar
        filters={{ level: 'error', context: { 'order.id': '42' }, context_not: { role: 'bot' } }}
        onSearch={onSearch}
      />,
    );

    fireEvent.click(screen.getByLabelText('Remove context filter role'));

    expect(onSearch).toHaveBeenCalledWith({
      level: 'error',
      context: { 'order.id': '42' },
      context_not: undefined,
    });
  });
});
