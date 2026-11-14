import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { RetentionVolumePanel, RetentionVolumeView } from '@/src/components/retention/RetentionVolumePanel';
import { RetentionVolumeReport } from '@/src/types';

const volumeHook = vi.hoisted(() => ({ calls: [] as number[] }));
vi.mock('@/src/hooks/useRetentionVolume', () => ({
  useRetentionVolume: (days: number) => {
    volumeHook.calls.push(days);
    return { data: undefined, isLoading: false, isError: false, error: null, isFetching: false };
  },
}));

const zero = { count: 0, bytes: 0, due_count: 0, due_bytes: 0 };

const report: RetentionVolumeReport = {
  generated_at: new Date().toISOString(),
  days: 3,
  size_basis: 'payload',
  buckets: [
    { date: '2026-11-10', age_days: 2, count: 40, bytes: 4000, due_count: 10, due_bytes: 1000 },
    { date: '2026-11-11', age_days: 1, count: 20, bytes: 2000, due_count: 0, due_bytes: 0 },
    { date: '2026-11-12', age_days: 0, count: 0, bytes: 0, due_count: 0, due_bytes: 0 },
  ],
  older: { count: 5, bytes: 500, due_count: 5, due_bytes: 500 },
  future: zero,
  policies: [
    { name: 'debug-1d', older_than_days: 1, active: true, matched_count: 30, matched_bytes: 3000, due_count: 10, due_bytes: 1000, matched_share: 0.4615 },
    { name: 'all-90d', older_than_days: 90, active: true, matched_count: 65, matched_bytes: 6500, due_count: 0, due_bytes: 0, matched_share: 1 },
    { name: 'nothing', older_than_days: null, active: false, matched_count: 0, matched_bytes: 0, due_count: 0, due_bytes: 0, matched_share: 0 },
  ],
  totals: { count: 65, bytes: 6500, due_count: 15, due_bytes: 1500 },
};

describe('RetentionVolumePanel', () => {
  it('offers a 7-day window and loads it when picked', () => {
    render(<RetentionVolumePanel />);

    const windows = within(screen.getByRole('group', { name: 'Window' })).getAllByRole('button');
    expect(windows.map((b) => b.textContent)).toEqual(['7d', '30d', '90d', '180d', '365d']);

    fireEvent.click(screen.getByRole('button', { name: '7d' }));
    expect(screen.getByRole('button', { name: '7d' })).toHaveAttribute('aria-pressed', 'true');
    expect(volumeHook.calls.at(-1)).toBe(7);
  });
});

