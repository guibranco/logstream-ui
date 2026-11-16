import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LogTable } from '@/src/components/LogTable';
import { LogEntry } from '@/src/types';

const exportLogsImage = vi.fn();
vi.mock('@/src/lib/exportImage', () => ({
  exportLogsImage: (...args: unknown[]) => exportLogsImage(...args),
}));

const entry = (i: number): LogEntry => {
  const timestamp = new Date(Date.UTC(2026, 10, 14, 18, 0, 59 - i)).toISOString();
  return {
    id: `id-${i}`,
    trace_id: '123e4567-e89b-12d3-a456-426614174000',
    batch_id: null,
    app_key: 'app',
    app_id: 'web',
    user_agent: null,
    level: 'error',
    category: 'db',
    message: `Message ${i}`,
    context: null,
    timestamp,
    created_at: timestamp,
  };
};

const setup = (logs = Array.from({ length: 5 }, (_, i) => entry(i))) =>
  render(
    <LogTable
      logs={logs}
      pendingCount={0}
      total={42}
      hasMore={false}
      isLoading={false}
      isLoadingOlder={false}
      error={null}
      isPaused={false}
      isLiveEnabled
      onLoadOlder={vi.fn()}
      onShowPending={vi.fn()}
      onResume={vi.fn()}
      onShowEarlier={vi.fn()}
      onHoldChange={vi.fn()}
      onFilterBatch={vi.fn()}
      onFilterTrace={vi.fn()}
      onFilterContext={vi.fn()}
      onRetry={vi.fn()}
      filters={{ level: 'error' }}
    />,
  );

beforeEach(() => {
  exportLogsImage.mockReset().mockResolvedValue('file.png');
});

describe('Export as image', () => {
  it('exports every loaded event in the view', async () => {
    setup();
    fireEvent.click(screen.getByTestId('export-view-image-button'));
    expect(screen.getByTestId('export-view-image-menu')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('export-view-image-png'));

    expect(exportLogsImage).toHaveBeenCalledTimes(1);
    const [logs, fmt, options] = exportLogsImage.mock.lastCall!;
    expect((logs as LogEntry[]).map(l => l.id)).toEqual(['id-0', 'id-1', 'id-2', 'id-3', 'id-4']);
    expect(fmt).toBe('png');
    expect(options).toMatchObject({ scope: 'view', total: 42, loadedCount: 5, filters: { level: 'error' } });
    expect(screen.queryByTestId('export-view-image-menu')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('export-view-image-button')).toHaveTextContent('Exported'));
  });

  it('exports only the selected events from the selection bar', () => {
    setup();
    fireEvent.click(screen.getByText('Message 1'), { ctrlKey: true });
    fireEvent.click(screen.getByText('Message 3'), { ctrlKey: true });
    fireEvent.click(screen.getByTestId('export-selected-image-button'));
    fireEvent.click(screen.getByTestId('export-selected-image-svg'));

    const [logs, fmt, options] = exportLogsImage.mock.lastCall!;
    expect((logs as LogEntry[]).map(l => l.id)).toEqual(['id-1', 'id-3']);
    expect(fmt).toBe('svg');
    expect(options).toMatchObject({ scope: 'selection', loadedCount: 5 });
  });

  it('shows a failed export on the button', async () => {
    exportLogsImage.mockRejectedValue(new Error('too large'));
    setup();
    fireEvent.click(screen.getByTestId('export-view-image-button'));
    fireEvent.click(screen.getByTestId('export-view-image-jpeg'));
    await waitFor(() => expect(screen.getByTestId('export-view-image-button')).toHaveTextContent('Export failed'));
    expect(screen.getByTestId('export-view-image-button')).toHaveAttribute('title', 'too large');
  });

  it('closes the menu on Escape', () => {
    setup();
    fireEvent.click(screen.getByTestId('export-view-image-button'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('export-view-image-menu')).not.toBeInTheDocument();
  });

  it('offers no view export without events', () => {
    setup([]);
    expect(screen.queryByTestId('export-view-image-button')).not.toBeInTheDocument();
  });
});
