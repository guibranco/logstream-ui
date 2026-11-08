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

const renderRow = (log: LogEntry) => {
  render(<LogRow log={log} onFilterBatch={vi.fn()} onFilterTrace={vi.fn()} />);
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
});