describe('RetentionVolumeView', () => {
  it('shows totals and the share due for deletion', () => {
    render(<RetentionVolumeView report={report} metric="count" />);

    expect(screen.getByText('Stored', { selector: 'div' }).nextSibling).toHaveTextContent('65');
    expect(screen.getByText(/23% — eligible for a live retention run/)).toBeInTheDocument();
    expect(screen.getByText('Older than 3 days')).toBeInTheDocument();
  });

  it('draws a marker only for policies inside the window and lists every active one', () => {
    render(<RetentionVolumeView report={report} metric="count" />);

    expect(screen.getByTestId('volume-marker-1')).toBeInTheDocument();
    expect(screen.queryByTestId('volume-marker-2')).not.toBeInTheDocument();

    const list = screen.getByRole('list', { name: 'Retention policy markers' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('debug-1d');
    expect(items[0]).toHaveTextContent('46%');
    expect(items[1]).toHaveTextContent('beyond this window');
    expect(screen.getByText(/Not shown: nothing/)).toBeInTheDocument();
  });

  it('shows future-dated entries only when there are some', () => {
    const { unmount } = render(<RetentionVolumeView report={report} metric="count" />);
    expect(screen.queryByText('Dated in the future')).not.toBeInTheDocument();
    unmount();

    render(<RetentionVolumeView report={{ ...report, future: { count: 3, bytes: 300, due_count: 0, due_bytes: 0 } }} metric="count" />);
    expect(screen.getByText('Dated in the future', { selector: 'div' }).nextSibling).toHaveTextContent('3');
  });

  it('shows out-of-window entries in Size mode even when their size is zero', () => {
    render(
      <RetentionVolumeView
        report={{ ...report, older: { count: 2, bytes: 0, due_count: 0, due_bytes: 0 }, future: { count: 1, bytes: 0, due_count: 0, due_bytes: 0 } }}
        metric="bytes"
      />,
    );
    expect(screen.getByText('Older than 3 days', { selector: 'div' }).nextSibling).toHaveTextContent('0 B');
    expect(screen.getByText('Dated in the future', { selector: 'div' }).nextSibling).toHaveTextContent('0 B');
  });

  it('switches to sizes', () => {
    render(<RetentionVolumeView report={report} metric="bytes" />);

    expect(screen.getByText('Stored', { selector: 'div' }).nextSibling).toHaveTextContent('6.3 KB');
    expect(screen.getByText(/message, template and context lengths/)).toBeInTheDocument();
  });

  it('shows a tooltip for the hovered day', () => {
    render(<RetentionVolumeView report={report} metric="count" />);
    const svg = screen.getByRole('img') as unknown as SVGSVGElement;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 960, height: 240, right: 960, bottom: 240, x: 0, y: 0, toJSON: () => ({}) });

    // Plot starts at x=56; the first of three buckets covers the left third.
    fireEvent.mouseMove(screen.getByTestId('volume-hit-area'), { clientX: 100, clientY: 100 });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Tue, Nov 10, 2026');
    expect(tooltip).toHaveTextContent('2d ago');
    expect(tooltip).toHaveTextContent('Due for deletion10');
    expect(tooltip).toHaveTextContent('Kept30');

    fireEvent.mouseLeave(screen.getByTestId('volume-hit-area'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('highlights the marker when its policy row is hovered', () => {
    render(<RetentionVolumeView report={report} metric="count" />);
    const marker = screen.getByTestId('volume-marker-1');
    const before = marker.querySelector('circle')?.getAttribute('fill');

    fireEvent.mouseEnter(screen.getAllByRole('listitem')[0]);

    expect(marker.querySelector('circle')?.getAttribute('fill')).not.toBe(before);
  });

  it('lists only non-empty days in the data table', () => {
    render(<RetentionVolumeView report={report} metric="count" />);
    const rows = screen.getByRole('table').querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('2026-11-11');
  });

  it('splits the on-disk size into data and indexes in Size mode', () => {
    const withStorage: RetentionVolumeReport = {
      ...report,
      storage: {
        table: 'log_entries',
        engine: 'InnoDB',
        data_bytes: 3 * 1024 * 1024,
        index_bytes: 1024 * 1024,
        free_bytes: 0,
        total_bytes: 4 * 1024 * 1024,
        rows_estimate: 65,
      },
    };

    render(<RetentionVolumeView report={withStorage} metric="bytes" />);

    const breakdown = screen.getByRole('region', { name: 'On-disk size: data and indexes' });
    expect(within(breakdown).getByTestId('storage-total')).toHaveTextContent('4.0 MB');
    expect(within(breakdown).getByTestId('storage-data')).toHaveTextContent('3.0 MB');
    expect(within(breakdown).getByTestId('storage-data')).toHaveTextContent('75%');
    expect(within(breakdown).getByTestId('storage-index')).toHaveTextContent('1.0 MB');
    expect(within(breakdown).getByTestId('storage-index')).toHaveTextContent('25%');
    // No free space: no free-space note
    expect(within(breakdown).queryByTestId('storage-free')).toBeNull();
    expect(breakdown).toHaveTextContent('InnoDB statistics, so approximate');
    expect(screen.getByTestId('storage-bar-data')).toHaveStyle({ width: '75%' });
  });

  it('hides the data/index split in Entries mode and when the server has none', () => {
    const withStorage: RetentionVolumeReport = {
      ...report,
      storage: { table: 'log_entries', engine: 'InnoDB', data_bytes: 1, index_bytes: 1, free_bytes: 1, total_bytes: 2, rows_estimate: 1 },
    };

    const { unmount } = render(<RetentionVolumeView report={withStorage} metric="count" />);
    expect(screen.queryByRole('region', { name: 'On-disk size: data and indexes' })).toBeNull();
    unmount();

    render(<RetentionVolumeView report={{ ...report, storage: null }} metric="bytes" />);
    expect(screen.queryByRole('region', { name: 'On-disk size: data and indexes' })).toBeNull();
  });

  it('keeps free space out of the split and names a non-InnoDB engine', () => {
    const withStorage: RetentionVolumeReport = {
      ...report,
      storage: {
        table: 'log_entries',
        engine: 'Aria',
        data_bytes: 3 * 1024 * 1024,
        index_bytes: 1024 * 1024,
        free_bytes: 100 * 1024 * 1024,
        total_bytes: 4 * 1024 * 1024,
        rows_estimate: 65,
      },
    };

    render(<RetentionVolumeView report={withStorage} metric="bytes" />);

    const breakdown = screen.getByRole('region', { name: 'On-disk size: data and indexes' });
    expect(within(breakdown).getByTestId('storage-data')).toHaveTextContent('75%');
    expect(screen.getByTestId('storage-bar-data')).toHaveStyle({ width: '75%' });
    expect(within(breakdown).getByTestId('storage-free')).toHaveTextContent('100 MB allocated but unused');
    expect(breakdown).toHaveTextContent('Aria statistics, which may be approximate');
    expect(breakdown).not.toHaveTextContent('InnoDB');
  });
});
