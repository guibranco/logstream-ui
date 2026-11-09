import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LogEntry } from '../types';
import { LogRow } from './LogRow';
import { Skeleton } from './Skeleton';
import { AlertCircle, Inbox, ArrowUp, Loader2 } from 'lucide-react';

interface LogTableProps {
  logs: LogEntry[];
  /** Live events waiting above the list while the feed is held. */
  pendingCount: number;
  /** More events arrived while held than could be kept; showing them reloads. */
  pendingOverflow?: boolean;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingOlder: boolean;
  error: Error | null;
  /** The user paused the live tail from the header. */
  isPaused: boolean;
  isLiveEnabled: boolean;
  onLoadOlder: () => void;
  onShowPending: () => void;
  /** Tells the feed whether new events must wait instead of being added on top. */
  onHoldChange: (hold: boolean) => void;
  onFilterBatch: (batchId: string) => void;
  onFilterTrace: (traceId: string) => void;
  onFilterContext: (path: string, value: string, exclude: boolean) => void;
  onRetry: () => void;
}

/** Within this distance of the top the list follows new events. */
const TOP_THRESHOLD = 8;
/** Start fetching older events this far before the bottom. */
const LOAD_OLDER_THRESHOLD = 600;

export const LogTable: React.FC<LogTableProps> = ({
  logs,
  pendingCount,
  pendingOverflow = false,
  total,
  hasMore,
  isLoading,
  isLoadingOlder,
  error,
  isPaused,
  isLiveEnabled,
  onLoadOlder,
  onShowPending,
  onHoldChange,
  onFilterBatch,
  onFilterTrace,
  onFilterContext,
  onRetry
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [isAtTop, setIsAtTop] = useState(true);

  // Only rows still on screen count: a reload or new filters can remove an expanded one.
  const hasExpanded = useMemo(
    () => expandedIds.size > 0 && logs.some(log => expandedIds.has(log.id)),
    [expandedIds, logs],
  );
  const hold = isPaused || hasExpanded || !isAtTop;

  useEffect(() => {
    onHoldChange(hold);
  }, [hold, onHoldChange]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Load the next older page when the bottom is near, or when the list doesn't fill the screen. */
  const maybeLoadOlder = useCallback(() => {
    const el = containerRef.current;
    if (!el || !hasMore || isLoadingOlder || isLoading) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_OLDER_THRESHOLD) onLoadOlder();
  }, [hasMore, isLoadingOlder, isLoading, onLoadOlder]);

  useEffect(() => {
    maybeLoadOlder();
  }, [logs.length, maybeLoadOlder]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setIsAtTop(el.scrollTop <= TOP_THRESHOLD);
    maybeLoadOlder();
  };

  const showPending = () => {
    onShowPending();
    containerRef.current?.scrollTo({ top: 0 });
  };

  if (error && logs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 bg-rose-900/20 rounded-full flex items-center justify-center mb-4 border border-rose-900/30">
          <AlertCircle className="text-rose-500" size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-100 mb-2">Failed to load logs</h3>
        <p className="text-gray-400 mb-6 max-w-md">{error.message || 'An unexpected error occurred while fetching logs.'}</p>
        <button
          onClick={onRetry}
          className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-6 py-2 rounded font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const holdReason = isPaused
    ? 'Paused'
    : hasExpanded
      ? 'Paused while an event is expanded'
      : !isAtTop
        ? 'Paused while scrolled down'
        : null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="bg-gray-950 border-b border-gray-900 flex items-center px-4 h-10 text-[10px] font-bold uppercase tracking-widest text-gray-600 select-none">
        <div className="w-32 flex-shrink-0">Timestamp</div>
        <div className="w-24 flex-shrink-0">Level</div>
        <div className="w-32 flex-shrink-0 px-2">App Key</div>
        <div className="w-24 flex-shrink-0 px-2">App ID</div>
        <div className="w-32 flex-shrink-0 px-2">Category</div>
        <div className="flex-1 px-2">Message</div>
        <div className="w-32 flex-shrink-0">Trace ID</div>
        <div className="w-10 flex-shrink-0"></div>
      </div>

      {pendingCount > 0 && (
        <button
          onClick={showPending}
          data-testid="pending-banner"
          className="flex items-center justify-center gap-2 h-8 text-xs font-medium bg-secondary-900/40 border-b border-secondary-800/50 text-secondary-300 hover:bg-secondary-900/60 transition-colors"
        >
          <ArrowUp size={14} />
          {pendingOverflow ? `${pendingCount}+` : pendingCount} new {pendingCount === 1 ? 'event' : 'events'}
          {holdReason && <span className="text-gray-500">· {holdReason.toLowerCase()} — click to show</span>}
        </button>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        data-testid="log-scroller"
        className="flex-1 overflow-y-auto relative"
      >
        {isLoading && logs.length === 0 ? (
          <div className="divide-y divide-gray-900">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-full">
            <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 border border-gray-800">
              <Inbox className="text-gray-600" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-100 mb-2">No logs found</h3>
            <p className="text-gray-500 max-w-md">
              {isLiveEnabled
                ? 'Waiting for new events. Try adjusting your filters or check if the app is sending logs.'
                : 'Try adjusting your filters or check if the app is sending logs.'}
            </p>
          </div>
        ) : (
          <>
            {logs.map(log => (
              <LogRow
                key={log.id}
                log={log}
                isLive={isLiveEnabled}
                isExpanded={expandedIds.has(log.id)}
                onToggle={toggleExpanded}
                onFilterBatch={onFilterBatch}
                onFilterTrace={onFilterTrace}
                onFilterContext={onFilterContext}
              />
            ))}

            <div className="flex items-center justify-center gap-2 py-4 text-xs text-gray-600" data-testid="feed-end">
              {isLoadingOlder ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Loading older events…
                </>
              ) : error ? (
                <button onClick={onLoadOlder} className="text-rose-400 hover:text-rose-300">
                  Failed to load older events — retry
                </button>
              ) : hasMore ? (
                <button onClick={onLoadOlder} className="hover:text-gray-400">
                  Load older events
                </button>
              ) : (
                'No older events'
              )}
            </div>
          </>
        )}
      </div>

      <div className="bg-gray-950 border-t border-gray-900 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
        <div>
          <span className="text-gray-300 font-mono">{logs.length}</span> loaded
          {total > 0 && (
            <> of <span className="text-gray-300 font-mono">{total}</span> matching</>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isLiveEnabled ? (
            <span className="text-gray-600">Live view disabled</span>
          ) : holdReason ? (
            <span className="text-amber-400">{holdReason}</span>
          ) : (
            <span className="text-green-400">Following new events</span>
          )}
        </div>
      </div>
    </div>
  );
};
