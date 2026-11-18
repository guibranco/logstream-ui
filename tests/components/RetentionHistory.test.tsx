import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { HISTORY_PAGE_SIZE, RetentionHistoryPanel, RetentionHistoryView } from '@/src/components/retention/RetentionHistoryPanel';
import { RetentionLogEntry, RetentionLogResponse } from '@/src/types';

const logHook = vi.hoisted(() => ({
  calls: [] as Array<{ days: number; policy?: string }>,
  result: { data: undefined, isLoading: false, isError: false, error: null, isFetching: false, refetch: () => {} } as any,
}));

vi.mock('@/src/hooks/useRetentionLog', () => ({
  RETENTION_LOG_DAYS: 90,
  useRetentionLog: (days: number, policy?: string) => {
    logHook.calls.push({ days, policy });
    return logHook.result;
  },
}));

vi.mock('@/src/hooks/useRetentionPolicies', () => ({
  useRetentionPolicies: () => ({ data: [{ name: 'debug-7d' }, { name: 'all-90d' }] }),
}));

function run(overrides: Partial<RetentionLogEntry>): RetentionLogEntry {
  return {
    id: 1,
    policy: 'debug-7d',
    deleted: 0,
    dry_run: false,
    duration_ms: 10,
    summary: '0 entries pruned',
    warnings: [],
    error: null,
    ran_at: '2026-11-17T03:00:00+00:00',
    ...overrides,
  };
}

const response: RetentionLogResponse = {
  days: 90,
  since: '2026-08-19T03:00:00+00:00',
  policy: null,
  runs: [
    run({ id: 3, policy: 'debug-7d', deleted: 42, summary: '42 entries pruned' }),
    run({ id: 2, policy: 'all-90d', deleted: 7, dry_run: true, summary: '7 entries pruned', warnings: ['slow scan'] }),
    run({ id: 1, policy: 'old-policy', error: 'Unknown column', summary: 'Error: Unknown column' }),
  ],
  truncated: false,
  totals: { runs: 3, deleted: 42, failed: 1, dry_runs: 1 },
};

describe('RetentionHistoryView', () => {
  it('lists runs with totals, status, errors and warnings', () => {
    render(<RetentionHistoryView data={response} now={new Date('2026-11-18T03:00:00Z')} />);

    expect(screen.getByText('Entries deleted').nextSibling).toHaveTextContent('42');
    expect(screen.getByText('Failed', { selector: 'div' }).nextSibling).toHaveTextContent('1');

    const rows = screen.getAllByTestId('retention-run');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('Live')).toBeInTheDocument();
    expect(within(rows[0]).getByText('42 entries pruned')).toBeInTheDocument();
    expect(within(rows[0]).getByText('1 day ago')).toBeInTheDocument();
    expect(within(rows[1]).getByText('~7')).toBeInTheDocument();
    expect(within(rows[1]).getByText('slow scan')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Unknown column')).toBeInTheDocument();
  });

  it('filters by status', () => {
    render(<RetentionHistoryView data={response} />);

    fireEvent.click(screen.getByRole('button', { name: 'Failed' }));
    expect(screen.getAllByTestId('retention-run')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Dry runs' }));
    const rows = screen.getAllByTestId('retention-run');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('all-90d')).toBeInTheDocument();
  });

  it('pages long histories', () => {
    const runs = Array.from({ length: HISTORY_PAGE_SIZE + 5 }, (_, i) => run({ id: i + 1 }));
    render(<RetentionHistoryView data={{ ...response, runs, totals: { ...response.totals, runs: runs.length } }} />);

    expect(screen.getAllByTestId('retention-run')).toHaveLength(HISTORY_PAGE_SIZE);
    fireEvent.click(screen.getByRole('button', { name: /Show more \(5 remaining\)/ }));
    expect(screen.getAllByTestId('retention-run')).toHaveLength(HISTORY_PAGE_SIZE + 5);
  });

  it('says when there are no runs', () => {
    render(<RetentionHistoryView data={{ ...response, runs: [], totals: { runs: 0, deleted: 0, failed: 0, dry_runs: 0 } }} />);

    expect(screen.getByText('No retention runs in the last 90 days.')).toBeInTheDocument();
  });
});

describe('RetentionHistoryPanel', () => {
  it('loads the last 90 days and filters by policy, including policies only seen in runs', () => {
    logHook.result = { ...logHook.result, data: response };
    render(<RetentionHistoryPanel />);

    expect(logHook.calls.at(-1)).toEqual({ days: 90, policy: undefined });

    const select = screen.getByLabelText('Policy:');
    const options = within(select).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['(all policies)', 'all-90d', 'debug-7d', 'old-policy']);

    fireEvent.change(select, { target: { value: 'debug-7d' } });
    expect(logHook.calls.at(-1)).toEqual({ days: 90, policy: 'debug-7d' });
  });

  it('explains when the server has no run history endpoint', () => {
    logHook.result = { ...logHook.result, data: undefined, isError: true, error: new Error('SERVICE_UNAVAILABLE') };
    render(<RetentionHistoryPanel />);

    expect(screen.getByText(/does not expose its retention run history/)).toBeInTheDocument();
  });
});
