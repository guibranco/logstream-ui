import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LogTable } from '@/src/components/LogTable';
import { LogEntry } from '@/src/types';

// Newest first, one second apart, as the feed holds them.
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

const writeText = vi.fn();

const setup = (overrides: Partial<React.ComponentProps<typeof LogTable>> = {}) => {
  const props: React.ComponentProps<typeof LogTable> = {
    logs: Array.from({ length: 10 }, (_, i) => entry(i)),
    pendingCount: 0,
    total: 10,
    hasMore: false,
    isLoading: false,
    isLoadingOlder: false,
    error: null,
    isPaused: false,
    isLiveEnabled: true,
    onLoadOlder: vi.fn(),
    onShowPending: vi.fn(),
    onResume: vi.fn(),
    onShowEarlier: vi.fn(),
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

const row = (i: number) => screen.getByText(`Message ${i}`);
// Ten events, so one digit; the row's text runs straight into the trace ID.
const selectedMessages = () =>
  Array.from(document.querySelectorAll('[data-selected]')).map(el => el.textContent?.match(/Message \d/)?.[0]);
const copiedLines = () => (writeText.mock.lastCall?.[0] as string).split('\n').map(l => l.split(': ')[1]);

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('LogTable selection', () => {
  it('selects with Ctrl/⌘+click without expanding the event', () => {
    setup();
    fireEvent.click(row(2), { ctrlKey: true });
    fireEvent.click(row(4), { metaKey: true });
    expect(selectedMessages()).toEqual(['Message 2', 'Message 4']);
    expect(screen.queryByText('Full Message')).not.toBeInTheDocument();
    expect(screen.getByTestId('selection-count')).toHaveTextContent('2 selected');
  });

  it('selects a range with Shift+click, in either direction', () => {
    setup();
    fireEvent.click(row(6), { ctrlKey: true });
    fireEvent.click(row(3), { shiftKey: true });
    expect(selectedMessages()).toEqual(['Message 3', 'Message 4', 'Message 5', 'Message 6']);
  });

  it('selects with the row checkbox', () => {
    setup();
    fireEvent.click(screen.getAllByLabelText('Select event')[1]);
    expect(selectedMessages()).toEqual(['Message 1']);
  });

  it('turns plain clicks into selection while selecting, and Esc leaves it', () => {
    setup();
    fireEvent.click(row(1), { ctrlKey: true });
    fireEvent.click(row(2));
    expect(selectedMessages()).toEqual(['Message 1', 'Message 2']);
    fireEvent.click(row(1));
    expect(selectedMessages()).toEqual(['Message 2']);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(selectedMessages()).toEqual([]);

    fireEvent.click(row(2));
    expect(screen.getByText('Full Message')).toBeInTheDocument();
  });

  it('holds new events while selecting', () => {
    const { props } = setup();
    fireEvent.click(row(1), { ctrlKey: true });
    expect(props.onHoldChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('Paused while selecting')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Clear selection'));
    expect(props.onHoldChange).toHaveBeenLastCalledWith(false);
  });

  it('clears the selection when resuming live', () => {
    const { props } = setup();
    fireEvent.click(row(1), { ctrlKey: true });
    fireEvent.click(screen.getByRole('button', { name: /resume live/i }));
    expect(selectedMessages()).toEqual([]);
    expect(props.onHoldChange).toHaveBeenLastCalledWith(false);
  });

  it('selects every loaded event from the header checkbox and clears again', () => {
    setup();
    const all = screen.getByLabelText('Select all loaded events') as HTMLInputElement;
    fireEvent.click(row(0), { ctrlKey: true });
    expect(all.indeterminate).toBe(true);

    fireEvent.click(all);
    expect(selectedMessages()).toHaveLength(10);
    expect(all.checked).toBe(true);

    fireEvent.click(all);
    expect(selectedMessages()).toHaveLength(0);
  });

  it('selects every loaded event with Ctrl/⌘+A only once the list has focus', () => {
    setup();
    fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
    expect(selectedMessages()).toHaveLength(0);

    screen.getByTestId('log-scroller').focus();
    fireEvent.keyDown(window, { key: 'a', metaKey: true });
    expect(selectedMessages()).toHaveLength(10);
  });

  it('copies the selection as lines, oldest first, from the bar', async () => {
    setup();
    fireEvent.click(row(1), { ctrlKey: true });
    fireEvent.click(row(3), { shiftKey: true });
    fireEvent.click(screen.getByTestId('copy-selected-lines'));

    await waitFor(() => expect(screen.getByTestId('copy-selected-lines')).toHaveTextContent('Copied 3'));
    expect(copiedLines()).toEqual(['Message 3', 'Message 2', 'Message 1']);
  });

  it('copies with Ctrl/⌘+C, unless text is highlighted', async () => {
    setup();
    fireEvent.click(row(4), { ctrlKey: true });
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(copiedLines()).toEqual(['Message 4']);

    const getSelection = vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => 'some text' } as Selection);
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    expect(writeText).toHaveBeenCalledTimes(1);
    getSelection.mockRestore();
  });

  it('copies as Markdown and as JSON', async () => {
    setup();
    fireEvent.click(row(0), { ctrlKey: true });
    fireEvent.click(row(1), { ctrlKey: true });

    fireEvent.click(screen.getByTestId('copy-selected-markdown'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.lastCall?.[0]).toContain('## ERROR log event');

    fireEvent.click(screen.getByTestId('copy-selected-json'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(JSON.parse(writeText.mock.lastCall?.[0]).map((l: LogEntry) => l.id)).toEqual(['id-1', 'id-0']);
  });

  it('says so when the clipboard refuses', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    setup();
    fireEvent.click(row(0), { ctrlKey: true });
    fireEvent.click(screen.getByTestId('copy-selected-lines'));
    await waitFor(() => expect(screen.getByTestId('copy-selected-lines')).toHaveTextContent('Copy failed'));
  });

  it('drops events that leave the list from the selection', async () => {
    const { props, view } = setup();
    fireEvent.click(row(1), { ctrlKey: true });
    view.rerender(<LogTable {...props} logs={[entry(5), entry(6)]} />);
    await waitFor(() => expect(screen.queryByTestId('selection-bar')).not.toBeInTheDocument());
    expect(props.onHoldChange).toHaveBeenLastCalledWith(false);
  });

  it('selects with a long press on touch screens without expanding', () => {
    vi.useFakeTimers();
    setup();
    fireEvent.pointerDown(row(2), { pointerType: 'touch' });
    act(() => vi.advanceTimersByTime(600));
    fireEvent.pointerUp(row(2), { pointerType: 'touch' });
    fireEvent.click(row(2));
    expect(selectedMessages()).toEqual(['Message 2']);
    expect(screen.queryByText('Full Message')).not.toBeInTheDocument();
  });

  it('does not select on a short tap', () => {
    vi.useFakeTimers();
    setup();
    fireEvent.pointerDown(row(2), { pointerType: 'touch' });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.pointerUp(row(2), { pointerType: 'touch' });
    fireEvent.click(row(2));
    expect(selectedMessages()).toEqual([]);
    expect(screen.getByText('Full Message')).toBeInTheDocument();
  });
});
