import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LogTable } from '@/src/components/LogTable';
import { LogEntry } from '@/src/types';

const entry = (i: number): LogEntry => ({
  id: `id-${i}`,
  trace_id: '123e4567-e89b-12d3-a456-426614174000',
  batch_id: null,
  app_key: 'app',
  app_id: 'web',
  user_agent: null,
  level: 'info',
  category: 'http',
  message: `Message ${i}`,
  context: null,
  timestamp: new Date().toISOString(),
  created_at: new Date().toISOString(),
});

const setup = (overrides: Partial<React.ComponentProps<typeof LogTable>> = {}) => {
  const props: React.ComponentProps<typeof LogTable> = {
    logs: Array.from({ length: 300 }, (_, i) => entry(i)),
    pendingCount: 0,
    total: 300,
    hasMore: false,
    isLoading: false,
    isLoadingOlder: false,
    error: null,
    isPaused: false,
    isLiveEnabled: true,
    onLoadOlder: vi.fn(),
    onShowPending: vi.fn(),
    onHoldChange: vi.fn(),
    onFilterBatch: vi.fn(),
    onFilterTrace: vi.fn(),
    onFilterContext: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
  const view = render(<LogTable {...props} />);
  return { props, view };
};

describe('LogTable', () => {
  it('renders every loaded event, not only the first screen', () => {
    setup();
    expect(screen.getByText('Message 0')).toBeInTheDocument();
    expect(screen.getByText('Message 299')).toBeInTheDocument();
  });

  it('holds new events while an event is expanded and resumes when it collapses', () => {
    const { props } = setup();
    expect(props.onHoldChange).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByText('Message 5'));
    expect(props.onHoldChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('Paused while an event is expanded')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('Message 5')[0]);
    expect(props.onHoldChange).toHaveBeenLastCalledWith(false);
  });

  it('holds new events while scrolled away from the top', () => {
    const { props } = setup();
    const scroller = screen.getByTestId('log-scroller');
    scroller.scrollTop = 500;
    fireEvent.scroll(scroller);
    expect(props.onHoldChange).toHaveBeenLastCalledWith(true);

    scroller.scrollTop = 0;
    fireEvent.scroll(scroller);
    expect(props.onHoldChange).toHaveBeenLastCalledWith(false);
  });

  it('shows held events from the banner', () => {
    const { props } = setup({ pendingCount: 3, isPaused: true });
    fireEvent.click(screen.getByTestId('pending-banner'));
    expect(props.onShowPending).toHaveBeenCalled();
  });

  it('asks for older events when the end of the list is reached', () => {
    // jsdom has no layout: every size is 0, so the bottom counts as reached.
    const { props } = setup({ hasMore: true });
    expect(props.onLoadOlder).toHaveBeenCalled();
  });

  it('does not ask for older events when there are none', () => {
    const { props } = setup({ hasMore: false });
    expect(props.onLoadOlder).not.toHaveBeenCalled();
    expect(screen.getByText('No older events')).toBeInTheDocument();
  });
});
