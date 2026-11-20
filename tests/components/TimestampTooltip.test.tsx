import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { format } from 'date-fns';
import { LogRow } from '@/src/components/LogRow';
import { LogEntry } from '@/src/types';

const log: LogEntry = {
  id: '01HZY0000000000000000000001',
  trace_id: '123e4567-e89b-12d3-a456-426614174000',
  batch_id: null,
  app_key: 'my-app',
  app_id: 'web',
  user_agent: 'Mozilla/5.0',
  level: 'info',
  category: 'http',
  message: 'Request handled',
  context: null,
  timestamp: '2026-11-20T19:30:15.123Z',
  created_at: '2026-11-20T19:30:15.123Z',
};

describe('Timestamp tooltip', () => {
  it('shows the full time outside the row on hover and hides it on leave', () => {
    const { container } = render(
      <LogRow log={log} onFilterBatch={vi.fn()} onFilterTrace={vi.fn()} onFilterContext={vi.fn()} />,
    );
    expect(screen.queryByTestId('timestamp-tooltip')).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('timestamp'));
    const tooltip = screen.getByTestId('timestamp-tooltip');
    expect(tooltip).toHaveTextContent(format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS'));
    // Drawn outside the row so the row's content-visibility clipping cannot hide it.
    expect(container.contains(tooltip)).toBe(false);

    fireEvent.mouseLeave(screen.getByTestId('timestamp'));
    expect(screen.queryByTestId('timestamp-tooltip')).not.toBeInTheDocument();
  });

  it('closes when the page scrolls', () => {
    render(<LogRow log={log} onFilterBatch={vi.fn()} onFilterTrace={vi.fn()} onFilterContext={vi.fn()} />);
    fireEvent.mouseEnter(screen.getByTestId('timestamp'));
    fireEvent.scroll(window);
    expect(screen.queryByTestId('timestamp-tooltip')).not.toBeInTheDocument();
  });
});
