import { LogEntry } from '../types';

/**
 * State of the single event feed, newest first, the way Seq shows events:
 * the newest page is loaded when the screen opens, live events are added on
 * top, and older pages are appended as the user scrolls down.
 *
 * `cursor` is the offset of the next older page in the server's newest-first
 * ordering. Every event that reaches the server after the first load pushes
 * the older ones one position down, so each live event moves the cursor by one.
 * Duplicates (e.g. an event delivered live and also returned by a page) are
 * dropped by id.
 */
export interface FeedState {
  entries: LogEntry[];
  /** Live events held back while the feed is paused, newest first. */
  pending: LogEntry[];
  cursor: number;
  total: number;
  hasMore: boolean;
  loaded: boolean;
  /** More events arrived while paused than are held: showing them needs a reload. */
  pendingOverflow: boolean;
}

export type FeedAction =
  | { type: 'reset' }
  | {
      type: 'page';
      entries: LogEntry[];
      total: number;
      limit: number;
      initial: boolean;
      /** Offset the page was requested with (older pages). */
      offset?: number;
      /** Cursor when the request was sent, to account for live events during it. */
      cursorAtRequest?: number;
    }
  | { type: 'live'; entry: LogEntry; hold: boolean }
  | { type: 'flush' }
  | { type: 'catchup'; entries: LogEntry[]; limit: number; hold: boolean };

/** Most events kept on screen while following the live tail. */
export const MAX_FOLLOWING_ENTRIES = 1000;
/**
 * Older pages are requested this many positions early. Live events that land
 * while a request is in flight make the cursor drift by a few positions; the
 * overlap is matched against the oldest loaded event, so the drift never
 * turns into a gap.
 */
export const OLDER_PAGE_OVERLAP = 20;

/** Offset to request the next older page with. */
export const olderPageOffset = (state: FeedState) => Math.max(0, state.cursor - OLDER_PAGE_OVERLAP);

/** Most held events kept; older held ones are dropped and reloaded by scrolling. */
export const MAX_PENDING = 1000;

export const initialFeedState: FeedState = {
  entries: [],
  pending: [],
  cursor: 0,
  total: 0,
  hasMore: false,
  loaded: false,
  pendingOverflow: false,
};

/** Drop the oldest entries beyond the cap; they can be fetched again by scrolling. */
function trim(state: FeedState): FeedState {
  const excess = state.entries.length - MAX_FOLLOWING_ENTRIES;
  if (excess <= 0) return state;
  return {
    ...state,
    entries: state.entries.slice(0, MAX_FOLLOWING_ENTRIES),
    cursor: Math.max(0, state.cursor - excess),
    hasMore: true,
  };
}

type PageAction = Extract<FeedAction, { type: 'page' }>;
type LiveAction = Extract<FeedAction, { type: 'live' }>;
type CatchUpAction = Extract<FeedAction, { type: 'catchup' }>;

/** First page: live events that arrived while it was loading stay on top. */
function firstPage(state: FeedState, action: PageAction): FeedState {
  const pageIds = new Set(action.entries.map(e => e.id));
  const early = state.entries.filter(e => !pageIds.has(e.id));
  return {
    entries: [...early, ...action.entries],
    pending: state.pending.filter(e => !pageIds.has(e.id)),
    cursor: early.length + action.entries.length,
    total: Math.max(action.total, early.length + action.entries.length),
    hasMore: action.entries.length >= action.limit,
    loaded: true,
    pendingOverflow: false,
  };
}

/** Older page: continue right after the oldest event on screen when the page contains it. */
function olderPage(state: FeedState, action: PageAction): FeedState {
  const anchor = state.entries.at(-1);
  const anchorAt = anchor ? action.entries.findIndex(e => e.id === anchor.id) : -1;
  const candidates = action.entries.slice(anchorAt + 1);
  const known = new Set(state.entries.map(e => e.id));
  const older = candidates.filter(e => !known.has(e.id));
  const requestedAt = action.offset ?? state.cursor;
  const liveDuringRequest = Math.max(0, state.cursor - (action.cursorAtRequest ?? state.cursor));
  return {
    ...state,
    entries: [...state.entries, ...older],
    cursor: requestedAt + action.entries.length + liveDuringRequest,
    total: Math.max(state.total, action.total),
    hasMore: action.entries.length >= action.limit,
  };
}

function liveEvent(state: FeedState, action: LiveAction): FeedState {
  const { entry } = action;
  const isKnown = (e: LogEntry) => e.id === entry.id;
  if (state.entries.some(isKnown) || state.pending.some(isKnown)) return state;

  const moved = { ...state, cursor: state.cursor + 1, total: state.total + 1 };
  if (!action.hold) return trim({ ...moved, entries: [entry, ...state.entries] });

  const pending = [entry, ...state.pending];
  if (pending.length <= MAX_PENDING) return { ...moved, pending };
  // Too many held events: keep the newest and remember the gap, so showing them reloads the feed.
  return { ...moved, pending: pending.slice(0, MAX_PENDING), pendingOverflow: true };
}

/**
 * Newest page fetched after the live stream (re)connected: events that reached
 * the server while it was down are the ones above the first known id.
 */
function catchUp(state: FeedState, action: CatchUpAction): FeedState {
  const known = new Set([...state.entries, ...state.pending].map(e => e.id));
  const firstKnown = action.entries.findIndex(e => known.has(e.id));
  if (firstKnown === 0) return state;

  const missed = firstKnown === -1 ? action.entries : action.entries.slice(0, firstKnown);
  // Nothing on a full page is known while we do hold events: more were missed than one page.
  const gap = firstKnown === -1 && action.entries.length >= action.limit && state.entries.length > 0;
  const moved = {
    ...state,
    cursor: state.cursor + missed.length,
    total: state.total + missed.length,
    pendingOverflow: state.pendingOverflow || gap,
  };
  if (action.hold || gap) {
    return { ...moved, pending: [...missed, ...state.pending].slice(0, MAX_PENDING) };
  }
  return trim({ ...moved, entries: [...missed, ...state.entries] });
}

function flushPending(state: FeedState): FeedState {
  if (state.pending.length === 0) return state;
  const known = new Set(state.entries.map(e => e.id));
  const fresh = state.pending.filter(e => !known.has(e.id));
  return trim({ ...state, entries: [...fresh, ...state.entries], pending: [] });
}

export function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'reset':
      return initialFeedState;
    case 'page':
      return action.initial ? firstPage(state, action) : olderPage(state, action);
    case 'live':
      return liveEvent(state, action);
    case 'catchup':
      return catchUp(state, action);
    case 'flush':
      return flushPending(state);
  }
}
