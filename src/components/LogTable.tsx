import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LogEntry } from '../types';
import { LogRow } from './LogRow';
import { Skeleton } from './Skeleton';
import { SelectionBar, CopyResult } from './SelectionBar';
import { useLogSelection } from '../hooks/useLogSelection';
import { CopyFormat, logsToText } from '../lib/logLines';
import { cn } from '../lib/utils';
import { AlertCircle, Inbox, ArrowUp, Loader2, Eraser, Zap } from 'lucide-react';

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
  /** Leave the paused state set from the header (Resume live). */
  onResume: () => void;
  /** The screen was cleared; earlier events come back with a reload. */
  isCleared?: boolean;
  onShowEarlier: () => void;
  /** Tells the feed whether new events must wait instead of being added on top. */
  onHoldChange: (hold: boolean) => void;
  onFilterBatch: (batchId: string) => void;
  onFilterTrace: (traceId: string) => void;
  onFilterContext: (path: string, value: string, exclude: boolean) => void;
  onFilterTemplate?: (template: string) => void;
  onFilterCategory?: (category: string) => void;
  onRetry: () => void;
}

/** A form field keeps its own Ctrl/⌘+A and Ctrl/⌘+C. */
const isEditable = (el: Element | null): boolean =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
  || (el instanceof HTMLElement && el.isContentEditable);

/** Header checkbox: selects every loaded event, or clears; shows "some" as indeterminate. */
const SelectAllBox: React.FC<{ all: boolean; some: boolean; onChange: () => void }> = ({ all, some, onChange }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some && !all;
  }, [all, some]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={all}
      onChange={onChange}
      aria-label="Select all loaded events"
      title="Select all loaded events (Ctrl/⌘+A)"
      className="w-3.5 h-3.5 cursor-pointer accent-secondary-500"
    />
  );
};

/** Within this distance of the top the list follows new events. */
const TOP_THRESHOLD = 8;
/** Start fetching older events this far before the bottom. */
const LOAD_OLDER_THRESHOLD = 600;

/** Why new events are being held, or null while following. */
function holdReasonOf(isPaused: boolean, isSelecting: boolean, hasExpanded: boolean, isAtTop: boolean): string | null {
  if (isPaused) return 'Paused';
  if (isSelecting) return 'Paused while selecting';
  if (hasExpanded) return 'Paused while an event is expanded';
  if (!isAtTop) return 'Paused while scrolled down';
  return null;
}

