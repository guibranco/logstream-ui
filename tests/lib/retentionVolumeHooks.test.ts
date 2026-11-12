import { describe, it, expect, vi, afterEach } from 'vitest';
import { prunedCount } from '@/src/hooks/useRetentionPolicies';
import { timeoutSignal } from '@/src/hooks/useRetentionVolume';

describe('prunedCount', () => {
  it('uses the run totals when present', () => {
    expect(prunedCount({ total_pruned: 3 })).toBe(3);
    expect(prunedCount({ total_deleted: 2 })).toBe(2);
    expect(prunedCount({ total_pruned: 0, policies: [{ policy: 'a', pruned: 5 } as any] })).toBe(0);
  });

  it('falls back to per-policy results when totals are missing', () => {
    expect(prunedCount({ policies: [{ policy: 'a', pruned: 2 } as any, { policy: 'b', pruned: 3 } as any] })).toBe(5);
    expect(prunedCount({ results: [{ policy: 'a', deleted: 4 } as any] })).toBe(4);
  });

  it('is zero without data', () => {
    expect(prunedCount(undefined)).toBe(0);
    expect(prunedCount({})).toBe(0);
  });
});

describe('timeoutSignal', () => {
  afterEach(() => vi.useRealTimers());

  it('aborts with a timeout error once the time passes', () => {
    vi.useFakeTimers();
    const { signal } = timeoutSignal(undefined, 1000);

    vi.advanceTimersByTime(999);
    expect(signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(signal.aborted).toBe(true);
    expect((signal.reason as Error).message).toMatch(/timed out/);
  });

  it('follows the query signal', () => {
    const query = new AbortController();
    const { signal } = timeoutSignal(query.signal, 1000);

    query.abort();
    expect(signal.aborted).toBe(true);
  });

  it('stops the timer once cleared', () => {
    vi.useFakeTimers();
    const { signal, clear } = timeoutSignal(undefined, 1000);

    clear();
    vi.advanceTimersByTime(2000);
    expect(signal.aborted).toBe(false);
  });
});
