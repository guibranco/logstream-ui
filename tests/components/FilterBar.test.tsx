import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '@/src/components/FilterBar';

const openAdvanced = () => fireEvent.click(screen.getByRole('button', { name: /advanced filters/i }));

describe('FilterBar context filters', () => {
  it('shows no context row when there are no context filters', () => {
    render(<FilterBar filters={{}} onSearch={vi.fn()} />);
    expect(screen.queryByTestId('context-filters')).not.toBeInTheDocument();
  });

  it('shows include, exclude and search filters as chips', () => {
    render(
      <FilterBar
        filters={{ context: { 'order.id': '42' }, context_not: { role: 'bot' }, context_search: 'card_declined' }}
        onSearch={vi.fn()}
      />,
    );

    expect(screen.getByText('order.id = 42')).toBeInTheDocument();
    expect(screen.getByText('role ≠ bot')).toBeInTheDocument();
    expect(screen.getByText(/contains “card_declined”/)).toBeInTheDocument();
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

  it('removing the search chip clears context_search', () => {
    const onSearch = vi.fn();
    render(<FilterBar filters={{ context_search: 'card' }} onSearch={onSearch} />);

    fireEvent.click(screen.getByLabelText('Remove context search'));

    expect(onSearch).toHaveBeenCalledWith({ context_search: undefined });
  });
});

describe('FilterBar advanced filters', () => {
  it('is collapsed by default and opens on click', () => {
    render(<FilterBar filters={{}} onSearch={vi.fn()} />);

    expect(screen.queryByLabelText('Context contains')).not.toBeInTheDocument();
    openAdvanced();
    expect(screen.getByLabelText('Context contains')).toBeInTheDocument();
  });

  it('starts open when context filters are active', () => {
    render(<FilterBar filters={{ context: { code: 'x' } }} onSearch={vi.fn()} />);

    expect(screen.getByLabelText('Context filter 1 key')).toHaveValue('code');
  });

  it('submits the free-text term and builder rows as context params', () => {
    const onSearch = vi.fn();
    render(<FilterBar filters={{}} onSearch={onSearch} />);
    openAdvanced();

    fireEvent.change(screen.getByLabelText('Context contains'), { target: { value: '  card_declined ' } });

    fireEvent.click(screen.getByText('Add context filter'));
    fireEvent.change(screen.getByLabelText('Context filter 1 key'), { target: { value: 'invoice_id' } });
    fireEvent.change(screen.getByLabelText('Context filter 1 value'), { target: { value: '1234' } });

    fireEvent.click(screen.getByText('Add context filter'));
    fireEvent.change(screen.getByLabelText('Context filter 2 key'), { target: { value: 'role' } });
    fireEvent.change(screen.getByLabelText('Context filter 2 operator'), { target: { value: 'ne' } });
    fireEvent.change(screen.getByLabelText('Context filter 2 value'), { target: { value: 'bot' } });

    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    expect(onSearch).toHaveBeenCalledWith({
      context_search: 'card_declined',
      context: { invoice_id: '1234' },
      context_not: { role: 'bot' },
    });
  });

  it('removes a builder row', () => {
    render(<FilterBar filters={{ context: { a: '1', b: '2' } }} onSearch={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Remove context filter 1'));

    expect(screen.getAllByTestId('context-row')).toHaveLength(1);
    expect(screen.getByLabelText('Context filter 1 key')).toHaveValue('b');
  });

  it('blocks the search while the input is invalid', () => {
    const onSearch = vi.fn();
    render(<FilterBar filters={{}} onSearch={onSearch} />);
    openAdvanced();

    fireEvent.change(screen.getByLabelText('Context contains'), { target: { value: 'ab' } });

    expect(screen.getByRole('alert')).toHaveTextContent('at least 3 characters');
    expect(screen.getByRole('button', { name: /^search$/i })).toBeDisabled();
  });

  it('explains substring matching in file storage mode', () => {
    render(<FilterBar filters={{}} onSearch={vi.fn()} storageType="file" />);
    openAdvanced();

    expect(screen.getByText(/including inside words/)).toBeInTheDocument();
  });
});