const LoadFailed: React.FC<{ error: Error; onRetry: () => void }> = ({ error, onRetry }) => (
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

const ClearedScreen: React.FC<{ onShowEarlier: () => void }> = ({ onShowEarlier }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center h-full" data-testid="cleared-screen">
    <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 border border-gray-800">
      <Eraser className="text-gray-600" size={32} />
    </div>
    <h3 className="text-lg font-bold text-gray-100 mb-2">Screen cleared</h3>
    <p className="text-gray-500 max-w-md mb-4">New events will appear here as they arrive.</p>
    <button onClick={onShowEarlier} className="text-xs text-secondary-400 hover:text-secondary-300">
      Show earlier events
    </button>
  </div>
);

const NoEvents: React.FC<{ isLiveEnabled: boolean }> = ({ isLiveEnabled }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center h-full">
    <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 border border-gray-800">
      <Inbox className="text-gray-600" size={32} />
    </div>
    <h3 className="text-lg font-bold text-gray-100 mb-2">No logs found</h3>
    <p className="text-gray-500 max-w-md">
      {isLiveEnabled && 'Waiting for new events. '}
      Try adjusting your filters or check if the app is sending logs.
    </p>
  </div>
);

/** Last line of the list: loading, retry, more to load, or the end. */
const FeedEnd: React.FC<{
  isLoadingOlder: boolean;
  hasError: boolean;
  hasMore: boolean;
  isCleared: boolean;
  onLoadOlder: () => void;
  onShowEarlier: () => void;
}> = ({ isLoadingOlder, hasError, hasMore, isCleared, onLoadOlder, onShowEarlier }) => {
  let content: React.ReactNode = 'No older events';
  if (isCleared) {
    content = (
      <button onClick={onShowEarlier} className="hover:text-gray-400">
        Earlier events were cleared — show them
      </button>
    );
  } else if (isLoadingOlder) {
    content = (
      <>
        <Loader2 size={14} className="animate-spin" />
        Loading older events…
      </>
    );
  } else if (hasError) {
    content = (
      <button onClick={onLoadOlder} className="text-rose-400 hover:text-rose-300">
        Failed to load older events — retry
      </button>
    );
  } else if (hasMore) {
    content = (
      <button onClick={onLoadOlder} className="hover:text-gray-400">
        Load older events
      </button>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2 py-4 text-xs text-gray-600" data-testid="feed-end">
      {content}
    </div>
  );
};

const FeedStatus: React.FC<{
  isLiveEnabled: boolean;
  holdReason: string | null;
  onResume: () => void;
}> = ({ isLiveEnabled, holdReason, onResume }) => {
  if (!isLiveEnabled) return <span className="text-gray-600">Live view disabled</span>;
  if (!holdReason) return <span className="text-green-400">Following new events</span>;
  return (
    <>
      <span className="text-amber-400">{holdReason}</span>
      <button
        onClick={onResume}
        className="flex items-center gap-1 px-2 py-0.5 rounded border border-green-800/60 text-green-400 hover:bg-green-900/20 transition-colors"
      >
        <Zap size={12} />
        Resume live
      </button>
    </>
  );
};

const PendingBanner: React.FC<{
  count: number;
  overflow: boolean;
  holdReason: string | null;
  onClick: () => void;
}> = ({ count, overflow, holdReason, onClick }) => (
  <button
    onClick={onClick}
    data-testid="pending-banner"
    className="flex items-center justify-center gap-2 h-8 text-xs font-medium bg-secondary-900/40 border-b border-secondary-800/50 text-secondary-300 hover:bg-secondary-900/60 transition-colors"
  >
    <ArrowUp size={14} />
    {overflow ? `${count}+` : count} new {count === 1 ? 'event' : 'events'}
    {holdReason && <span className="text-gray-500">· {holdReason.toLowerCase()} — click to resume live</span>}
  </button>
);

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
  onResume,
  isCleared = false,
  onShowEarlier,
  onHoldChange,
  onFilterBatch,
  onFilterTrace,
  onFilterContext,
  onFilterTemplate,
  onFilterCategory,
  onRetry
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [isAtTop, setIsAtTop] = useState(true);
  // "Resume live" with an event open: keep it open and keep adding new events on top.
  const [followWhileOpen, setFollowWhileOpen] = useState(false);

  // Only rows still on screen count: a reload or new filters can remove an expanded one.
  const hasExpanded = useMemo(
    () => expandedIds.size > 0 && logs.some(log => expandedIds.has(log.id)),
    [expandedIds, logs],
  );
  const heldByExpanded = hasExpanded && !followWhileOpen;
  const selection = useLogSelection(logs);
  const { isSelecting, selectedLogs, select, selectAll, clear: clearSelection } = selection;
  // Rows must not move under the pointer while picking them.
  const hold = isPaused || isSelecting || heldByExpanded || !isAtTop;

  const [lastCopy, setLastCopy] = useState<CopyResult | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  /** Copies the selection; the bar shows "Copied N" or "Copy failed" for a moment. */
  const copySelected = useCallback((fmt: CopyFormat) => {
    const count = selectedLogs.length;
    if (count === 0) return;
    const done = (ok: boolean) => {
      setLastCopy({ format: fmt, ok, count });
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setLastCopy(null), 2000);
    };
    navigator.clipboard.writeText(logsToText(selectedLogs, fmt)).then(() => done(true), () => done(false));
  }, [selectedLogs]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const active = document.activeElement;
      if (e.key === 'Escape' && isSelecting) {
        clearSelection();
        return;
      }
      if (!mod || e.altKey || isEditable(active)) return;
      const key = e.key.toLowerCase();
      // Copying highlighted text, e.g. part of an expanded message, keeps working as usual.
      if (key === 'c' && isSelecting && !window.getSelection()?.toString()) {
        e.preventDefault();
        copySelected('lines');
      } else if (key === 'a' && logs.length > 0 && containerRef.current?.contains(active)) {
        e.preventDefault();
        selectAll();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSelecting, clearSelection, copySelected, selectAll, logs.length]);

  useEffect(() => {
    if (!hasExpanded) setFollowWhileOpen(false);
  }, [hasExpanded]);

  useEffect(() => {
    onHoldChange(hold);
  }, [hold, onHoldChange]);

  const toggleExpanded = useCallback((id: string) => {
    // Opening another event pauses again, like the first time.
    if (!expandedIds.has(id)) setFollowWhileOpen(false);
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [expandedIds]);

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

  /** Follow new events again: back to the top, open events stay open, held events show. */
  const resumeLive = () => {
    // Selecting holds the feed too; following again ends it.
    clearSelection();
    setFollowWhileOpen(true);
    if (containerRef.current) containerRef.current.scrollTop = 0;
    setIsAtTop(true);
    if (isPaused) onResume();
    onShowPending();
  };

  if (error && logs.length === 0) return <LoadFailed error={error} onRetry={onRetry} />;

  const holdReason = holdReasonOf(isPaused, isSelecting, heldByExpanded, isAtTop);

  let body: React.ReactNode;
  if (isLoading && logs.length === 0) {
    body = (
      <div className="divide-y divide-gray-900">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  } else if (logs.length === 0 && isCleared) {
    body = <ClearedScreen onShowEarlier={onShowEarlier} />;
  } else if (logs.length === 0) {
    body = <NoEvents isLiveEnabled={isLiveEnabled} />;
  } else {
    body = (
      <>
        {logs.map(log => (
          <LogRow
            key={log.id}
            log={log}
            isLive={isLiveEnabled}
            isExpanded={expandedIds.has(log.id)}
            onToggle={toggleExpanded}
            isSelected={selection.selectedIds.has(log.id)}
            isSelecting={isSelecting}
            onSelect={select}
            onFilterBatch={onFilterBatch}
            onFilterTrace={onFilterTrace}
            onFilterContext={onFilterContext}
            onFilterTemplate={onFilterTemplate}
            onFilterCategory={onFilterCategory}
          />
        ))}
        <FeedEnd
          isLoadingOlder={isLoadingOlder}
          hasError={!!error}
          hasMore={hasMore}
          isCleared={isCleared}
          onLoadOlder={onLoadOlder}
          onShowEarlier={onShowEarlier}
        />
      </>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="hidden md:flex bg-gray-950 border-b border-gray-900 items-center px-4 h-10 text-[10px] font-bold uppercase tracking-widest text-gray-600 select-none">
        <div className="w-6 flex-shrink-0 flex items-center">
          {logs.length > 0 && (
            <SelectAllBox
              all={selection.allSelected}
              some={isSelecting}
              onChange={selection.allSelected ? clearSelection : selectAll}
            />
          )}
        </div>
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
        <PendingBanner count={pendingCount} overflow={pendingOverflow} holdReason={holdReason} onClick={resumeLive} />
      )}

      <div className="flex-1 min-h-0 relative flex flex-col">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          // Focusable so Ctrl/⌘+A selects events once the list was clicked, not the whole page.
          tabIndex={-1}
          data-testid="log-scroller"
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden overscroll-contain relative outline-none',
            // Room to scroll the last events out from under the selection bar.
            isSelecting && 'pb-20',
          )}
        >
          {body}
        </div>
        <SelectionBar
          count={selectedLogs.length}
          lastCopy={lastCopy}
          onCopy={copySelected}
          onClear={clearSelection}
        />
      </div>

      <div className="bg-gray-950 border-t border-gray-900 px-3 md:px-4 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-500">
        <div>
          <span className="text-gray-300 font-mono">{logs.length}</span> loaded
          {total > 0 && (
            <> of <span className="text-gray-300 font-mono">{total}</span> matching</>
          )}
        </div>
        <div className="flex items-center gap-2">
          <FeedStatus isLiveEnabled={isLiveEnabled} holdReason={holdReason} onResume={resumeLive} />
        </div>
      </div>
    </div>
  );
};
