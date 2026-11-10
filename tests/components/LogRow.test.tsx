import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LogRow } from '@/src/components/LogRow';
import { LogEntry } from '@/src/types';

const baseLog: LogEntry = {
  id: '01HZY0000000000000000000000',
  trace_id: '123e4567-e89b-12d3-a456-426614174000',
  batch_id: null,
  app_key: 'my-app',
  app_id: 'web',
  user_agent: 'Mozilla/5.0',
  level: 'info',
  category: 'http',
  message: 'Request handled',
  context: null,
  timestamp: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

const renderRow = (log: LogEntry, onFilterContext = vi.fn()) => {
  render(
    <LogRow log={log} onFilterBatch={vi.fn()} onFilterTrace={vi.fn()} onFilterContext={onFilterContext} />,
  );
  fireEvent.click(screen.getAllByText('Request handled')[0]);
};

describe('LogRow', () => {
  it('shows the sender IP in the expanded details', () => {
    renderRow({ ...baseLog, sender_ip: '203.0.113.42' });
    expect(screen.getByText('Sender IP')).toBeInTheDocument();
    expect(screen.getByTestId('sender-ip')).toHaveTextContent('203.0.113.42');
    expect(screen.getByLabelText('Copy sender IP')).toBeInTheDocument();
  });

  it('falls back to N/A when the server does not send a sender IP', () => {
    renderRow(baseLog);
    expect(screen.getByTestId('sender-ip')).toHaveTextContent('N/A');
    expect(screen.queryByLabelText('Copy sender IP')).not.toBeInTheDocument();
  });

  it('renders URLs in the user agent as links that open in a new tab', () => {
    renderRow({ ...baseLog, user_agent: 'MyBot/2.0 (+https://example.com/bot)' });
    const link = screen.getByRole('link', { name: 'https://example.com/bot' });
    expect(link).toHaveAttribute('href', 'https://example.com/bot');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByTestId('user-agent')).toHaveTextContent('MyBot/2.0 (+https://example.com/bot)');
  });

  it('renders a user agent without URLs as plain text', () => {
    renderRow(baseLog);
    expect(screen.getByTestId('user-agent')).toHaveTextContent('Mozilla/5.0');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('turns context Find / Exclude clicks into context filters', () => {
    const onFilterContext = vi.fn();
    renderRow({ ...baseLog, context: { order: { id: 42 } } }, onFilterContext);

    fireEvent.click(screen.getByLabelText('Find order.id'));
    fireEvent.click(screen.getByLabelText('Exclude order.id'));

    expect(onFilterContext).toHaveBeenNthCalledWith(1, 'order.id', '42', false);
    expect(onFilterContext).toHaveBeenNthCalledWith(2, 'order.id', '42', true);
  });
});

describe('LogRow level dot', () => {
  const dotFor = (level: LogEntry['level']) => {
    const { unmount } = render(
      <LogRow log={{ ...baseLog, level }} onFilterBatch={vi.fn()} onFilterTrace={vi.fn()} onFilterContext={vi.fn()} />,
    );
    const dot = screen.queryByTestId('level-dot');
    const result = dot ? { className: dot.className, label: dot.textContent } : null;
    unmount();
    return result;
  };

  it('marks warning yellow, error red and critical purple', () => {
    expect(dotFor('warning')).toMatchObject({ label: 'Warning', className: expect.stringContaining('bg-yellow-400') });
    expect(dotFor('error')).toMatchObject({ label: 'Error', className: expect.stringContaining('bg-red-500') });
    expect(dotFor('critical')).toMatchObject({ label: 'Critical', className: expect.stringContaining('bg-purple-500') });
  });

  it('shows no dot for debug, info and notice', () => {
    expect(dotFor('debug')).toBeNull();
    expect(dotFor('info')).toBeNull();
    expect(dotFor('notice')).toBeNull();
  });
});

describe('LogRow message template', () => {
  const templated: LogEntry = {
    ...baseLog,
    message: 'Charge 1234 failed: true',
    message_template: 'Charge {invoice_id} failed: {retry}',
    context: { invoice_id: 1234, retry: true },
  };

  const expand = (log: LogEntry, onFilterTemplate = vi.fn()) => {
    render(
      <LogRow
        log={log}
        onFilterBatch={vi.fn()}
        onFilterTrace={vi.fn()}
        onFilterContext={vi.fn()}
        onFilterTemplate={onFilterTemplate}
      />,
    );
    fireEvent.click(screen.getByText(log.message.split(' ')[0], { exact: false }));
    return onFilterTemplate;
  };

  it('colours each rendered value by type in the row and the expanded message', () => {
    expand(templated);
    const values = screen.getAllByTestId('template-value');
    // Two values, shown in the row and again in the full message.
    expect(values).toHaveLength(4);
    expect(values[0]).toHaveTextContent('1234');
    expect(values[0]).toHaveAttribute('data-kind', 'number');
    expect(values[0]).toHaveAttribute('title', 'invoice_id');
    expect(values[1]).toHaveAttribute('data-kind', 'boolean');
  });

  it('shows the template with its placeholders and filters by it', () => {
    const onFilterTemplate = expand(templated);
    expect(screen.getByTestId('message-template')).toHaveTextContent('Charge {invoice_id} failed: {retry}');
    expect(screen.getAllByTestId('template-placeholder').map(p => p.textContent)).toEqual(['{invoice_id}', '{retry}']);

    fireEvent.click(screen.getByRole('button', { name: /view all with this template/i }));
    expect(onFilterTemplate).toHaveBeenCalledWith('Charge {invoice_id} failed: {retry}');
  });

  it('shows no template section for entries without one', () => {
    expand({ ...baseLog });
    expect(screen.queryByTestId('message-template')).not.toBeInTheDocument();
    expect(screen.queryByTestId('template-value')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view all with this template/i })).not.toBeInTheDocument();
  });
});
