import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { LogEntry, SearchFilters } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchLogs, UnauthorizedError } from '../lib/fetchLogs';
import { feedReducer, initialFeedState, olderPageOffset } from '../lib/eventFeed';
import { matchesFilters } from '../lib/matchFilters';

export const PAGE_SIZE = 100;

/**
 * The single event feed: newest page on load, live events on top, older pages
 * on demand. While `hold` is set (paused, an event expanded, or scrolled away
 * from the top) live events wait in `pending` instead of moving the list.
 */
export function useEventFeed(filters: SearchFilters) {
  const { config, openSettings } = useAuth();
  const [state, dispatch] = useReducer(feedReducer, initialFeedState);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [generation, setGeneration] = useState(0);

  const holdRef = useRef(false);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const stateRef = useRef(state);
  stateRef.current = state;
  const generationRef = useRef(generation);
  generationRef.current = generation;
  const olderInFlight = useRef(false);

  const filtersKey = JSON.stringify(filters);
  const apiUrl = config?.apiUrl;
  const uiSecret = config?.uiSecret;

  const handleError = useCallback((e: unknown) => {
    if ((e as Error)?.name === 'AbortError') return;
    if (e instanceof UnauthorizedError) openSettings();
    setError(e as Error);
  }, [openSettings]);

  // First page: whenever the filters, the server or the generation (reload) change.
  useEffect(() => {
    dispatch({ type: 'reset' });
    setError(null);
    olderInFlight.current = false;
    setIsLoadingOlder(false);
    if (!apiUrl || !uiSecret) return;

    const controller = new AbortController();
    setIsLoadingInitial(true);
    const loadFirstPage = async () => {
      try {
        const result = await fetchLogs(apiUrl, uiSecret, filtersRef.current, PAGE_SIZE, 0, controller.signal);
        dispatch({ type: 'page', entries: result.entries, total: result.total, limit: PAGE_SIZE, initial: true });
      } catch (e) {
        handleError(e);
      } finally {
        if (!controller.signal.aborted) setIsLoadingInitial(false);
      }
    };
    void loadFirstPage();

    return () => controller.abort();
    // filtersKey stands for filters; the ref carries the value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, apiUrl, uiSecret, generation, handleError]);

  const loadOlder = useCallback(() => {
    const current = stateRef.current;
    if (!apiUrl || !uiSecret || !current.loaded || !current.hasMore || olderInFlight.current) return;

    olderInFlight.current = true;
    setIsLoadingOlder(true);
    const startedIn = generationRef.current;
    const startedFor = JSON.stringify(filtersRef.current);

    const offset = olderPageOffset(current);
    const cursorAtRequest = current.cursor;

    const loadPage = async () => {
      try {
        const result = await fetchLogs(apiUrl, uiSecret, filtersRef.current, PAGE_SIZE, offset);
        // Ignore a page that belongs to filters or a reload that has since been replaced.
        if (startedIn !== generationRef.current || startedFor !== JSON.stringify(filtersRef.current)) return;
        dispatch({
          type: 'page', entries: result.entries, total: result.total, limit: PAGE_SIZE, initial: false,
          offset, cursorAtRequest,
        });
      } catch (e) {
        handleError(e);
      } finally {
        olderInFlight.current = false;
        setIsLoadingOlder(false);
      }
    };
    void loadPage();
  }, [apiUrl, uiSecret, handleError]);

  const reload = useCallback(() => setGeneration(g => g + 1), []);

  // A catch-up asked for before the first page arrived runs right after it.
  const catchUpWanted = useRef(false);

  /**
   * The live stream just (re)connected: events sent while it was down never
   * reached us, so fetch the newest page and add whatever is missing on top.
   */
  const catchUp = useCallback(() => {
    if (!apiUrl || !uiSecret) return;
    if (!stateRef.current.loaded) {
      catchUpWanted.current = true;
      return;
    }
    catchUpWanted.current = false;
    const startedIn = generationRef.current;
    const startedFor = JSON.stringify(filtersRef.current);
    const loadNewest = async () => {
      try {
        const result = await fetchLogs(apiUrl, uiSecret, filtersRef.current, PAGE_SIZE, 0);
        if (startedIn !== generationRef.current || startedFor !== JSON.stringify(filtersRef.current)) return;
        dispatch({ type: 'catchup', entries: result.entries, limit: PAGE_SIZE, hold: holdRef.current });
      } catch (e) {
        handleError(e);
      }
    };
    void loadNewest();
  }, [apiUrl, uiSecret, handleError]);

  useEffect(() => {
    if (state.loaded && catchUpWanted.current) catchUp();
  }, [state.loaded, catchUp]);

  /** Show the held events; reloads instead when more arrived than could be held. */
  const flush = useCallback(() => {
    if (stateRef.current.pendingOverflow) {
      reload();
      return;
    }
    dispatch({ type: 'flush' });
  }, [reload]);

  const setHold = useCallback((hold: boolean) => {
    const wasHeld = holdRef.current;
    holdRef.current = hold;
    if (wasHeld && !hold) flush();
  }, [flush]);

  /** Live event from the WebSocket; ignored unless it matches the current filters. */
  const pushLive = useCallback((entry: LogEntry) => {
    if (!matchesFilters(entry, filtersRef.current)) return;
    dispatch({ type: 'live', entry, hold: holdRef.current });
  }, []);

  return {
    entries: state.entries,
    pendingCount: state.pending.length,
    pendingOverflow: state.pendingOverflow,
    total: state.total,
    hasMore: state.hasMore,
    isLoaded: state.loaded,
    isLoadingInitial,
    isLoadingOlder,
    error,
    loadOlder,
    catchUp,
    flush,
    reload,
    setHold,
    pushLive,
  };
}
