import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextProperties } from '@/src/components/ContextProperties';

describe('ContextProperties', () => {
  it('lists each property as a path/value row instead of JSON', () => {
    render(
      <ContextProperties
        context={{ user: 'ana', order: { id: 42 } }}
        onFind={vi.fn()}
        onExclude={vi.fn()}
      />,
    );

    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('ana')).toBeInTheDocument();
    expect(screen.getByText('order.id')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.queryByText(/"user"/)).not.toBeInTheDocument();
  });

  it('calls onFind and onExclude with the path and string value', () => {
    const onFind = vi.fn();
    const onExclude = vi.fn();
    render(<ContextProperties context={{ order: { id: 42 } }} onFind={onFind} onExclude={onExclude} />);

    fireEvent.click(screen.getByLabelText('Find order.id'));
    fireEvent.click(screen.getByLabelText('Exclude order.id'));

    expect(onFind).toHaveBeenCalledWith('order.id', '42');
    expect(onExclude).toHaveBeenCalledWith('order.id', '42');
  });

  it('offers no search actions for array values', () => {
    render(<ContextProperties context={{ tags: ['a'] }} onFind={vi.fn()} onExclude={vi.fn()} />);

    expect(screen.queryByLabelText('Find tags')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Copy tags')).toBeInTheDocument();
  });

  it('shows a placeholder when there is no context', () => {
    render(<ContextProperties context={null} onFind={vi.fn()} onExclude={vi.fn()} />);

    expect(screen.getByText('No context properties')).toBeInTheDocument();
  });
});
