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

describe('FilterBar levels (Seq style)', () => {
  it('selects several levels at once when the server supports lists', () => {
    const onSearch = vi.fn();
    const { rerender } = render(<FilterBar filters={{ range: '1d' }} onSearch={onSearch} multiValue />);

    fireEvent.click(screen.getByRole('button', { name: 'error' }));
    expect(onSearch).toHaveBeenLastCalledWith({ range: '1d', level: 'error' });

    rerender(<FilterBar filters={{ range: '1d', level: 'error' }} onSearch={onSearch} multiValue />);
    fireEvent.click(screen.getByRole('button', { name: 'critical' }));
    expect(onSearch).toHaveBeenLastCalledWith({ range: '1d', level: ['error', 'critical'] });

    rerender(<FilterBar filters={{ level: ['error', 'critical'] }} onSearch={onSearch} multiValue />);
    expect(screen.getByRole('button', { name: 'error' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'error' }));
    expect(onSearch).toHaveBeenLastCalledWith({ level: 'critical' });
  });

  it('keeps one level at a time on servers without list support', () => {
    const onSearch = vi.fn();
    render(<FilterBar filters={{ level: 'error' }} onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: 'warning' }));
    expect(onSearch).toHaveBeenLastCalledWith({ level: 'warning' });
  });

  it('reset keeps the time range', () => {
    const onSearch = vi.fn();
    render(<FilterBar filters={{ range: '1h', level: 'error', search: 'x' }} onSearch={onSearch} />);
    fireEvent.click(screen.getByTitle('Reset filters'));
    expect(onSearch).toHaveBeenLastCalledWith({ range: '1h', date_from: undefined, date_to: undefined });
  });
});
