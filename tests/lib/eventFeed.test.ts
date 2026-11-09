import { describe, it, expect } from 'vitest';
import { feedReducer, initialFeedState, FeedState, MAX_FOLLOWING_ENTRIES, olderPageOffset } from '@/src/lib/eventFeed';
import { LogEntry } from '@/src/types';

const entry = (id: string | number): LogEntry => ({
  id: String(id),
  trace_id: 't',
  batch_id: null,
  app_key: 'app',
  app_id: 'web',
  user_agent: null,
  level: 'info',
  category: 'c',
  message: `m${id}`,
  context: null,
  timestamp: '2026-11-09T10:00:00.000+00:00',
  created_at: '2026-11-09T10:00:00.000+00:00',
});

const page = (ids: (string | number)[], total = 1000, initial = false, limit = 3) =>
  ({ type: 'page' as const, entries: ids.map(entry), total, limit, initial });

const ids = (s: FeedState) => s.entries.map(e => e.id);

describe('feedReducer', () => {
  it('loads the newest page first and appends older pages', () => {
    let s = feedReducer(initialFeedState, page([9, 8, 7], 10, true));
    expect(ids(s)).toEqual(['9', '8', '7']);
    expect(s.cursor).toBe(3);
    expect(s.hasMore).toBe(true);

    s = feedReducer(s, page([6, 5]));
    expect(ids(s)).toEqual(['9', '8', '7', '6', '5']);
    expect(s.cursor).toBe(5);
    expect(s.hasMore).toBe(false);
  });

  it('adds live events on top and moves the cursor past them', () => {
    let s = feedReducer(initialFeedState, page([9, 8, 7], 10, true));
    s = feedReducer(s, { type: 'live', entry: entry(10), hold: false });
    expect(ids(s)).toEqual(['10', '9', '8', '7']);
    expect(s.cursor).toBe(4);
    expect(s.total).toBe(11);
  });

  it('holds live events while paused and shows them on flush', () => {
    let s = feedReducer(initialFeedState, page([9, 8, 7], 10, true));
    s = feedReducer(s, { type: 'live', entry: entry(10), hold: true });
    s = feedReducer(s, { type: 'live', entry: entry(11), hold: true });
    expect(ids(s)).toEqual(['9', '8', '7']);
    expect(s.pending.map(e => e.id)).toEqual(['11', '10']);
    // Held events still shift the server's ordering.
    expect(s.cursor).toBe(5);

    s = feedReducer(s, { type: 'flush' });
    expect(ids(s)).toEqual(['11', '10', '9', '8', '7']);
    expect(s.pending).toEqual([]);
  });

  it('drops duplicates between live events and older pages', () => {
    let s = feedReducer(initialFeedState, page([9, 8, 7], 10, true));
    s = feedReducer(s, { type: 'live', entry: entry(10), hold: false });
    s = feedReducer(s, { type: 'live', entry: entry(10), hold: false });
    s = feedReducer(s, page([7, 6, 5]));
    expect(ids(s)).toEqual(['10', '9', '8', '7', '6', '5']);
  });

  it('keeps live events that arrived before the first page', () => {
    let s = feedReducer(initialFeedState, { type: 'live', entry: entry(10), hold: false });
    s = feedReducer(s, page([10, 9, 8], 10, true));
    expect(ids(s)).toEqual(['10', '9', '8']);
    s = feedReducer(initialFeedState, { type: 'live', entry: entry(11), hold: false });
    s = feedReducer(s, page([10, 9, 8], 10, true));
    expect(ids(s)).toEqual(['11', '10', '9', '8']);
    expect(s.cursor).toBe(4);
  });

  it('trims the oldest entries while following and lets them load again', () => {
    const many = Array.from({ length: MAX_FOLLOWING_ENTRIES }, (_, i) => MAX_FOLLOWING_ENTRIES - i);
    let s = feedReducer(initialFeedState, page(many, 5000, true, MAX_FOLLOWING_ENTRIES));
    s = feedReducer(s, { type: 'live', entry: entry('new'), hold: false });
    expect(s.entries).toHaveLength(MAX_FOLLOWING_ENTRIES);
    expect(s.entries[0].id).toBe('new');
    // The trimmed entry (id 1) is the next one the cursor points at.
    expect(s.cursor).toBe(MAX_FOLLOWING_ENTRIES);
    expect(s.hasMore).toBe(true);
  });
});

describe('feedReducer catch-up after (re)connecting', () => {
  const catchup = (ids: (string | number)[], hold = false, limit = 3) =>
    ({ type: 'catchup' as const, entries: ids.map(entry), limit, hold });

  it('adds the events missed while disconnected on top', () => {
    let s = feedReducer(initialFeedState, page([9, 8, 7], 10, true));
    s = feedReducer(s, catchup([11, 10, 9]));
    expect(ids(s)).toEqual(['11', '10', '9', '8', '7']);
    expect(s.cursor).toBe(5);
  });

  it('holds the missed events while the feed is held', () => {
    let s = feedReducer(initialFeedState, page([9, 8, 7], 10, true));
    s = feedReducer(s, catchup([10, 9, 8], true));
    expect(ids(s)).toEqual(['9', '8', '7']);
    expect(s.pending.map(e => e.id)).toEqual(['10']);
  });

  it('changes nothing when nothing was missed', () => {
    const s = feedReducer(initialFeedState, page([9, 8, 7], 10, true));
    expect(feedReducer(s, catchup([9, 8, 7]))).toBe(s);
  });

  it('flags a gap when a whole page was missed', () => {
    let s = feedReducer(initialFeedState, page([9, 8, 7], 10, true));
    s = feedReducer(s, catchup([20, 19, 18]));
    expect(s.pendingOverflow).toBe(true);
    expect(ids(s)).toEqual(['9', '8', '7']);
  });

  it('fills an empty feed without flagging a gap', () => {
    let s = feedReducer(initialFeedState, page([], 0, true));
    s = feedReducer(s, catchup([2, 1]));
    expect(ids(s)).toEqual(['2', '1']);
    expect(s.pendingOverflow).toBe(false);
  });
});

describe('feedReducer older pages with live events in flight', () => {
  it('continues after the oldest loaded event even when the cursor drifted', () => {
    // Loaded 9..7; the server actually holds 12..1 because three live events were double-counted.
    let s = feedReducer(initialFeedState, page([9, 8, 7], 12, true));
    s = { ...s, cursor: 6 }; // drifted: the true position after event 7 is 3
    const offset = olderPageOffset(s);
    // The overlap makes the request start early enough to contain the anchor (event 7).
    s = feedReducer(s, {
      type: 'page', entries: [8, 7, 6, 5, 4].map(entry), total: 12, limit: 5, initial: false,
      offset: 1, cursorAtRequest: s.cursor,
    });
    expect(offset).toBeLessThanOrEqual(1);
    expect(ids(s)).toEqual(['9', '8', '7', '6', '5', '4']);
  });

  it('counts live events that arrived while the page was loading', () => {
    let s = feedReducer(initialFeedState, page([9, 8, 7], 10, true));
    const cursorAtRequest = s.cursor;
    s = feedReducer(s, { type: 'live', entry: entry(10), hold: true });
    s = feedReducer(s, {
      type: 'page', entries: [7, 6, 5].map(entry), total: 11, limit: 3, initial: false,
      offset: 2, cursorAtRequest,
    });
    expect(ids(s)).toEqual(['9', '8', '7', '6', '5']);
    expect(s.cursor).toBe(2 + 3 + 1);
  });
});
