import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LogEntry, SearchFilters } from '../types';
import { LogRow } from './LogRow';
import { Skeleton } from './Skeleton';
import { AlertCircle, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';

interface LogTableProps {
  logs: LogEntry[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
  onLimitChange: (limit: number) => void;
  onFilterBatch: (batchId: string) => void;
  onFilterTrace: (traceId: string) => void;
  isLiveMode: boolean;
  onRetry: () => void;
}

const ROW_HEIGHT = 48;

export const LogTable: React.FC<LogTableProps> = ({
  logs,
  isLoading,
  isError,
  error,
  total,
  limit,
  offset,
  onPageChange,
  onLimitChange,
  onFilterBatch,
  onFilterTrace,
  isLiveMode,
  onRetry
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const virtualizedLogs = useMemo(() => {
    if (logs.length <= 200) return logs.map((log, index) => ({ log, index }));

    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
    const endIndex = Math.min(logs.length - 1, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + 5);

    return logs.slice(startIndex, endIndex + 1).map((log, index) => ({
      log,
      index: startIndex + index
    }));
  }, [logs, scrollTop, containerHeight]);

  const totalHeight = logs.length * ROW_HEIGHT;

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 bg-rose-900/20 rounded-full flex items-center justify-center mb-4 border border-rose-900/30">
          <AlertCircle className="text-rose-500" size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-100 mb-2">Failed to load logs</h3>
        <p className="text-gray-400 mb-6 max-w-md">{error?.message || 'An unexpected error occurred while fetching logs.'}</p>
        <button
          onClick={onRetry}
          className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-6 py-2 rounded font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isLoading && logs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 border border-gray-800">
          <Inbox className="text-gray-600" size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-100 mb-2">No logs found</h3>
        <p className="text-gray-500 max-w-md">Try adjusting your filters or check if the app is sending logs.</p>
      </div>
    );
  }

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

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative"
      >
        {isLoading && logs.length === 0 ? (
          <div className="divide-y divide-gray-900">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        ) : (
          <div style={{ height: totalHeight, position: 'relative' }}>
            {virtualizedLogs.map(({ log, index }) => (
              <div
                key={log.id}
                style={{
                  position: 'absolute',
                  top: index * ROW_HEIGHT,
                  left: 0,
                  right: 0,
                  height: ROW_HEIGHT
                }}
              >
                <LogRow 
                  log={log} 
                  isLive={isLiveMode}
                  onFilterBatch={onFilterBatch}
                  onFilterTrace={onFilterTrace}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {!isLiveMode && (
        <div className="bg-gray-950 border-t border-gray-900 px-4 py-3 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing <span className="text-gray-300 font-mono">{offset + 1}</span>–
            <span className="text-gray-300 font-mono">{Math.min(offset + limit, total)}</span> of 
            <span className="text-gray-300 font-mono ml-1">{total}</span> results
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span>Page size:</span>
              <select
                value={limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="bg-gray-900 border border-gray-800 rounded px-2 py-1 focus:outline-none focus:border-sky-500 text-gray-300"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={offset === 0}
                onClick={() => onPageChange(Math.max(0, offset - limit))}
                className="p-1.5 bg-gray-900 border border-gray-800 rounded disabled:opacity-30 hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={offset + limit >= total}
                onClick={() => onPageChange(offset + limit)}
                className="p-1.5 bg-gray-900 border border-gray-800 rounded disabled:opacity-30 hover:bg-gray-800 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
